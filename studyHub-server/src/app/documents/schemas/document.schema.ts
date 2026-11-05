import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type MyDocumentType = MyDocument & Document

// Định nghĩa cấu trúc đối tượng nhúng (Sub-document) cho từng phiên bản file
@Schema({ _id: false })
class DocumentVersion {
  @Prop({ required: true, type: Number })
  versionNumber!: number // Tăng dần: 1, 2, 3...

  @Prop({ required: true, trim: true })
  fileName!: string // Tên gốc của file lúc upload (e.g., "de-cuong-on-tap.pdf")

  @Prop({ required: true })
  fileUrl!: string // Đường dẫn link Preview công khai trả về từ Firebase

  @Prop({ required: true, type: Number })
  fileSize!: number // Dung lượng file tính bằng Bytes

  @Prop({ required: true, index: true })
  fileHash!: string // băm file ra bằng sha256

  @Prop({ default: Date.now })
  createdAt!: Date
}

@Schema({ timestamps: true })
export class MyDocument {
  @Prop({ required: true, trim: true })
  title!: string

  @Prop({ trim: true })
  description!: string

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  subjectId!: Types.ObjectId // Thuộc môn học nào

  @Prop({ type: [String], default: [] })
  tags!: string[]

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId // Sinh viên nào tải lên

  @Prop({ default: false })
  isPublic!: boolean // true: công khai toàn trường, false: kho lưu trữ cá nhân

  @Prop({ default: 0, type: Number })
  viewCount!: number

  @Prop({ default: 0, type: Number })
  downloadCount!: number

  // Nhúng mảng chứa lịch sử phiên bản tài liệu
  @Prop({ type: [DocumentVersion], default: [] })
  versions!: DocumentVersion[]

  // Xóa mềm: true = đã xóa, false = còn tồn tại
  @Prop({ default: false })
  _destroy!: boolean

  @Prop({ default: false, type: Boolean })
  isSystemSoftDeleted!: boolean

  @Prop({ default: false })
  isReported!: boolean

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[]

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  dislikes: Types.ObjectId[]

  // DMCA Compliance Audit Trail
  // Ghi lại thời điểm chủ sở hữu chấp nhận điều khoản DMCA khi public tài liệu
  @Prop({ type: Date, default: null })
  dmcaAcceptedAt!: Date | null
}

export const MyDocumentSchema = SchemaFactory.createForClass(MyDocument)
