import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { FlashcardsController } from './flashcards.controller'
import { FlashcardsService } from './flashcards.service'
import { FlashcardCollection, FlashcardSchema } from './schemas/flashcard.schema'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FlashcardCollection.name, schema: FlashcardSchema }]),
    AuthModule,
    UsersModule,
  ],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
