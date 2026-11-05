// src/app/transactions/cloudinary.service.ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary'
import 'multer'

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    // Khởi tạo và cấu hình tài khoản Cloudinary lấy từ .env
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })
  }

  /**
   * Hàm chuyển đổi Buffer của file sang Stream và upload lên Cloudinary
   */
  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'studyhub_avatars', // Tạo thư mục riêng trên Cloudinary để quản lý ảnh minh chứng
          allowed_formats: ['jpg', 'png', 'jpeg'], // Chỉ cho phép upload các định dạng ảnh này
        },
        (error, result) => {
          if (error) return reject(new Error(error.message || 'Cloudinary upload failed'))
          if (!result) return reject(new Error('Upload returned no result'))
          resolve(result)
        },
      )

      // Ghi dữ liệu buffer của file vào luồng upload và kết thúc stream
      uploadStream.end(file.buffer)
    })
  }
}
