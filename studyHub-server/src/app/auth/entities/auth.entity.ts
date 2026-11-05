import { PickType } from '@nestjs/swagger'
import { User } from '../../users/entities/user.entity'

export class Auth extends PickType(User, ['email', 'phoneNumber', 'password']) {}
