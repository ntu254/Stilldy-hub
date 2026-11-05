import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { ChatMessage } from '../../chatbot/schemas/chat-session.schema'

export type DocumentConversationDocument = DocumentConversation & Document

@Schema({ timestamps: true, collection: 'document_conversations' })
export class DocumentConversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'MyDocument', required: true })
  documentId!: Types.ObjectId

  @Prop({ type: [ChatMessage], default: [] })
  messages!: ChatMessage[]
}

export const DocumentConversationSchema = SchemaFactory.createForClass(DocumentConversation)

// Đảm bảo mỗi người dùng chỉ có một lịch sử chat duy nhất cho một tài liệu cụ thể
DocumentConversationSchema.index({ userId: 1, documentId: 1 }, { unique: true })
