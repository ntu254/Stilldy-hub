import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { ChatbotService } from './chatbot.service'
import { DocumentChunk } from './schemas/document-chunk.schema'
import { ChatSession } from './schemas/chat-session.schema'
import { DocumentParserService } from './document-parser.service'
import { DocumentChunkerService } from './document-chunker.service'
import { Types } from 'mongoose'
import { NotFoundException, ForbiddenException } from '@nestjs/common'

describe('ChatbotService - Error Handling', () => {
  let service: ChatbotService
  let chatSessionModel: any
  let documentChunkModel: any
  let documentParserService: any

  const mockSessionId = new Types.ObjectId().toString()
  const mockUserId = new Types.ObjectId().toString()

  // Define separate query exec functions
  const chatSessionExec = jest.fn()
  const documentChunkExec = jest.fn()

  const chatSessionQuery = {
    exec: chatSessionExec,
  }

  const documentChunkQuery = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: documentChunkExec,
  }

  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  beforeEach(async () => {
    const mockChatSessionModel = {
      findById: jest.fn(() => chatSessionQuery),
      findByIdAndUpdate: jest.fn(() => chatSessionQuery),
    }

    const mockDocumentChunkModel = {
      find: jest.fn(() => documentChunkQuery),
      aggregate: jest.fn(() => documentChunkQuery),
    }

    const mockDocumentParserService = {}

    const mockDocumentChunkerService = {
      countTokens: jest.fn((text: string) => text.split(/\s+/).length),
      splitByHeadings: jest.fn(() => []),
      splitSectionByTokens: jest.fn((text: string) => [text]),
      chunkDocument: jest.fn(() => []),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        {
          provide: getModelToken(DocumentChunk.name),
          useValue: mockDocumentChunkModel,
        },
        {
          provide: getModelToken(ChatSession.name),
          useValue: mockChatSessionModel,
        },
        {
          provide: DocumentParserService,
          useValue: mockDocumentParserService,
        },
        {
          provide: DocumentChunkerService,
          useValue: mockDocumentChunkerService,
        },
      ],
    }).compile()

    service = module.get<ChatbotService>(ChatbotService)
    chatSessionModel = module.get(getModelToken(ChatSession.name))
    documentChunkModel = module.get(getModelToken(DocumentChunk.name))
    documentParserService = module.get(DocumentParserService)

    // Reset mocks before each test
    jest.clearAllMocks()
    chatSessionExec.mockReset()
    documentChunkExec.mockReset()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleUserMessage', () => {
    it('should throw NotFoundException if session not found', async () => {
      chatSessionExec.mockResolvedValueOnce(null) // findById returns null

      await expect(service.handleUserMessage(mockUserId, mockSessionId, 'Hello')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user does not own session', async () => {
      const mockSession = {
        userId: new Types.ObjectId(), // Different user ID
        documentIds: [],
        messages: [],
      }
      chatSessionExec.mockResolvedValueOnce(mockSession)

      await expect(service.handleUserMessage(mockUserId, mockSessionId, 'Hello')).rejects.toThrow(ForbiddenException)
    })

    it('should catch AI API fetch errors, log them, and store the general error message as Chatbot response', async () => {
      // Mock session owned by the user
      const mockSession = {
        userId: new Types.ObjectId(mockUserId),
        documentIds: [new Types.ObjectId()],
        messages: [],
      }
      chatSessionExec.mockResolvedValueOnce(mockSession) // for findById

      // Mock getEmbeddingsBatch to succeed
      const spyGetEmbeddings = jest.spyOn(service as any, 'getEmbeddingsBatch').mockResolvedValue([[0.1, 0.2, 0.3]])

      // Set key to force generateAIResponse to call fetchWithRetry
      process.env.GEMINI_API_KEY = 'test-key'

      // Mock fetchWithRetry to reject for generateAIResponse
      const spyFetchWithRetry = jest
        .spyOn(service as any, 'fetchWithRetry')
        .mockRejectedValue(new Error('Gemini API quota exceeded'))

      // Mock DB find/aggregate
      documentChunkExec.mockResolvedValue([]) // fallback aggregate/find returns empty array

      // Mock findByIdAndUpdate to return updated session
      const mockUpdatedSession = {
        _id: mockSessionId,
        messages: [
          { sender: 'user', textContent: 'Hello' },
          { sender: 'ai', textContent: 'Đã có lỗi không mong muốn, vui lòng thử lại sau ít phút!!!' },
        ],
      }
      chatSessionExec.mockResolvedValueOnce(mockUpdatedSession) // for findByIdAndUpdate

      const result = await service.handleUserMessage(mockUserId, mockSessionId, 'Hello')

      expect(result).toBeDefined()
      expect(result.messages[1].textContent).toBe('Đã có lỗi không mong muốn, vui lòng thử lại sau ít phút!!!')
      expect(spyGetEmbeddings).toHaveBeenCalled()
      expect(spyFetchWithRetry).toHaveBeenCalled()

      spyGetEmbeddings.mockRestore()
      spyFetchWithRetry.mockRestore()
    })

    it('should catch critical pipeline errors (like embedding failure) and store user query + general error message in DB', async () => {
      const mockSession = {
        userId: new Types.ObjectId(mockUserId),
        documentIds: [new Types.ObjectId()],
        messages: [],
      }
      chatSessionExec.mockResolvedValueOnce(mockSession) // for findById

      // Mock getEmbeddingsBatch call error (e.g. no api keys configured and throws BadRequestException)
      delete process.env.GEMINI_API_KEY
      delete process.env.OPENAI_API_KEY

      // Mock findByIdAndUpdate to return updated session with error messages
      const mockUpdatedSession = {
        _id: mockSessionId,
        messages: [
          { sender: 'user', textContent: 'Hello' },
          { sender: 'ai', textContent: 'Đã có lỗi không mong muốn, vui lòng thử lại sau ít phút!!!' },
        ],
      }
      chatSessionExec.mockResolvedValueOnce(mockUpdatedSession) // for findByIdAndUpdate

      const result = await service.handleUserMessage(mockUserId, mockSessionId, 'Hello')

      expect(result).toBeDefined()
      expect(result.messages[1].textContent).toBe('Đã có lỗi không mong muốn, vui lòng thử lại sau ít phút!!!')
      expect(chatSessionModel.findByIdAndUpdate).toHaveBeenCalled()
    })

    it('should include conversation history from session.messages in the prompt', async () => {
      // Setup session with some prior messages
      const mockSession = {
        userId: new Types.ObjectId(mockUserId),
        documentIds: [new Types.ObjectId()],
        messages: [
          { sender: 'user', textContent: 'Hello Chatbot', createdAt: new Date() },
          { sender: 'ai', textContent: 'Hello student, how can I help you?', createdAt: new Date() },
        ],
      }
      chatSessionExec.mockResolvedValueOnce(mockSession) // for findById

      // Mock getEmbeddingsBatch
      const spyGetEmbeddings = jest.spyOn(service as any, 'getEmbeddingsBatch').mockResolvedValue([[0.1, 0.2, 0.3]])

      // Mock generateAIResponse to see the prompt passed to it
      const spyGenerateAIResponse = jest.spyOn(service as any, 'generateAIResponse').mockResolvedValue('Mock AI reply')

      // Mock DB find/aggregate
      documentChunkExec.mockResolvedValue([])

      // Mock findByIdAndUpdate to return updated session
      const mockUpdatedSession = {
        _id: mockSessionId,
        messages: [
          ...mockSession.messages,
          { sender: 'user', textContent: 'Tell me more' },
          { sender: 'ai', textContent: 'Mock AI reply' },
        ],
      }
      chatSessionExec.mockResolvedValueOnce(mockUpdatedSession) // for findByIdAndUpdate

      const result = await service.handleUserMessage(mockUserId, mockSessionId, 'Tell me more')

      expect(result).toBeDefined()
      expect(spyGenerateAIResponse).toHaveBeenCalled()

      const promptPassed = spyGenerateAIResponse.mock.calls[0][0]
      expect(promptPassed).toContain('Sinh viên: Hello Chatbot')
      expect(promptPassed).toContain('EduChat: Hello student, how can I help you?')
      expect(promptPassed).toContain('Câu hỏi hiện tại của sinh viên:\nTell me more')

      spyGetEmbeddings.mockRestore()
      spyGenerateAIResponse.mockRestore()
    })
  })

  describe('reciprocalRankFusion', () => {
    it('should correctly merge and rank items from dense and sparse lists', () => {
      const denseList = [
        { _id: 'chunk1', extractedText: 'A' },
        { _id: 'chunk2', extractedText: 'B' },
      ]
      const sparseList = [
        { _id: 'chunk2', extractedText: 'B' },
        { _id: 'chunk3', extractedText: 'C' },
      ]

      const results = (service as any).reciprocalRankFusion(denseList, sparseList, 3, 60)

      // Expected calculation:
      // chunk1 rank in dense = 1, rank in sparse = undefined. Score = 1 / (60 + 1) + 0 = 1 / 61 = 0.016393
      // chunk2 rank in dense = 2, rank in sparse = 1. Score = 1 / (60 + 2) + 1 / (60 + 1) = 1 / 62 + 1 / 61 = 0.016129 + 0.016393 = 0.032522
      // chunk3 rank in dense = undefined, rank in sparse = 2. Score = 0 + 1 / (60 + 2) = 1 / 62 = 0.016129
      // Ranking order: chunk2 > chunk1 > chunk3
      expect(results).toHaveLength(3)
      expect(results[0]._id).toBe('chunk2')
      expect(results[1]._id).toBe('chunk1')
      expect(results[2]._id).toBe('chunk3')
    })
  })
})
