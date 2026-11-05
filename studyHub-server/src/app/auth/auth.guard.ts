import type { Request } from 'express'
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { IS_SKIP_AUTH } from './auth.decorator'
import { Reflector } from '@nestjs/core'
import { AuthService } from './auth.service'
import { UserInfo } from '../../common/decorators/user.decorator'
import { TokenKeys } from './consts/jwt.const'
import { UsersService } from '../users/users.service'

interface AuthenticatedRequest extends Request {
  user?: UserInfo
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isSkipAuth = this.reflector.getAllAndOverride<boolean>(IS_SKIP_AUTH, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isSkipAuth) {
      return true
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.extractTokenFromHeader(req)
    if (!token) throw new UnauthorizedException()

    try {
      const { iat: _iat, exp: _exp, ...user } = await this.authService.verifyToken(token)
      const userRecord = await this.usersService.findById(user.userID)

      if (!userRecord) {
        throw new UnauthorizedException('User not found')
      }

      if (!userRecord.isActive) {
        throw new ForbiddenException('Account is locked')
      }

      req.user = {
        userID: userRecord.id,
        userEmail: userRecord.email,
        role: userRecord.role,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unauthorized'
      throw new UnauthorizedException(message)
    }
    return true
  }

  private extractTokenFromHeader(req: AuthenticatedRequest): string | undefined {
    const [type, bearerToken] = req.headers.authorization?.split(' ') ?? []
    if (type === 'Bearer') return bearerToken
    const cookieToken = req.cookies[TokenKeys.ACCESS_TOKEN_KEY]
    return cookieToken ?? undefined
  }
}
