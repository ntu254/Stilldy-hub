import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CardItemDto {
  @ApiProperty({ example: 'Osmosis', description: 'Thuật ngữ / Mặt trước thẻ' })
  @IsString()
  @IsNotEmpty()
  term: string

  @ApiProperty({ example: 'Quá trình khuếch tán dung môi qua màng bán thấm', description: 'Định nghĩa / Mặt sau thẻ' })
  @IsString()
  @IsNotEmpty()
  definition: string
}

export class CreateFlashcardDto {
  @ApiProperty({ example: 'Sinh học tế bào - Chương 3' })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ required: false, example: 'Tổng hợp kiến thức Chương 3 môn Sinh học tế bào' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ default: false, description: 'true = công khai, false = riêng tư' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  @ApiProperty({ type: [CardItemDto], description: 'Danh sách thẻ con trong bộ thẻ' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardItemDto)
  cards: CardItemDto[]
}
