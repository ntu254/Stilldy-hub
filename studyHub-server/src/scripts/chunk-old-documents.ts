import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { ChatbotService } from '../app/chatbot/chatbot.service'
import { MyDocument } from '../app/documents/schemas/document.schema'
import { DocumentChunk } from '../app/chatbot/schemas/document-chunk.schema'
import { getModelToken } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { FirebaseStorageService } from '../app/documents/firebase-storage.service'
import { Logger } from '@nestjs/common'

async function run() {
  const logger = new Logger('MigrationScript')
  logger.log('==================================================================')
  logger.log('Bắt đầu chạy Script đồng bộ và tạo Chunk cho các tài liệu cũ...')
  logger.log('==================================================================')

  // Khởi tạo Application Context của NestJS
  logger.log('Đang khởi tạo kết nối database và load các NestJS Modules...')
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  })

  try {
    const chatbotService = app.get(ChatbotService)
    const firebaseStorageService = app.get(FirebaseStorageService)
    const documentModel = app.get<Model<any>>(getModelToken(MyDocument.name))
    const documentChunkModel = app.get<Model<any>>(getModelToken(DocumentChunk.name))

    logger.log('Kết nối database thành công. Đang truy vấn danh sách tài liệu...')

    // Lấy tất cả các tài liệu chưa bị xóa mềm
    const documents = await documentModel.find({ _destroy: { $ne: true } }).exec()
    logger.log(`Tìm thấy tổng cộng ${documents.length} tài liệu đang hoạt động trong database.`)

    let processedCount = 0
    let skippedCount = 0
    let failedCount = 0

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      const docIndex = i + 1
      logger.log(`\n[${docIndex}/${documents.length}] Đang kiểm tra tài liệu: "${doc.title}" (ID: ${doc._id})`)

      const versions = doc.versions || []
      if (versions.length === 0) {
        logger.warn(`  ↳ Tài liệu "${doc.title}" không có phiên bản nào! Bỏ qua.`)
        skippedCount++
        continue
      }

      logger.log(`  ↳ Tài liệu có ${versions.length} phiên bản. Tiến hành kiểm tra từng phiên bản...`)

      for (const version of versions) {
        const versionNumber = version.versionNumber
        const fileName = version.fileName
        const fileUrl = version.fileUrl

        logger.log(`    [Phiên bản ${versionNumber}] File: "${fileName}"`)

        // Kiểm tra xem phiên bản này của tài liệu đã có chunks trong database chưa
        const existingChunksCount = await documentChunkModel
          .countDocuments({
            documentId: doc._id,
            versionNumber: versionNumber,
          })
          .exec()

        if (existingChunksCount > 0) {
          logger.log(`      ↳ Đã tồn tại ${existingChunksCount} chunks trong database. Không cần xử lý lại.`)
          skippedCount++
          continue
        }

        logger.log(`      ↳ Chưa có chunk trong database. Bắt đầu tải file về để xử lý...`)
        logger.log(`      ↳ URL: ${fileUrl}`)

        try {
          let buffer: Buffer

          // Tải file về dạng Buffer
          if (fileUrl.startsWith('https://storage.googleapis.com/')) {
            logger.log(`      ↳ Tải file từ Firebase Storage qua API SDK...`)
            const stream = await firebaseStorageService.getFileStream(fileUrl)
            const chunks: Buffer[] = []
            for await (const chunk of stream) {
              chunks.push(chunk as Buffer)
            }
            buffer = Buffer.concat(chunks)
          } else {
            logger.log(`      ↳ Tải file qua HTTP fetch direct...`)
            const response = await fetch(fileUrl)
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            const arrayBuffer = await response.arrayBuffer()
            buffer = Buffer.from(arrayBuffer)
          }

          logger.log(`      ↳ Tải file thành công. Kích thước: ${(buffer.length / 1024).toFixed(2)} KB.`)
          logger.log(`      ↳ Bắt đầu trích xuất text, băm nhỏ và tạo vector embeddings...`)

          // Thực hiện xử lý trích xuất văn bản, tạo chunks và embeddings
          await chatbotService.processDocument(doc._id.toString(), versionNumber, buffer, fileName)

          // Lấy lại số lượng chunk vừa được lưu để log kiểm tra
          const newChunksCount = await documentChunkModel
            .countDocuments({
              documentId: doc._id,
              versionNumber: versionNumber,
            })
            .exec()

          logger.log(`      ✔ Hoàn tất tạo ${newChunksCount} chunks cho phiên bản ${versionNumber}!`)
          processedCount++

          // Tránh gửi request dồn dập lên API AI để phòng ngừa lỗi Rate Limit (TPM/RPM limit)
          logger.log('      ↳ Nghỉ 1 giây trước khi tiếp tục...')
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (err: any) {
          logger.error(`      ❌ Lỗi khi xử lý phiên bản ${versionNumber} của tài liệu "${doc.title}": ${err.message}`)
          if (err.stack) {
            logger.error(err.stack)
          }
          failedCount++
        }
      }
    }

    logger.log('\n==================================================================')
    logger.log('KẾT QUẢ CHẠY SCRIPT MIGRATION:')
    logger.log(`- Tổng số tài liệu: ${documents.length}`)
    logger.log(`- Số phiên bản được tạo chunk thành công: ${processedCount}`)
    logger.log(`- Số phiên bản bỏ qua (đã có chunk hoặc không hợp lệ): ${skippedCount}`)
    logger.log(`- Số phiên bản bị lỗi: ${failedCount}`)
    logger.log('==================================================================')
  } catch (error: any) {
    logger.error('❌ Đã xảy ra lỗi nghiêm trọng trong quá trình chạy script migration:', error.message)
    if (error.stack) {
      logger.error(error.stack)
    }
  } finally {
    logger.log('Đang tắt Application Context...')
    await app.close()
    logger.log('Đã đóng kết nối thành công.')
  }
}

run()
