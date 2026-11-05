import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateCardDto {
  @ApiProperty({ required: false, example: 'Photosynthesis' })
  @IsOptional()
  @IsString()
  term?: string

  @ApiProperty({ required: false, example: 'Quá trình tổng hợp chất hữu cơ từ CO₂ và nước dưới ánh sáng mặt trời' })
  @IsOptional()
  @IsString()
  definition?: string
}
