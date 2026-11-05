import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { AdminUsersController } from './admin-users.controller'
import { User, UserSchema } from './entities/user.entity'
import { MyDocument, MyDocumentSchema } from '../documents/schemas/document.schema'
import { AuthModule } from '../auth/auth.module'
import { PaginationUtilModule } from '../../common/utils/pagination-util/pagination-util.module'
import { CloudinaryModule } from '../../common/services/cloudinary/cloudinary.module'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: MyDocument.name, schema: MyDocumentSchema },
    ]),
    forwardRef(() => AuthModule),
    PaginationUtilModule,
    CloudinaryModule,
    SettingsModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
