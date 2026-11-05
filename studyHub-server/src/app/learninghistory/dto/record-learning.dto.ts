import { IsNotEmpty, IsNumber, IsString, IsArray, IsOptional, IsMongoId } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RecordLearningDto {
  @ApiProperty({ description: 'ID của bộ thẻ (FlashcardCollection)' })
  @IsMongoId()
  @IsNotEmpty()
  flashcardId!: string

  @ApiPropertyOptional({ description: 'Chế độ học (mặc định: TEST)', default: 'TEST' })
  @IsString()
  @IsOptional()
  mode?: string

  @ApiProperty({ description: 'Điểm số của bài kiểm tra (ví dụ: phần trăm)' })
  @IsNumber()
  @IsNotEmpty()
  score!: number

  @ApiProperty({ description: 'Tổng số câu hỏi trong bài thi' })
  @IsNumber()
  @IsNotEmpty()
  totalQuestions!: number

  @ApiProperty({ description: 'Số câu trả lời đúng' })
  @IsNumber()
  @IsNotEmpty()
  correctAnswers!: number

  @ApiProperty({ description: 'Thời gian làm bài (tính bằng giây)' })
  @IsNumber()
  @IsNotEmpty()
  durationSeconds!: number

  @ApiPropertyOptional({ description: 'Mảng các ID/chuỗi thuật ngữ trả lời sai', type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  incorrectTerms?: string[]
}
