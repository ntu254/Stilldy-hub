import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type ReportDocument = Report & Document

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'MyDocument', required: true })
  documentId!: Types.ObjectId // Tài liệu nào bị báo cáo

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedBy!: Types.ObjectId // Sinh viên nào bấm báo cáo

  @Prop({ required: true, trim: true })
  reason!: string // Lý do vi phạm (e.g., "Tài liệu sai lệch kiến thức", "Đạo văn", "Spam")

  @Prop({ default: 'PENDING', enum: ['PENDING', 'RESOLVED_KEPT', 'RESOLVED_DELETED'] })
  status!: string // Trạng thái xử lý của Admin
}

export const ReportSchema = SchemaFactory.createForClass(Report)
