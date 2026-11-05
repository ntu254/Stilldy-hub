import { Module, OnModuleInit } from '@nestjs/common'
import { InjectModel, MongooseModule } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { DocumentChunk, DocumentChunkDocument, DocumentChunkSchema } from './schemas/document-chunk.schema'
import { ChatSession, ChatSessionSchema } from './schemas/chat-session.schema'
import { ChatbotService } from './chatbot.service'
import { ChatSessionsController } from './chat-sessions.controller'
import { DocumentParserService } from './document-parser.service'
import { DocumentChunkerService } from './document-chunker.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentChunk.name, schema: DocumentChunkSchema },
      { name: ChatSession.name, schema: ChatSessionSchema },
    ]),
  ],
  controllers: [ChatSessionsController],
  providers: [ChatbotService, DocumentParserService, DocumentChunkerService],
  exports: [MongooseModule, ChatbotService, DocumentParserService, DocumentChunkerService],
})
export class ChatbotModule implements OnModuleInit {
  constructor(
    @InjectModel(DocumentChunk.name)
    private readonly documentChunkModel: Model<DocumentChunkDocument>,
  ) {}

  async onModuleInit() {
    try {
      // Thiết lập Vector Search Index cho MongoDB Atlas
      // createSearchIndex là tính năng của MongoDB Atlas (v7.0+)
      const searchIndexes = await this.documentChunkModel.listSearchIndexes()
      const hasVectorIndex = searchIndexes.some((idx: any) => idx.name === 'vector_index')

      if (!hasVectorIndex) {
        const dimensions = 1536

        await this.documentChunkModel.createSearchIndex({
          name: 'vector_index',
          definition: {
            fields: [
              {
                type: 'vector',
                path: 'embeddings',
                numDimensions: dimensions,
                similarity: 'cosine',
              },
              {
                type: 'filter',
                path: 'documentId',
              },
            ],
          },
        })
        console.log(
          `Successfully created Vector Search Index "vector_index" with dimensions: ${dimensions} on collection document_chunks.`,
        )
      }
    } catch (error: any) {
      // Ghi log cảnh báo nếu môi trường là local hoặc không hỗ trợ Search Indexes (ví dụ: không có Atlas)
      console.warn('Vector Search Index not automatically created (requires MongoDB Atlas v7.0+):', error.message)
    }
  }
}
