import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { LearningHistory, LearningHistoryDocument } from './schemas/learning-history.schema'
import { RecordLearningDto } from './dto/record-learning.dto'
import { QueryLearningHistoryDto } from './dto/query-learning-history.dto'
import { PaginationUtilService } from '../../common/utils/pagination-util/pagination-util.service'

@Injectable()
export class LearningHistoryService {
  constructor(
    @InjectModel(LearningHistory.name)
    private readonly learningHistoryModel: Model<LearningHistoryDocument>,
    private readonly paginationService: PaginationUtilService,
  ) {}

  async record(userId: string, dto: RecordLearningDto) {
    const data = {
      ...dto,
      userId: new Types.ObjectId(userId),
      flashcardId: new Types.ObjectId(dto.flashcardId),
      mode: dto.mode || 'TEST',
    }
    return new this.learningHistoryModel(data).save()
  }
  async getHistoryByFlashcard(userId: string, flashcardId: string, query: QueryLearningHistoryDto) {
    const { page, limit, sortBy, sortOrder, mode, minScore, maxScore } = query

    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
      flashcardId: new Types.ObjectId(flashcardId),
    }

    if (mode) {
      filter.mode = mode
    } else {
      filter.mode = 'TEST' // Mặc định nếu không truyền
    }

    if (minScore !== undefined || maxScore !== undefined) {
      filter.score = {}
      if (minScore !== undefined) filter.score.$gte = minScore
      if (maxScore !== undefined) filter.score.$lte = maxScore
    }

    const totalItems = await this.learningHistoryModel.countDocuments(filter)

    const paginator = this.paginationService.paging({
      page,
      itemPerPage: limit,
      totalItems,
    })

    const sortObj: Record<string, any> = {}
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1

    const list = await this.learningHistoryModel
      .find(filter)
      .sort(sortObj)
      .skip(paginator.skip)
      .limit(paginator.itemPerPage)
      .exec()

    return paginator.format(list)
  }

  async getHistoryById(userId: string, historyId: string) {
    const history = await this.learningHistoryModel
      .findOne({
        _id: new Types.ObjectId(historyId),
        userId: new Types.ObjectId(userId),
      })
      .exec()

    if (!history) {
      throw new NotFoundException('Không tìm thấy lịch sử bài làm này hoặc bạn không có quyền truy cập')
    }

    return history
  }
}
