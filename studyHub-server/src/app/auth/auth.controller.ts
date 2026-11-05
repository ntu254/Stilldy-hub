import { Controller, Post, Body, Get, Res, UseGuards, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { SignInDto, SignInResponseDto, SignUpDto } from './dto/sign.dto'
import { GoogleSignInDto } from './dto/google-sign-in.dto'
import { SkipAuth } from './auth.decorator'
import { Cookies } from '../../common/decorators/cookie/cookie.decorator'
import type { Response } from 'express'
import ms from 'ms'
import { COOKIE_CONFIG_DEFAULT, CookiesToken } from '../../common/decorators/cookie/cookie.const'
import { ZodResponse } from 'nestjs-zod'
import { TokenKeys } from './consts/jwt.const'
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto'
import { User } from '../../common/decorators/user.decorator'
import type { UserInfo } from '../../common/decorators/user.decorator'
import { AuthGuard } from './auth.guard'
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @SkipAuth()
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto)
  }

  @Post('sign-in')
  @SkipAuth()
  @ZodResponse({ type: SignInResponseDto })
  async signIn(@Body() signInDto: SignInDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.signIn(signInDto)

    res.cookie(TokenKeys.ACCESS_TOKEN_KEY, data.accessToken, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.ACCESS_TOKEN_EXPIRE_IN),
    })
    res.cookie(TokenKeys.REFRESH_TOKEN_KEY, data.refreshToken, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.REFRESH_TOKEN_EXPIRE_IN),
    })
    return data
  }

  @Post('google')
  @SkipAuth()
  @ZodResponse({ type: SignInResponseDto })
  async googleSignIn(@Body() body: GoogleSignInDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.signInWithGoogle(body.idToken)

    res.cookie(TokenKeys.ACCESS_TOKEN_KEY, data.accessToken, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.ACCESS_TOKEN_EXPIRE_IN),
    })
    res.cookie(TokenKeys.REFRESH_TOKEN_KEY, data.refreshToken, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.REFRESH_TOKEN_EXPIRE_IN),
    })
    return data
  }

  @Get('logout')
  @SkipAuth()
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(TokenKeys.ACCESS_TOKEN_KEY, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.ACCESS_TOKEN_EXPIRE_IN),
    })
    res.clearCookie(TokenKeys.REFRESH_TOKEN_KEY, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.REFRESH_TOKEN_EXPIRE_IN),
    })
    return { message: 'Logout success!' }
  }

  @Get('refresh-token')
  @SkipAuth()
  async refreshToken(@Cookies('refreshToken') refreshToken: string, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.refreshToken(refreshToken)

    res.cookie(TokenKeys.ACCESS_TOKEN_KEY, data.accessToken, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.ACCESS_TOKEN_EXPIRE_IN),
    })
    res.cookie(TokenKeys.REFRESH_TOKEN_KEY, data.refreshToken, {
      ...COOKIE_CONFIG_DEFAULT,
      maxAge: ms(CookiesToken.REFRESH_TOKEN_EXPIRE_IN),
    })
    return data
  }

  @Post('forgot-password')
  @SkipAuth()
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto)
  }

  @Post('reset-password')
  @SkipAuth()
  async resetPassword(@Query('token') token: string, @Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(token, resetPasswordDto)
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @User() user: UserInfo) {
    return await this.authService.changePassword({ ...changePasswordDto, user })
  }
}
