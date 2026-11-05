import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { StringUtilService } from '../../common/utils/string-util/string-util.service'
import { JwtService, TokenExpiredError } from '@nestjs/jwt'
import { SignInDto, SignUpDto } from './dto/sign.dto'
import { UserInfo, WithUser } from '../../common/decorators/user.decorator'
import { JwtPayload, JWTToken, TokenKeys } from './consts/jwt.const'
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto'
import { randomUUID } from 'crypto'
import { MailService } from '../../common/utils/mail-util/mail.service'
import { OAuth2Client } from 'google-auth-library'
import { ConfigService } from '@nestjs/config'
import { AuthProvider } from '../users/entities/user.entity'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private stringUtilService: StringUtilService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  async signInWithGoogle(idToken: string) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID')
    if (!googleClientId) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID is not configured')
    }

    const client = new OAuth2Client(googleClientId)
    let ticket
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      })
    } catch (error) {
      throw new UnauthorizedException('Invalid Google ID Token')
    }

    const payload = ticket.getPayload()
    if (!payload) {
      throw new UnauthorizedException('Invalid Google ID Token payload')
    }

    const { sub, email, name, picture, iss, email_verified } = payload

    // 1. Kiểm tra iss
    if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
      throw new UnauthorizedException('Invalid token issuer')
    }

    // 2. Kiểm tra email_verified
    if (!email_verified) {
      throw new UnauthorizedException('Google account email is not verified')
    }

    if (!email) {
      throw new BadRequestException('Google account does not have an email')
    }

    // 3. Tìm kiếm và đồng bộ tài khoản
    let user = await this.usersService.getUser({ googleId: sub })

    if (!user) {
      // Tìm bằng email
      user = await this.usersService.getUser({ email: email.toLowerCase() })

      if (user) {
        // Liên kết tài khoản
        const updateData: any = {
          googleId: sub,
          provider: AuthProvider.GOOGLE,
          isVerified: true,
        }
        if (!user.avatar && picture) {
          updateData.avatar = picture
        }
        user = await this.usersService.updateById(user.id, updateData)
      } else {
        // Tạo mới tài khoản
        user = await this.usersService.createUser({
          email: email.toLowerCase(),
          displayName: name || email.split('@')[0],
          avatar: picture || null,
          googleId: sub,
          provider: AuthProvider.GOOGLE,
          isVerified: true,
        })
      }
    } else {
      // Đã có tài khoản liên kết Google
      if (!user.avatar && picture) {
        user = await this.usersService.updateById(user.id, { avatar: picture })
      }
    }

    if (!user) {
      throw new InternalServerErrorException('Failed to process user sign in')
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account has been banned')
    }

    const userID = user.id
    const userEmail = user.email
    const role = user.role
    return await this.createToken({ userID, userEmail, role })
  }

  async createToken<T extends Record<string, any>>(payload: T) {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWTToken.ACCESS_TOKEN_EXPIRE_IN,
    })
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWTToken.REFRESH_TOKEN_EXPIRE_IN,
    })

    return {
      [TokenKeys.ACCESS_TOKEN_KEY]: accessToken,
      [TokenKeys.REFRESH_TOKEN_KEY]: refreshToken,
    }
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token)
    } catch (error) {
      throw new UnauthorizedException(error instanceof TokenExpiredError ? 'Token expired' : 'Invalid token')
    }
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, ...otherInfo } = signUpDto
    const existing = await this.usersService.getUser({ email })
    if (existing) throw new BadRequestException('User already exist!')

    const passwordHashed = await this.stringUtilService.hash(password)
    const userCreated = await this.usersService.createUser({
      email,
      password: passwordHashed,
      ...otherInfo,
    })
    const { password: _pw, ...userResponse } = userCreated.toObject({
      virtuals: true,
    })
    return userResponse
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto
    const user = await this.usersService.getUser({ email })
    if (!user) throw new UnauthorizedException()

    if (!user.isActive) {
      throw new ForbiddenException('Account has been banned')
    }

    if (!user.password) {
      throw new UnauthorizedException('Tài khoản này chưa thiết lập mật khẩu. Vui lòng đăng nhập bằng Google hoặc sử dụng chức năng quên mật khẩu.')
    }

    const isMatch = await this.stringUtilService.compare(password, user.password)
    if (!isMatch) throw new UnauthorizedException()

    const userID = user.id
    const userEmail = user.email
    const role = user.role
    return await this.createToken({ userID, userEmail, role })
  }

  async refreshToken(refreshToken: string) {
    const { iat: _iat, exp: _exp, ...user } = await this.verifyToken(refreshToken)
    return this.createToken(user)
  }

  sendSMS() {
    return {}
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto
    const user = await this.usersService.getUser({
      $or: [{ email }],
    })

    if (!user) throw new UnauthorizedException('Not found user')

    const userEmail = user.email
    if (userEmail) {
      // 1. Tạo Token và thời gian hết hạn (15 phút)
      const token = randomUUID()
      const expires = new Date(Date.now() + 15 * 60 * 1000)

      // 2. Lưu vào database (Sử dụng các trường đã thêm vào Schema trước đó)
      await this.usersService.update(user.id, {
        resetPasswordToken: token,
        resetPasswordExpiresAt: expires.toISOString(),
      })

      // 3. Gửi mail qua Resend
      try {
        await this.mailService.sendResetPasswordEmail(user.email, token)
        return { message: 'Vui lòng kiểm tra email của bạn' }
      } catch (error) {
        throw new InternalServerErrorException('Lỗi khi gửi email')
      }
    } else {
      this.sendSMS()
      return { message: 'Vui lòng kiểm tra điện thoại của bạn' }
    }
  }

  async resetPassword(token: string, dto: ResetPasswordDto) {
    const { newPassword } = dto

    const user = await this.usersService.getUser({ resetPasswordToken: token })
    if (!user) throw new BadRequestException('Invalid or expired token')

    const isExpired = !user.resetPasswordExpiresAt || new Date(user.resetPasswordExpiresAt) < new Date()
    if (isExpired) throw new BadRequestException('Token has expired')

    const passwordHashed = await this.stringUtilService.hash(newPassword)
    await this.usersService.update(user.id, {
      password: passwordHashed,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    })

    return { message: 'Mật khẩu đã được đặt lại thành công' }
  }

  async changePassword(changePasswordDto: WithUser<ChangePasswordDto>) {
    const { oldPassword, user, newPassword } = changePasswordDto

    const existingUser = await this.usersService.getUser({ _id: user.userID })
    if (!existingUser) throw new UnauthorizedException('User not found')

    if (!existingUser.password) {
      throw new BadRequestException('Tài khoản này chưa thiết lập mật khẩu. Vui lòng sử dụng tính năng đặt lại mật khẩu.')
    }

    const isMatch = await this.stringUtilService.compare(oldPassword, existingUser.password)
    if (!isMatch) throw new BadRequestException('Old password is incorrect')

    const passwordHashed = await this.stringUtilService.hash(newPassword)
    await this.usersService.updateById(user.userID, { password: passwordHashed })
    return { message: 'Password have changed successfully.' }
  }
}
