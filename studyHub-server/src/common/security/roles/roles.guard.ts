import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '../../../app/users/entities/user.entity'
import { ROLES_KEY } from '../../decorators/roles.decorator'
import type { UserInfo } from '../../decorators/user.decorator'

interface RequestWithUser {
  user?: UserInfo
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>()
    const user = req.user

    if (!user) throw new ForbiddenException()

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource')
    }
    return true
  }
}
