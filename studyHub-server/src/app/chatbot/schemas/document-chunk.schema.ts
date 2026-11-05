import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type DocumentChunkDocument = DocumentChunk & Document

@Schema({ _id: false })
export class DocumentChunkMetadata {
  @Prop({ type: Number })
  pageNumber?: number

  @Prop({ type: String, trim: true })
  heading?: string

  @Prop({ type: String, trim: true })
  chapter?: string

  @Prop({ type: String, trim: true })
  sourceType?: string
}

@Schema({ timestamps: true, collection: 'document_chunks' })
export class DocumentChunk {
  @Prop({ type: Types.ObjectId, ref: 'MyDocument', required: true })
  documentId!: Types.ObjectId

  @Prop({ required: true, type: Number })
  versionNumber!: number

  @Prop({ required: true, trim: true })
  extractedText!: string

  @Prop({ type: [Number], required: true })
  embeddings!: number[]

  @Prop({ type: DocumentChunkMetadata, required: true })
  metadata!: DocumentChunkMetadata
}

export const DocumentChunkSchema = SchemaFactory.createForClass(DocumentChunk)

// Chỉ mục thường phục vụ lọc nhanh theo documentId
DocumentChunkSchema.index({ documentId: 1 })

// Chỉ mục văn bản phục vụ truy vấn tìm kiếm từ khóa (lexical search)
DocumentChunkSchema.index({ extractedText: 'text' }, { default_language: 'none' })
