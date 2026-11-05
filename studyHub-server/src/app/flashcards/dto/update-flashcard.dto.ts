import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { CardItemDto } from './create-flashcard.dto'

export class UpdateFlashcardDto {
  @ApiProperty({ required: false, example: 'Sinh học tế bào - Chương 4 (Đã cập nhật)' })
  @IsOptional()
  @IsString()
  title?: string

  @ApiProperty({ required: false, example: 'Mô tả bộ thẻ đã chỉnh sửa' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  @ApiProperty({
    required: false,
    type: [CardItemDto],
    description: 'Toàn bộ danh sách thẻ con (sẽ thay thế hoàn toàn)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardItemDto)
  cards?: CardItemDto[]
}
