import type { Request } from 'express'
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { AuthService } from './auth.service'
import { UserInfo } from '../../common/decorators/user.decorator'
import { TokenKeys } from './consts/jwt.const'
import { UsersService } from '../users/users.service'

interface AuthenticatedRequest extends Request {
  user?: UserInfo
}

/**
 * Guard xác thực tùy chọn (Optional Auth).
 * - Nếu request có token hợp lệ → xác thực và gán req.user
 * - Nếu không có token hoặc token không hợp lệ → cho qua, req.user = undefined
 *
 * Dùng cho các endpoint vừa phục vụ khách vãng lai (isPublic) lẫn người dùng đã đăng nhập.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.extractTokenFromHeader(req)

    // Không có token → cho qua, req.user vẫn là undefined
    if (!token) return true

    try {
      const { iat: _iat, exp: _exp, ...user } = await this.authService.verifyToken(token)
      const userRecord = await this.usersService.findById(user.userID)

      // Token hợp lệ và user tồn tại, đang active → gán vào request
      if (userRecord && userRecord.isActive) {
        req.user = {
          userID: userRecord.id,
          userEmail: userRecord.email,
          role: userRecord.role,
        }
      }
    } catch {
      // Token lỗi hoặc hết hạn → không throw, coi như khách vãng lai
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
