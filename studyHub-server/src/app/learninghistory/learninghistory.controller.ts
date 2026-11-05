import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common'
import { LearningHistoryService } from './learninghistory.service'
import { RecordLearningDto } from './dto/record-learning.dto'
import { QueryLearningHistoryDto } from './dto/query-learning-history.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { User } from '../../common/decorators/user.decorator'
import type { UserInfo } from '../../common/decorators/user.decorator'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('Learning History')
@ApiBearerAuth('accessToken')
@Controller('learning-stats')
export class LearningHistoryController {
  constructor(private readonly learningHistoryService: LearningHistoryService) {}

  @Post('record')
  @Roles()
  @ApiOperation({ summary: 'Ghi nhận kết quả bài Kiểm tra' })
  recordResult(@User() user: UserInfo, @Body() dto: RecordLearningDto) {
    return this.learningHistoryService.record(user.userID, dto)
  }
  @Get('flashcard/:flashcardId')
  @Roles()
  @ApiOperation({ summary: 'Lấy lịch sử bài kiểm tra theo bộ thẻ' })
  getHistoryByFlashcard(
    @User() user: UserInfo,
    @Param('flashcardId') flashcardId: string,
    @Query() query: QueryLearningHistoryDto,
  ) {
    return this.learningHistoryService.getHistoryByFlashcard(user.userID, flashcardId, query)
  }

  @Get('history/:historyId')
  @Roles()
  @ApiOperation({ summary: 'Xem lại chi tiết một bài làm cũ (lịch sử kiểm tra)' })
  getHistoryById(@User() user: UserInfo, @Param('historyId') historyId: string) {
    return this.learningHistoryService.getHistoryById(user.userID, historyId)
  }
}
