import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'
import { FirebaseStorageService } from './firebase-storage.service'
import { MyDocument, MyDocumentSchema } from './schemas/document.schema'
import { Category, CategorySchema } from '../category/schemas/category.schema'
import { Report, ReportSchema } from './schemas/report.schema'
import { SavedDocument, SavedDocumentSchema } from './schemas/saved-document.schema'
import { DocumentConversation, DocumentConversationSchema } from './schemas/document-conversation.schema'
import { User, UserSchema } from '../users/entities/user.entity'
import { ChatbotModule } from '../chatbot/chatbot.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { OptionalAuthGuard } from '../auth/optional-auth.guard'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MyDocument.name, schema: MyDocumentSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Report.name, schema: ReportSchema },
      { name: SavedDocument.name, schema: SavedDocumentSchema },
      { name: DocumentConversation.name, schema: DocumentConversationSchema },
      { name: User.name, schema: UserSchema }, // Cần để kiểm tra storageLimit khi upload
    ]),
    ChatbotModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, FirebaseStorageService, OptionalAuthGuard],
  exports: [DocumentsService, FirebaseStorageService],
})
export class DocumentsModule {}
