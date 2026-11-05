import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type ChatSessionDocument = ChatSession & Document

@Schema({ _id: false })
export class ChatMessage {
  @Prop({ required: true, trim: true })
  sender!: string

  @Prop({ required: true, trim: true })
  textContent!: string

  @Prop({ type: [String], default: [] })
  citations!: string[]

  @Prop({ default: Date.now })
  createdAt!: Date
}

@Schema({ timestamps: true, collection: 'chat_sessions' })
export class ChatSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ type: [{ type: Types.ObjectId, ref: 'MyDocument' }], default: [] })
  documentIds!: Types.ObjectId[]

  @Prop({ required: true, trim: true })
  sessionTitle!: string

  @Prop({ default: false })
  isPinned!: boolean

  @Prop({ default: false })
  isArchived!: boolean

  @Prop({ type: [ChatMessage], default: [] })
  messages!: ChatMessage[]
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession)
