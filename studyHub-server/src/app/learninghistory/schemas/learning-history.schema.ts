import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type LearningHistoryDocument = LearningHistory & Document

@Schema({ timestamps: true, collection: 'learning_histories' })
export class LearningHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'FlashcardCollection', required: true })
  flashcardId!: Types.ObjectId

  @Prop({ type: String, default: 'TEST' })
  mode!: string

  @Prop({ required: true, type: Number })
  durationSeconds!: number

  @Prop({ required: true, type: Number })
  score!: number

  @Prop({ required: true, type: Number })
  totalQuestions!: number

  @Prop({ required: true, type: Number })
  correctAnswers!: number

  @Prop({ type: [String], default: [] })
  incorrectTerms!: string[]
}

export const LearningHistorySchema = SchemaFactory.createForClass(LearningHistory)
