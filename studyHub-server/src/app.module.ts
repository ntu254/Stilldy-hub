import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from './app/auth/auth.module'
import { UsersModule } from './app/users/users.module'
import { CategoryModule } from './app/category/category.module'
import { DocumentsModule } from './app/documents/documents.module'
import { SubscriptionsModule } from './app/subscriptions/subscriptions.module'
import { AuthGuard } from './app/auth/auth.guard'
import { RolesGuard } from './common/security/roles/roles.guard'
import { ApiUtilModule } from './common/utils/api-util/api-util.module'
import { FormatResponseInterceptor } from './common/interceptors/format-response/format-response.interceptor'
import { AdminModule } from './app/admin/admin.module'
import { ChatbotModule } from './app/chatbot/chatbot.module'
import { FlashcardsModule } from './app/flashcards/flashcards.module'
import { LearningHistoryModule } from './app/learninghistory/learninghistory.module'
import { SettingsModule } from './app/settings/settings.module'
import { NotificationsModule } from './app/notifications/notifications.module'
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // eslint-disable-next-line @typescript-eslint/require-await
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    UsersModule,
    CategoryModule,
    DocumentsModule,
    SubscriptionsModule,
    ApiUtilModule,
    AdminModule,
    ChatbotModule,
    FlashcardsModule,
    LearningHistoryModule,
    SettingsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: FormatResponseInterceptor },
  ],
})
export class AppModule {}
