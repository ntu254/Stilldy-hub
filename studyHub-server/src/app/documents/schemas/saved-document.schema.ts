import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type SavedDocumentDocument = SavedDocument & Document

@Schema({ timestamps: true, collection: 'saved_documents' })
export class SavedDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId // Ai là người bấm lưu

  @Prop({ type: Types.ObjectId, ref: 'MyDocument', required: true })
  documentId: Types.ObjectId // Lưu tài liệu nào
}

export const SavedDocumentSchema = SchemaFactory.createForClass(SavedDocument)

// Tạo index kết hợp để sinh viên không thể lưu trùng lặp 1 file nhiều lần
SavedDocumentSchema.index({ userId: 1, documentId: 1 }, { unique: true })
