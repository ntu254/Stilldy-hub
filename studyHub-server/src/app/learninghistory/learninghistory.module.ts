import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PaginationUtilModule } from '../../common/utils/pagination-util/pagination-util.module'
import { LearningHistoryController } from './learninghistory.controller'
import { LearningHistoryService } from './learninghistory.service'
import { LearningHistory, LearningHistorySchema } from './schemas/learning-history.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LearningHistory.name, schema: LearningHistorySchema }]),
    PaginationUtilModule,
  ],
  controllers: [LearningHistoryController],
  providers: [LearningHistoryService],
  exports: [LearningHistoryService],
})
export class LearningHistoryModule {}
