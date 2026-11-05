import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'

export class UpdatePrivacyDto {
  @ApiProperty({
    description: 'Trạng thái công khai của tài liệu',
    example: true,
  })
  @IsBoolean()
  isPublic!: boolean

  @ApiPropertyOptional({
    description:
      'Xác nhận chịu trách nhiệm pháp lý theo tiêu chuẩn DMCA khi công khai tài liệu. ' +
      'Bắt buộc phải là true nếu isPublic = true.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  dmcaAccepted?: boolean
}
