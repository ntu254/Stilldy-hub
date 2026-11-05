import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common'
import { readFileSync } from 'fs'
import { join } from 'path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import type { Bucket } from '@google-cloud/storage'

@Injectable()
export class FirebaseStorageService implements OnModuleInit {
  private bucket!: Bucket

  onModuleInit() {
    const serviceAccount = JSON.parse(
      readFileSync(join(process.cwd(), 'firebase-adminsdk.json'), 'utf-8'),
    ) as Parameters<typeof cert>[0]

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      })
    }
    this.bucket = getStorage().bucket()
  }

  async uploadFile(file: Express.Multer.File): Promise<{ fileUrl: string; fileSize: number; fileName: string }> {
    if (!file) {
      throw new BadRequestException('Vui lòng đính kèm tệp tài liệu học tập!')
    }

    // Đổi tên file kết hợp timestamp để tránh trùng lặp đè file trên Cloud
    const uniqueFileName = `documents/${Date.now()}-${file.originalname}`
    const blob = this.bucket.file(uniqueFileName)

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype, // Định nghĩa kiểu file để hỗ trợ tính năng Preview trực tiếp
      },
    })

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        reject(new BadRequestException(`Lỗi đẩy dữ liệu lên Firebase: ${error.message}`))
      })

      blobStream.on('finish', () => {
        blob
          .makePublic()
          .then(() => {
            const fileUrl = `https://storage.googleapis.com/${this.bucket.name}/${blob.name}`
            resolve({
              fileUrl,
              fileSize: file.size,
              fileName: file.originalname,
            })
          })
          .catch(() => {
            reject(new BadRequestException('Lỗi trong quá trình kích hoạt quyền xem file URL'))
          })
      })

      // Đẩy dữ liệu buffer từ bộ nhớ RAM lên Cloud stream
      blobStream.end(file.buffer)
    })
  }

  // Sinh ra Signed URL có thời hạn 1 giờ để chia sẻ file
  async getSignedUrl(publicFileUrl: string): Promise<string> {
    // Trích xuất tên file từ public URL: https://storage.googleapis.com/<bucket>/<fileName>
    const bucketPrefix = `https://storage.googleapis.com/${this.bucket.name}/`
    const fileName = publicFileUrl.replace(bucketPrefix, '')

    const [signedUrl] = await this.bucket.file(fileName).getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 giờ
    })

    return signedUrl
  }

  async getFileStream(publicFileUrl: string) {
    const bucketPrefix = `https://storage.googleapis.com/${this.bucket.name}/`
    const fileName = publicFileUrl.replace(bucketPrefix, '')
    const file = this.bucket.file(fileName)
    const [exists] = await file.exists()
    if (!exists) {
      throw new BadRequestException('Tập tin không tồn tại trên Cloud Storage.')
    }
    return file.createReadStream()
  }

  async getFileMetadata(publicFileUrl: string) {
    const bucketPrefix = `https://storage.googleapis.com/${this.bucket.name}/`
    const fileName = publicFileUrl.replace(bucketPrefix, '')
    const file = this.bucket.file(fileName)
    const [exists] = await file.exists()
    if (!exists) {
      throw new BadRequestException('Tập tin không tồn tại trên Cloud Storage.')
    }
    const [metadata] = await file.getMetadata()
    return metadata
  }

  async deleteFile(publicFileUrl: string): Promise<void> {
    const bucketPrefix = `https://storage.googleapis.com/${this.bucket.name}/`
    if (!publicFileUrl.startsWith(bucketPrefix)) {
      throw new BadRequestException('URL file không hợp lệ hoặc không thuộc hệ thống storage này')
    }
    const fileName = publicFileUrl.replace(bucketPrefix, '')

    try {
      const file = this.bucket.file(fileName)
      await file.delete()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error(`Không thể xóa file vật lý trên Cloud: ${errMsg}`)
    }
  }
}
