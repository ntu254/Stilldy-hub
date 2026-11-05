import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionExpirationService } from './subscription-expiration.service'
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema'
import { Payment, PaymentSchema } from './schemas/payment.schema'
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema'
import { User, UserSchema } from '../users/entities/user.entity'
import { MyDocument, MyDocumentSchema } from '../documents/schemas/document.schema'
import { DocumentChunk, DocumentChunkSchema } from '../chatbot/schemas/document-chunk.schema'
import { SavedDocument, SavedDocumentSchema } from '../documents/schemas/saved-document.schema'
import { Report, ReportSchema } from '../documents/schemas/report.schema'
import { DocumentConversation, DocumentConversationSchema } from '../documents/schemas/document-conversation.schema'
import { DocumentsModule } from '../documents/documents.module'
import { SettingsModule } from '../settings/settings.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: MyDocument.name, schema: MyDocumentSchema },
      { name: DocumentChunk.name, schema: DocumentChunkSchema },
      { name: SavedDocument.name, schema: SavedDocumentSchema },
      { name: Report.name, schema: ReportSchema },
      { name: DocumentConversation.name, schema: DocumentConversationSchema },
    ]),
    DocumentsModule,
    SettingsModule,
    NotificationsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionExpirationService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
