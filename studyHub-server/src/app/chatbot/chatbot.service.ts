import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { DocumentChunk, DocumentChunkDocument } from './schemas/document-chunk.schema'
import { ChatSession, ChatSessionDocument, ChatMessage } from './schemas/chat-session.schema'
import { CreateChatSessionDto } from './dto/create-chat-session.dto'
import { DocumentParserService } from './document-parser.service'
import { DocumentChunkerService } from './document-chunker.service'

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name)

  constructor(
    @InjectModel(DocumentChunk.name)
    private readonly documentChunkModel: Model<DocumentChunkDocument>,
    @InjectModel(ChatSession.name)
    private readonly chatSessionModel: Model<ChatSessionDocument>,
    private readonly documentParserService: DocumentParserService,
    private readonly documentChunkerService: DocumentChunkerService,
  ) {}

  /**
   * Khởi tạo một phiên chat mới
   */
  async createChatSession(userId: string, dto: CreateChatSessionDto): Promise<ChatSession> {
    const createdSession = new this.chatSessionModel({
      userId: new Types.ObjectId(userId),
      documentIds: dto.documentIds.map((id) => new Types.ObjectId(id)),
      sessionTitle: dto.sessionTitle || 'Đoạn chat mới',
      messages: [],
    })
    return await createdSession.save()
  }

  /**
   * Lấy danh sách tất cả các phiên chat của một sinh viên
   */
  async getChatSessionsByUser(userId: string, isArchived: boolean = false): Promise<ChatSession[]> {
    return await this.chatSessionModel
      .find({
        userId: new Types.ObjectId(userId),
        isArchived: isArchived,
      })
      .sort({ isPinned: -1, createdAt: -1 })
      .exec()
  }

  /**
   * Lấy chi tiết của một phiên chat (kèm mảng nhúng messages)
   */
  async getChatSessionDetail(userId: string, id: string): Promise<ChatSession> {
    const session = await this.chatSessionModel.findById(id).exec()
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat này!')
    }
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập phiên chat này!')
    }
    return session
  }

  /**
   * Tiếp nhận câu hỏi, quét tìm dữ liệu liên quan trong kho chunk, gửi sang AI và đóng gói câu trả lời kèm số trang trích dẫn.
   */
  /**
   * Phương thức chung thực hiện quy trình RAG (Retrieval-Augmented Generation)
   * Quét các đoạn văn bản tương đồng của tài liệu, ghép ngữ cảnh và lịch sử chat để gửi sang AI API.
   */
  async getAIResponseForContext(
    textContent: string,
    documentIds: Types.ObjectId[],
    historyMessages: ChatMessage[],
  ): Promise<{ response: string; citations: string[] }> {
    let matchedChunks: any[] = []

    // Chỉ thực hiện tìm kiếm ngữ cảnh nếu có liên kết tài liệu
    if (documentIds && documentIds.length > 0) {
      // 1. Chuyển câu hỏi của sinh viên thành Vector
      const queryEmbeddings = await this.getEmbeddingsBatch([textContent])
      const queryVector = queryEmbeddings[0]

      // 2. Chạy song song Vector Search và Keyword Search
      let denseChunks: any[] = []
      let sparseChunks: any[] = []

      const densePromise = (async () => {
        try {
          const vectorSearchStage: Record<string, any> = {
            index: 'vector_index',
            path: 'embeddings',
            queryVector,
            numCandidates: 100,
            limit: 20, // Tăng giới hạn lấy ứng viên để phục vụ RRF
            filter: {
              documentId: { $in: documentIds },
            },
          }
          const results = await this.documentChunkModel.aggregate([{ $vectorSearch: vectorSearchStage } as any]).exec()
          this.logger.log(`Vector Search tìm thấy ${results.length} chunks tương đồng.`)
          return results
        } catch (error: any) {
          this.logger.warn(`Vector Search thất bại (có thể do môi trường Local không hỗ trợ): ${error.message}.`)
          return []
        }
      })()

      const sparsePromise = (async () => {
        try {
          // Thực hiện truy vấn tìm kiếm từ khóa sử dụng $text search của MongoDB
          const results = await this.documentChunkModel
            .find(
              {
                documentId: { $in: documentIds },
                $text: { $search: textContent },
              },
              {
                score: { $meta: 'textScore' },
              },
            )
            .sort({ score: { $meta: 'textScore' } })
            .limit(20) // Tăng giới hạn lấy ứng viên để phục vụ RRF
            .exec()
          this.logger.log(`Keyword Search tìm thấy ${results.length} chunks trùng khớp.`)
          return results
        } catch (error: any) {
          this.logger.warn(`Keyword Search ($text) thất bại hoặc chưa có index: ${error.message}.`)
          return []
        }
      })()

      const [denseResults, sparseResults] = await Promise.all([densePromise, sparsePromise])
      denseChunks = denseResults
      sparseChunks = sparseResults

      // 3. Thực hiện Re-ranking sử dụng thuật toán RRF
      matchedChunks = this.reciprocalRankFusion(denseChunks, sparseChunks, 8)
      this.logger.log(`Hoàn thành RRF Re-ranking. Đã chọn ra ${matchedChunks.length} chunks tốt nhất làm ngữ cảnh.`)

      // Fallback: Nếu không tìm thấy kết quả từ cả hai kênh tìm kiếm
      if (matchedChunks.length === 0) {
        this.logger.log(
          `Không tìm thấy chunks từ Hybrid Search, tiến hành tải chunks mặc định theo documentIds làm ngữ cảnh.`,
        )
        const queryFilter = { documentId: { $in: documentIds } }
        matchedChunks = await this.documentChunkModel.find(queryFilter).limit(3).exec()
      }
    }

    // 4. Lấy ngữ cảnh (Context) kèm số trang (pageNumber) hoặc loại tài liệu (sourceType)
    const contextSegments = matchedChunks.map((c, idx) => {
      const metadata = c.metadata || {}
      const sourceType = metadata.sourceType || 'pdf'
      if (sourceType === 'pdf') {
        return `[Đoạn ${idx + 1} - Trang ${metadata.pageNumber || 'không rõ'}]: ${c.extractedText}`
      } else if (sourceType === 'pptx') {
        return `[Đoạn ${idx + 1} - Slide ${metadata.pageNumber || 'không rõ'}]: ${c.extractedText}`
      } else {
        return `[Đoạn ${idx + 1} - Tài liệu ${sourceType.toUpperCase()}]: ${c.extractedText}`
      }
    })
    const context = contextSegments.join('\n\n')

    // Lấy danh sách số trang trích dẫn (citations) duy nhất dưới dạng chuỗi
    const citationsList = matchedChunks.map((c) => {
      const metadata = c.metadata || {}
      const sourceType = metadata.sourceType || 'pdf'
      if (sourceType === 'pdf') {
        return metadata.pageNumber ? `Trang ${metadata.pageNumber}` : 'Trang không rõ'
      } else if (sourceType === 'pptx') {
        return metadata.pageNumber ? `Slide ${metadata.pageNumber}` : 'Slide không rõ'
      } else {
        return `Tài liệu ${sourceType.toUpperCase()}`
      }
    })
    const uniqueCitations = Array.from(new Set(citationsList))

    // 5. Đóng gói Prompt gửi sang API AI (Gemini hoặc OpenAI)
    const maxHistoryMessages = 10
    const recentMessages = historyMessages.slice(-maxHistoryMessages)
    const conversationHistory = recentMessages
      .map((m) => `${m.sender === 'user' ? 'Sinh viên' : 'EduChat'}: ${m.textContent}`)
      .join('\n')

    const prompt = `Bạn là EduChat, một trợ lý AI hỗ trợ học tập thông minh. Dưới đây là thông tin ngữ cảnh được trích xuất từ tài liệu học tập của sinh viên. Hãy sử dụng thông tin này để trả lời câu hỏi một cách chính xác, khách quan và chi tiết nhất. Nếu ngữ cảnh không chứa đủ thông tin để trả lời, bạn hãy sử dụng kiến thức chung của mình để trả lời và bổ sung thêm, đồng thời nêu rõ là thông tin ngoài tài liệu nếu cần thiết.

Lịch sử cuộc hội thoại gần đây:
${conversationHistory || '(Chưa có cuộc hội thoại nào trước đó)'}

Ngữ cảnh tài liệu:
${context}

Câu hỏi hiện tại của sinh viên:
${textContent}

Hãy đưa ra câu trả lời chi tiết, dễ hiểu bằng tiếng Việt.
Ưu tiên trả lời trong 150–200 từ.
Nếu câu hỏi đơn giản, trả lời dưới 150 từ.
Nếu câu hỏi yêu cầu phân tích hoặc hướng dẫn, trả lời dưới 200 từ.
Nếu người dùng yêu cầu "chi tiết", "phân tích sâu", hoặc "giải thích đầy đủ", có thể mở rộng tối đa khoảng 400 từ.
Luôn tránh lặp ý và chỉ sử dụng thông tin liên quan trực tiếp đến câu hỏi.

Nếu không chắc chắn về câu trả lời, vui lòng trả lời: "Tôi không chắc chắn về thông tin này" và không bịa đặt.
`

    this.logger.log(`Gửi prompt sang AI API...`)
    const aiResponseText = await this.generateAIResponse(prompt)
    this.logger.log(`Đã nhận được câu trả lời từ AI.`)

    return { response: aiResponseText, citations: uniqueCitations }
  }

  /**
   * Thuật toán Reciprocal Rank Fusion (RRF) để gộp và sắp xếp lại các kết quả
   * từ Dense (Vector Search) và Sparse (Keyword Search)
   */
  private reciprocalRankFusion(denseList: any[], sparseList: any[], limit = 8, k = 60): any[] {
    const scores = new Map<string, { chunk: any; score: number }>()

    const addRrfScores = (list: any[]) => {
      list.forEach((chunk, index) => {
        const id = chunk._id ? chunk._id.toString() : index.toString()
        const rank = index + 1
        const rrfContribution = 1 / (k + rank)

        const existing = scores.get(id)
        if (existing) {
          existing.score += rrfContribution
        } else {
          scores.set(id, { chunk, score: rrfContribution })
        }
      })
    }

    addRrfScores(denseList)
    addRrfScores(sparseList)

    const sorted = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map((item) => item.chunk)

    return sorted.slice(0, limit)
  }

  async handleUserMessage(
    userId: string,
    sessionId: string,
    textContent: string,
    documentId?: string,
  ): Promise<ChatSession> {
    // 1. Kiểm tra sự tồn tại và quyền sở hữu của ChatSession
    const session = await this.chatSessionModel.findById(sessionId).exec()
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat này!')
    }
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập phiên chat này!')
    }

    // Nếu truyền thêm documentId, cập nhật tạm thời trong memory để phục vụ tìm kiếm Vector/Fallback
    if (documentId) {
      const docIdObj = new Types.ObjectId(documentId)
      const exists = session.documentIds.some((id) => id.toString() === docIdObj.toString())
      if (!exists) {
        session.documentIds.push(docIdObj)
      }
    }

    this.logger.log(`Bắt đầu xử lý tin nhắn cho session: ${sessionId}, câu hỏi: "${textContent}"`)

    try {
      const { response: aiResponseText, citations: uniqueCitations } = await this.getAIResponseForContext(
        textContent,
        session.documentIds,
        session.messages,
      )

      // 2. Lưu cuộc hội thoại bằng toán tử $push vào mảng messages
      const userMsg = {
        sender: 'user',
        textContent,
        citations: [],
        createdAt: new Date(),
      }

      const aiMsg = {
        sender: 'ai',
        textContent: aiResponseText,
        citations: uniqueCitations,
        createdAt: new Date(),
      }

      const updateQuery: any = {
        $push: {
          messages: {
            $each: [userMsg, aiMsg],
          },
        },
      }

      if (documentId) {
        const docIdObj = new Types.ObjectId(documentId)
        updateQuery.$addToSet = { documentIds: docIdObj }
      }

      const updatedSession = await this.chatSessionModel
        .findByIdAndUpdate(sessionId, updateQuery, { returnDocument: 'after' })
        .exec()

      if (!updatedSession) {
        throw new NotFoundException('Không thể lưu tin nhắn vào phiên chat!')
      }

      return updatedSession
    } catch (error: any) {
      this.logger.error(`Lỗi hệ thống khi xử lý tin nhắn của user: ${error.message}`, error.stack)

      // Lưu tin nhắn user và thông báo lỗi của AI vào DB để giữ hội thoại đồng nhất
      const userMsg = {
        sender: 'user',
        textContent,
        citations: [],
        createdAt: new Date(),
      }

      const aiMsg = {
        sender: 'ai',
        textContent: 'Đã có lỗi không mong muốn, vui lòng thử lại sau ít phút!!!',
        citations: [],
        createdAt: new Date(),
      }

      const updateQuery: any = {
        $push: {
          messages: {
            $each: [userMsg, aiMsg],
          },
        },
      }

      if (documentId) {
        const docIdObj = new Types.ObjectId(documentId)
        updateQuery.$addToSet = { documentIds: docIdObj }
      }

      const updatedSession = await this.chatSessionModel
        .findByIdAndUpdate(sessionId, updateQuery, { returnDocument: 'after' })
        .exec()

      if (!updatedSession) {
        throw new NotFoundException('Không thể lưu tin nhắn lỗi vào phiên chat!')
      }

      return updatedSession
    }
  }

  /**
   * Gọi API AI (Gemini hoặc OpenAI) sinh nội dung phản hồi
   */
  private async generateAIResponse(prompt: string): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

    try {
      if (geminiApiKey) {
        const response = await this.fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          },
        )

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Gemini API error: ${response.status} - ${errText}`)
        }

        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) {
          throw new Error('Cấu trúc phản hồi từ Gemini không chứa text hợp lệ.')
        }
        return text
      } else if (openaiApiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenAI API error: ${response.status} - ${errText}`)
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const text = data.choices?.[0]?.message?.content
        if (!text) {
          throw new Error('Cấu trúc phản hồi từ OpenAI không chứa content hợp lệ.')
        }
        return text
      } else {
        this.logger.warn('Không cấu hình GEMINI_API_KEY hay OPENAI_API_KEY. Trả về câu trả lời giả lập (Mock).')
        return `[Mock AI Response] Đây là câu trả lời giả lập cho câu hỏi của bạn. Hệ thống chưa được cấu hình API Key. Ngữ cảnh của bạn có chứa các trang trích dẫn.`
      }
    } catch (error: any) {
      this.logger.error(`Lỗi trong quá trình gọi AI API: ${error.message}`, error.stack)
      return 'Đã có lỗi không mong muốn, vui lòng thử lại sau ít phút!!!'
    }
  }

  /**
   * Helper thực hiện cuộc gọi HTTP với cơ chế retry khi gặp lỗi 503
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delays = [2000, 4000, 6000],
  ): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, options)
        if (response.status === 503 && i < retries) {
          const delay = delays[i]
          this.logger.warn(`Gemini API trả về lỗi 503. Tiến hành thử lại lần thứ ${i + 1} sau ${delay / 1000}s...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        return response
      } catch (error: any) {
        if (i < retries) {
          const delay = delays[i]
          this.logger.warn(
            `Lỗi kết nối Gemini API (${error.message}). Tiến hành thử lại lần thứ ${i + 1} sau ${delay / 1000}s...`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
    throw new Error('Đã thử lại tối đa 3 lần với Gemini API nhưng vẫn thất bại.')
  }

  /**
   * Trích xuất văn bản, chunking theo heading, tạo vector nhúng (embeddings) và lưu vào database.
   * Sử dụng chiến lược: chia theo heading → nếu chunk > 500 tokens thì split với overlap 75 tokens.
   */
  async processDocument(
    documentId: string,
    versionNumber: number,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<void> {
    try {
      this.logger.log(`Bắt đầu xử lý trích xuất văn bản cho documentId: ${documentId}, version: ${versionNumber}`)

      // 1. Trích xuất văn bản kèm heading markers sử dụng DocumentParserService
      const parsedDoc = await this.documentParserService.parseDocumentWithHeadings(fileBuffer, fileName)
      this.logger.log(`Đã trích xuất thành công văn bản kèm heading markers từ tệp.`)

      // 2. Chunking theo heading sử dụng DocumentChunkerService (max 500 tokens, overlap 75)
      const chunks = this.documentChunkerService.chunkDocument(
        parsedDoc.fullTextWithHeadings,
        parsedDoc.pageBreaks,
        500,
        75,
      )

      if (chunks.length === 0) {
        this.logger.warn(`Không tìm thấy văn bản nào để chunking trong tài liệu này.`)
        return
      }

      this.logger.log(`Tổng cộng tạo được ${chunks.length} chunks theo heading. Bắt đầu lấy embeddings...`)

      // 3. Lấy Vector Embeddings theo lô (Batch)
      const texts = chunks.map((c) => c.text)
      const embeddings = await this.getEmbeddingsBatch(texts)

      // 4. Tiến hành lưu hàng loạt (Bulk Write) vào collection document_chunks
      const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      const sourceType = ext.startsWith('.') ? ext.substring(1) : ext

      const operations = chunks.map((chunk, idx) => ({
        insertOne: {
          document: {
            documentId: new Types.ObjectId(documentId),
            versionNumber,
            extractedText: chunk.text,
            embeddings: embeddings[idx],
            metadata: {
              pageNumber: chunk.pageNumber,
              heading: chunk.headingContext || undefined,
              sourceType,
            },
          },
        },
      }))

      await this.documentChunkModel.bulkWrite(operations)
      this.logger.log(`Hoàn tất lưu hàng loạt (Bulk Write) ${chunks.length} chunks cho documentId: ${documentId}`)
    } catch (error: any) {
      this.logger.error(`Lỗi trong quá trình xử lý nền tài liệu ${documentId}: ${error.message}`, error.stack)
    }
  }

  /**
   * Lấy vector embeddings theo Batch dùng Gemini (Google AI Studio) hoặc OpenAI
   */
  private async getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const geminiApiKey = process.env.GEMINI_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY

    try {
      if (geminiApiKey) {
        const batchSize = 50
        const allEmbeddings: number[][] = []

        for (let i = 0; i < texts.length; i += batchSize) {
          const batchTexts = texts.slice(i, i + batchSize)
          this.logger.log(
            `Đang gọi Gemini Embedding API cho lô ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batchTexts.length} chunks)...`,
          )

          const response = await this.fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:batchEmbedContents?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requests: batchTexts.map((text) => ({
                  model: 'models/gemini-embedding-001',
                  output_dimensionality: 1536,
                  content: { parts: [{ text }] },
                })),
              }),
            },
          )

          if (!response.ok) {
            const errText = await response.text()
            throw new Error(`Gemini Batch API error: ${response.status} - ${errText}`)
          }

          const data = (await response.json()) as { embeddings: Array<{ values: number[] }> }
          allEmbeddings.push(...data.embeddings.map((emb) => emb.values))
        }

        return allEmbeddings
      } else if (openaiApiKey) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            input: texts,
            model: 'text-embedding-3-small',
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenAI API error: ${response.status} - ${errText}`)
        }

        const data = (await response.json()) as { data: Array<{ index: number; embedding: number[] }> }
        const sortedData = data.data.sort((a, b) => a.index - b.index)
        return sortedData.map((d) => d.embedding)
      } else {
        throw new BadRequestException(
          'Không cấu hình GEMINI_API_KEY hay OPENAI_API_KEY. Vui lòng cấu hình khóa để tạo embeddings.',
        )
      }
    } catch (error: any) {
      this.logger.error(`Lỗi khi lấy embeddings từ AI API: ${error.message}`)
      throw error
    }
  }

  /**
   * Đổi tên một phiên chat
   */
  async renameChatSession(userId: string, id: string, title: string): Promise<ChatSession> {
    const session = await this.chatSessionModel.findById(id).exec()
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat này!')
    }
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa phiên chat này!')
    }
    session.sessionTitle = title
    return await session.save()
  }

  /**
   * Ghim / Bỏ ghim phiên chat
   */
  async pinChatSession(userId: string, id: string, isPinned: boolean): Promise<ChatSession> {
    const session = await this.chatSessionModel.findById(id).exec()
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat này!')
    }
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa phiên chat này!')
    }
    session.isPinned = isPinned
    return await session.save()
  }

  /**
   * Lưu trữ / Hủy lưu trữ phiên chat
   */
  async archiveChatSession(userId: string, id: string, isArchived: boolean): Promise<ChatSession> {
    const session = await this.chatSessionModel.findById(id).exec()
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat này!')
    }
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa phiên chat này!')
    }
    session.isArchived = isArchived
    return await session.save()
  }

  /**
   * Xóa hoàn toàn phiên chat
   */
  async deleteChatSession(userId: string, id: string): Promise<{ message: string }> {
    const session = await this.chatSessionModel.findById(id).exec()
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat này!')
    }
    if (session.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa phiên chat này!')
    }
    await this.chatSessionModel.findByIdAndDelete(id).exec()
    return { message: 'Xóa phiên chat thành công!' }
  }
}
