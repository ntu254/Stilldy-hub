import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Body,
  Param,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiSecurity } from '@nestjs/swagger'
import { FlashcardsService } from './flashcards.service'
import { CreateFlashcardDto } from './dto/create-flashcard.dto'
import { UpdateFlashcardDto } from './dto/update-flashcard.dto'
import { UpdateCardDto } from './dto/update-card.dto'
import { QueryFlashcardDto } from './dto/query-flashcard.dto'
import { User, type UserInfo } from '../../common/decorators/user.decorator'
import { OptionalAuthGuard } from '../auth/optional-auth.guard'

@ApiTags('Flashcards Workspace')
@ApiBearerAuth('accessToken')
@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  // ─── POST /flashcards ─────────────────────────────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'Tạo bộ thẻ ghi nhớ mới',
    description: 'Tạo một FlashcardCollection mới. createdBy được tự động gán từ token đăng nhập.',
  })
  create(@Body() dto: CreateFlashcardDto, @User() user: UserInfo) {
    return this.flashcardsService.create(user.userID, dto)
  }

  // ─── GET /flashcards/my-collections ─────────────────────────────────────
  @Get('my-collections')
  @ApiOperation({
    summary: 'Lấy danh sách bộ thẻ của tôi',
    description: 'Trả về danh sách các bộ thẻ do chính user đăng nhập tạo, hỗ trợ tìm kiếm mờ và phân trang.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm mờ theo tiêu đề bộ thẻ' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'title', 'viewCount'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findMyCollections(@Query() query: QueryFlashcardDto, @User() user: UserInfo) {
    return this.flashcardsService.findMyCollections(user.userID, query)
  }

  // ─── GET /flashcards/public ───────────────────────────────────────────────
  // PHẢI đặt TRƯỚC /:id để NestJS không treat "public" như một ObjectId param
  @Get('public')
  @UseGuards(OptionalAuthGuard)
  @ApiSecurity('accessToken') // optional, không bắt buộc có token
  @ApiOperation({
    summary: 'Lấy danh sách tất cả bộ thẻ công khai',
    description:
      'Trả về các bộ thẻ có isPublic = true, hỗ trợ tìm kiếm, phân trang và sắp xếp. ' +
      'Không cần đăng nhập. Nếu có token hợp lệ, response sẽ bổ sung trường isOwner.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm mờ theo tiêu đề bộ thẻ' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'title', 'viewCount'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findPublicCollections(@Query() query: QueryFlashcardDto, @User() user: UserInfo) {
    return this.flashcardsService.findPublicCollections(query, user?.userID)
  }

  // ─── GET /flashcards/:id ──────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết một bộ thẻ',
    description:
      'Trả về toàn bộ thông tin bộ thẻ bao gồm mảng cards bên trong. ' +
      'Nếu bộ thẻ là Private và người dùng không phải tác giả sẽ nhận lỗi 403 Forbidden.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection' })
  findOne(@Param('id') id: string, @User() user: UserInfo) {
    return this.flashcardsService.findOne(id, user.userID)
  }

  // ─── PUT /flashcards/:id ──────────────────────────────────────────────────
  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật toàn bộ bộ thẻ (chỉ tác giả)',
    description:
      'Cho phép tác giả cập nhật tiêu đề, mô tả, trạng thái công khai và toàn bộ mảng thẻ con. ' +
      'Mảng cards sẽ được thay thế hoàn toàn bởi danh sách mới nếu được truyền vào.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection cần cập nhật' })
  update(@Param('id') id: string, @Body() dto: UpdateFlashcardDto, @User() user: UserInfo) {
    return this.flashcardsService.update(id, user.userID, dto)
  }

  // ─── GET /flashcards/:id/cards/:cardId ─────────────────────────────────────
  @Get(':id/cards/:cardId')
  @ApiOperation({
    summary: 'Lấy chi tiết một thẻ con',
    description:
      'Trả về thông tin đầy đủ (term, definition, _id) của đúng thẻ con có cardId. ' +
      'Bộ thẻ phải public hoặc user là tác giả. Chỉ tác giả mới thấy trường markedBy.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection' })
  @ApiParam({ name: 'cardId', description: 'ID của CardItem cần xem' })
  findOneCard(@Param('id') id: string, @Param('cardId') cardId: string, @User() user: UserInfo) {
    return this.flashcardsService.findOneCard(id, cardId, user.userID)
  }

  // ─── PATCH /flashcards/:id/cards/:cardId ─────────────────────────────────
  @Patch(':id/cards/:cardId')
  @ApiOperation({
    summary: 'Cập nhật nội dung một thẻ con đơn lẻ (chỉ tác giả)',
    description:
      'Chỉ cập nhật term/definition của đúng thẻ con có cardId. ' +
      'Các thẻ còn lại trong bộ thẻ giữ nguyên hoàn toàn. ' +
      'Dùng khi frontend muốn inline-edit một thẻ mà không gửi lại toàn bộ mảng.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection' })
  @ApiParam({ name: 'cardId', description: 'ID của CardItem cần sửa' })
  @ApiBody({ type: UpdateCardDto })
  updateCard(
    @Param('id') id: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
    @User() user: UserInfo,
  ) {
    return this.flashcardsService.updateCard(id, cardId, user.userID, dto.term, dto.definition)
  }

  // ─── DELETE /flashcards/:id/cards/:cardId ────────────────────────────────
  @Delete(':id/cards/:cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa một thẻ con khỏi bộ thẻ (chỉ tác giả)',
    description:
      'Xóa vĩnh viễn thẻ con có cardId khỏi mảng cards của bộ thẻ. ' +
      'Dùng khi người dùng muốn loại bỏ hẳn một thẻ, không thể hoàn tác.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection' })
  @ApiParam({ name: 'cardId', description: 'ID của CardItem cần xóa' })
  removeCard(@Param('id') id: string, @Param('cardId') cardId: string, @User() user: UserInfo) {
    return this.flashcardsService.removeCard(id, cardId, user.userID)
  }

  // ─── PATCH /flashcards/:id/cards/:cardId/mark ─────────────────────────────
  @Patch(':id/cards/:cardId/mark')
  @ApiOperation({
    summary: 'Đánh dấu / Hủy đánh dấu thẻ con (Toggle Star)',
    description:
      'Bấm một lần để đánh dấu thẻ (thêm userId vào markedBy bằng $addToSet). ' +
      'Bấm lần nữa để hủy đánh dấu (kéo userId khỏi markedBy bằng $pull). ' +
      'Phản hồi trả về trạng thái mới của thẻ: { marked: boolean }.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection' })
  @ApiParam({ name: 'cardId', description: 'ID của CardItem (thẻ con)' })
  toggleMarkCard(@Param('id') id: string, @Param('cardId') cardId: string, @User() user: UserInfo) {
    return this.flashcardsService.toggleMarkCard(id, cardId, user.userID)
  }

  // ─── PATCH /flashcards/:id/cards/:cardId/status ───────────────────────────
  @Patch(':id/cards/:cardId/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái "Đã biết" của thẻ con',
    description:
      'Lưu hoặc xóa trạng thái mastered của thẻ con. Nhận payload { isMastered: boolean }. ' +
      'Nếu true, thêm userId vào masteredBy. Nếu false, xóa userId khỏi masteredBy.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection' })
  @ApiParam({ name: 'cardId', description: 'ID của CardItem (thẻ con)' })
  @ApiBody({ schema: { properties: { isMastered: { type: 'boolean' } } } })
  updateCardStatus(
    @Param('id') id: string,
    @Param('cardId') cardId: string,
    @Body('isMastered') isMastered: boolean,
    @User() user: UserInfo,
  ) {
    return this.flashcardsService.updateCardStatus(id, cardId, user.userID, isMastered)
  }

  // ─── PUT /flashcards/:id/reset-progress ───────────────────────────────────
  @Put(':id/reset-progress')
  @ApiOperation({
    summary: 'Đặt lại toàn bộ tiến độ học tập',
    description: 'Xóa tiến độ (masteredBy) của user khỏi tất cả các thẻ trong bộ thẻ.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection' })
  resetProgress(@Param('id') id: string, @User() user: UserInfo) {
    return this.flashcardsService.resetProgress(id, user.userID)
  }

  // ─── DELETE /flashcards/:id (Soft Delete) ─────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa mềm bộ thẻ (chỉ tác giả)',
    description:
      'Đánh dấu bộ thẻ là đã xóa (isDeleted = true, deletedAt = now). ' +
      'Dữ liệu vẫn tồn tại trong DB và có thể khôi phục bằng PATCH /:id/restore.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection cần xóa mềm' })
  remove(@Param('id') id: string, @User() user: UserInfo) {
    return this.flashcardsService.remove(id, user.userID)
  }

  // ─── PATCH /flashcards/:id/restore ────────────────────────────────────────
  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Khôi phục bộ thẻ đã xóa mềm (chỉ tác giả)',
    description: 'Đặt lại isDeleted = false và xóa deletedAt để bộ thẻ hiển thị trở lại.',
  })
  @ApiParam({ name: 'id', description: 'ID của FlashcardCollection cần khôi phục' })
  restore(@Param('id') id: string, @User() user: UserInfo) {
    return this.flashcardsService.restore(id, user.userID)
  }
}
