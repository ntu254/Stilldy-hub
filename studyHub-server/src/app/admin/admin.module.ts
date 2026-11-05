import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { MyDocument, MyDocumentSchema } from '../documents/schemas/document.schema'
import { Report, ReportSchema } from '../documents/schemas/report.schema'
import { DocumentsModule } from '../documents/documents.module' // Kế thừa FirebaseStorageService từ module Documents
import { User, UserSchema } from '../users/entities/user.entity'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MyDocument.name, schema: MyDocumentSchema },
      { name: Report.name, schema: ReportSchema },
      { name: User.name, schema: UserSchema },
    ]),
    DocumentsModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
