import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { User as UserEntity, UserRole } from '../../app/users/entities/user.entity'

export interface UserInfo {
  userID: UserEntity['id']
  userEmail: UserEntity['email']
  role: UserRole
}

export const User = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user?: UserInfo }>()
  return req.user
})

export type WithUser<T> = T & { user: UserInfo }
