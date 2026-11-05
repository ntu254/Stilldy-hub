import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type FlashcardDocument = FlashcardCollection & Document

// ─── Sub-document: CardItem ────────────────────────────────────────────────
@Schema({ _id: true })
export class CardItem {
  @Prop({ required: true, trim: true })
  term!: string

  @Prop({ required: true, trim: true })
  definition!: string

  // Mảng userId đã bấm "Đánh dấu / Star" thẻ này
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  markedBy!: Types.ObjectId[]

  // Mảng userId đã bấm "Đã biết / Mastered" thẻ này
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  masteredBy!: Types.ObjectId[]
}

export const CardItemSchema = SchemaFactory.createForClass(CardItem)

// ─── Root document: FlashcardCollection ───────────────────────────────────
@Schema({ timestamps: true, collection: 'flashcard_collections' })
export class FlashcardCollection {
  @Prop({ required: true, trim: true })
  title!: string

  @Prop({ trim: true })
  description!: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId

  @Prop({ default: false })
  isPublic!: boolean

  // Mảng nhúng thẻ con
  @Prop({ type: [CardItemSchema], default: [] })
  cards!: CardItem[]

  @Prop({ default: 0, type: Number })
  viewCount!: number

  @Prop({ default: false })
  isDeleted!: boolean

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null
}

export const FlashcardSchema = SchemaFactory.createForClass(FlashcardCollection)

// Text Index trên title — chuẩn bị cho API tìm kiếm mờ ($text search)
FlashcardSchema.index({ title: 'text' })
