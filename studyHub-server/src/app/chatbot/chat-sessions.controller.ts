import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger'
import { ChatbotService } from './chatbot.service'
import { CreateChatSessionDto } from './dto/create-chat-session.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { User, type UserInfo } from '../../common/decorators/user.decorator'

@ApiTags('Chat Sessions Workspace')
@ApiBearerAuth('accessToken')
@Controller('chat-sessions')
export class ChatSessionsController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  @ApiOperation({ summary: 'Khởi tạo phiên chat mới' })
  @ApiBody({ type: CreateChatSessionDto })
  async create(@User() user: UserInfo, @Body() dto: CreateChatSessionDto) {
    return await this.chatbotService.createChatSession(user.userID, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả phiên chat của sinh viên hiện tại' })
  @ApiQuery({
    name: 'archived',
    required: false,
    type: Boolean,
    description: 'Lấy các phiên chat đã lưu trữ (true) hoặc chưa lưu trữ (false)',
  })
  async findAll(@User() user: UserInfo, @Query('archived') archived?: string) {
    const isArchived = archived === 'true'
    return await this.chatbotService.getChatSessionsByUser(user.userID, isArchived)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết của một phiên chat kèm lịch sử hội thoại (messages)' })
  async findOne(@User() user: UserInfo, @Param('id') id: string) {
    return await this.chatbotService.getChatSessionDetail(user.userID, id)
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi câu hỏi của sinh viên vào phiên chat, kích hoạt RAG và phản hồi từ AI' })
  @ApiBody({ type: SendMessageDto })
  async sendMessage(@User() user: UserInfo, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return await this.chatbotService.handleUserMessage(user.userID, id, dto.textContent, dto.documentId)
  }

  @Patch(':id/rename')
  @ApiOperation({ summary: 'Đổi tên phiên chat' })
  @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } })
  async rename(@User() user: UserInfo, @Param('id') id: string, @Body('title') title: string) {
    return await this.chatbotService.renameChatSession(user.userID, id, title)
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Ghim / Bỏ ghim phiên chat' })
  @ApiBody({ schema: { type: 'object', properties: { isPinned: { type: 'boolean' } }, required: ['isPinned'] } })
  async pin(@User() user: UserInfo, @Param('id') id: string, @Body('isPinned') isPinned: boolean) {
    return await this.chatbotService.pinChatSession(user.userID, id, isPinned)
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Lưu trữ / Hủy lưu trữ phiên chat' })
  @ApiBody({ schema: { type: 'object', properties: { isArchived: { type: 'boolean' } }, required: ['isArchived'] } })
  async archive(@User() user: UserInfo, @Param('id') id: string, @Body('isArchived') isArchived: boolean) {
    return await this.chatbotService.archiveChatSession(user.userID, id, isArchived)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiên chat' })
  async remove(@User() user: UserInfo, @Param('id') id: string) {
    return await this.chatbotService.deleteChatSession(user.userID, id)
  }
}
