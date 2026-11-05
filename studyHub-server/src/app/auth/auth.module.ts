import { Module, forwardRef } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { StringUtilService } from '../../common/utils/string-util/string-util.service'
import { UsersModule } from '../users/users.module'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { JWTEnvs } from './consts/jwt.const'
import { MailService } from '../../common/utils/mail-util/mail.service'
import { AuthGuard } from './auth.guard'
import { OptionalAuthGuard } from './optional-auth.guard'

@Module({
  imports: [
    forwardRef(() => UsersModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>(JWTEnvs.JWT_SECRET),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OptionalAuthGuard, StringUtilService, MailService],
  exports: [AuthService, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
