import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, SortOrder, Types } from 'mongoose'
import { FlashcardCollection, FlashcardDocument, CardItem } from './schemas/flashcard.schema'
import { CreateFlashcardDto } from './dto/create-flashcard.dto'
import { UpdateFlashcardDto } from './dto/update-flashcard.dto'
import { QueryFlashcardDto } from './dto/query-flashcard.dto'
@Injectable()
export class FlashcardsService {
  constructor(
    @InjectModel(FlashcardCollection.name)
    private readonly flashcardModel: Model<FlashcardDocument>,
  ) {}
  // ─── POST /flashcards ─────────────────────────────────────────────────────
  async create(userId: string, dto: CreateFlashcardDto): Promise<FlashcardDocument> {
    const created = new this.flashcardModel({
      title: dto.title,
      description: dto.description,
      isPublic: dto.isPublic ?? false,
      createdBy: new Types.ObjectId(userId),
      cards: dto.cards ?? [],
    })
    return created.save()
  }
  // ─── GET /flashcards/my-collections ─────────────────────────────────────
  async findMyCollections(userId: string, query: QueryFlashcardDto) {
    const { page, limit, search, sortBy, sortOrder } = query
    const filter: Record<string, unknown> = {
      createdBy: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    }
    // Tìm kiếm mờ dựa trên Text Index của trường title
    if (search) {
      filter.$text = { $search: search }
    }
    const skip = (page - 1) * limit
    const sortValue = sortOrder === 'asc' ? 1 : -1
    const sortObj: Record<string, SortOrder> = { [sortBy]: sortValue }
    const [data, total] = await Promise.all([
      this.flashcardModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'displayName email avatar')
        .select('-cards.markedBy -cards.masteredBy') // Loại bỏ mảng markedBy và masteredBy chi tiết trong danh sách
        .lean()
        .exec(),
      this.flashcardModel.countDocuments(filter),
    ])
    // Bổ sung trường totalCards phục vụ UI List
    const mappedData = data.map((col) => ({
      ...col,
      totalCards: Array.isArray(col.cards) ? col.cards.length : 0,
    }))
    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // ─── GET /flashcards/public ───────────────────────────────────────────────
  async findPublicCollections(query: QueryFlashcardDto, currentUserId?: string) {
    const { page, limit, search, sortBy, sortOrder } = query
    const filter: Record<string, unknown> = {
      isPublic: true,
      isDeleted: { $ne: true },
    }
    if (search) {
      filter.$text = { $search: search }
    }
    const skip = (page - 1) * limit
    const sortValue = sortOrder === 'asc' ? 1 : -1
    const sortObj: Record<string, SortOrder> = { [sortBy]: sortValue }
    const [data, total] = await Promise.all([
      this.flashcardModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'displayName email avatar')
        .select('-cards.markedBy -cards.masteredBy')
        .lean()
        .exec(),
      this.flashcardModel.countDocuments(filter),
    ])
    const mappedData = data.map((col) => ({
      ...col,
      totalCards: Array.isArray(col.cards) ? col.cards.length : 0,
      // Tiện cho UI biết user hiện tại có phải chủ thẻ không
      isOwner: currentUserId ? col.createdBy?.toString() === currentUserId : false,
    }))
    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // ─── GET /flashcards/:id/cards/:cardId ────────────────────────────────────
  async findOneCard(collectionId: string, cardId: string, currentUserId: string): Promise<CardItem & { _id: unknown }> {
    const col = await this.flashcardModel.findOne({ _id: collectionId, isDeleted: { $ne: true } }).exec()
    if (!col) throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')

    // Kiểm tra quyền truy cập: public hoặc là tác giả
    const isOwner = col.createdBy.toString() === currentUserId
    if (!col.isPublic && !isOwner) {
      throw new ForbiddenException('Bạn không có quyền xem bộ thẻ riêng tư này.')
    }
    const card = col.cards.find((c) => (c as any)._id?.toString() === cardId)
    if (!card) throw new NotFoundException('Không tìm thấy thẻ con với ID đã cung cấp.')

    // Trả về đúng thẻ kèm _id, ẩn markedBy và masteredBy trừ chủ thẻ
    const cardObj = (card as any).toObject ? (card as any).toObject() : { ...card }
    if (!isOwner) {
      delete cardObj.markedBy
      delete cardObj.masteredBy
    }
    return cardObj
  }

  // ─── GET /flashcards/:id ──────────────────────────────────────────────────
  async findOne(collectionId: string, currentUserId: string): Promise<FlashcardDocument> {
    const col = await this.flashcardModel
      .findOne({ _id: collectionId, isDeleted: { $ne: true } })
      .populate('createdBy', 'displayName email avatar')
      .exec()
    if (!col) {
      throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    }
    // Bảo mật: Nếu bộ thẻ private và người dùng không phải tác giả → 403
    // col.createdBy đã được populate → là User object, phải lấy ._id để so sánh
    const createdById = (col.createdBy as any)?._id ?? col.createdBy
    const isOwner = createdById.toString() === currentUserId
    if (!col.isPublic && !isOwner) {
      throw new ForbiddenException('Bạn không có quyền xem bộ thẻ riêng tư này.')
    }
    // Tăng viewCount bất đồng bộ, không chặn response
    void this.flashcardModel.findByIdAndUpdate(collectionId, { $inc: { viewCount: 1 } }).exec()
    return col
  }
  // ─── PUT /flashcards/:id ──────────────────────────────────────────────────
  async update(collectionId: string, currentUserId: string, dto: UpdateFlashcardDto): Promise<FlashcardDocument> {
    const col = await this.flashcardModel.findById(collectionId).exec()
    if (!col) {
      throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    }
    // Chỉ tác giả mới được phép chỉnh sửa
    if (col.createdBy.toString() !== currentUserId) {
      throw new ForbiddenException('Chỉ tác giả mới có quyền chỉnh sửa bộ thẻ này.')
    }
    const updatePayload: Record<string, unknown> = {}
    if (dto.title !== undefined) updatePayload.title = dto.title
    if (dto.description !== undefined) updatePayload.description = dto.description
    if (dto.isPublic !== undefined) updatePayload.isPublic = dto.isPublic
    if (dto.cards !== undefined) updatePayload.cards = dto.cards // Thay thế toàn bộ mảng thẻ con
    const updated = await this.flashcardModel
      .findByIdAndUpdate(collectionId, { $set: updatePayload }, { returnDocument: 'after', runValidators: true })
      .populate('createdBy', 'displayName email avatar')
      .exec()
    return updated!
  }
  // ─── PATCH /flashcards/:id/cards/:cardId ──────────────────────────────────
  // Cập nhật nội dung (term/definition) của MỘT thẻ con duy nhất, giữ nguyên các thẻ khác
  async updateCard(
    collectionId: string,
    cardId: string,
    currentUserId: string,
    term?: string,
    definition?: string,
  ): Promise<{ message: string }> {
    const col = await this.flashcardModel.findById(collectionId).exec()
    if (!col) throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    if (col.createdBy.toString() !== currentUserId) {
      throw new ForbiddenException('Chỉ tác giả mới có quyền chỉnh sửa thẻ này.')
    }
    const cardExists = col.cards.some((c) => (c as any)._id?.toString() === cardId)
    if (!cardExists) throw new NotFoundException('Không tìm thấy thẻ con với ID đã cung cấp.')

    // Xây dựng payload chỉ cập nhật các trường được truyền vào
    const setFields: Record<string, string> = {}
    if (term !== undefined) setFields['cards.$[card].term'] = term
    if (definition !== undefined) setFields['cards.$[card].definition'] = definition

    await this.flashcardModel.findByIdAndUpdate(
      collectionId,
      { $set: setFields },
      { arrayFilters: [{ 'card._id': new Types.ObjectId(cardId) }] },
    )
    return { message: 'Đã cập nhật thẻ thành công.' }
  }

  // ─── DELETE /flashcards/:id/cards/:cardId ─────────────────────────────────
  // Xóa vĩnh viễn một thẻ con khỏi mảng cards (chỉ tác giả)
  async removeCard(collectionId: string, cardId: string, currentUserId: string): Promise<{ message: string }> {
    const col = await this.flashcardModel.findOne({ _id: collectionId, isDeleted: { $ne: true } }).exec()
    if (!col) throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    if (col.createdBy.toString() !== currentUserId) {
      throw new ForbiddenException('Chỉ tác giả mới có quyền xóa thẻ này.')
    }
    const cardExists = col.cards.some((c) => (c as any)._id?.toString() === cardId)
    if (!cardExists) throw new NotFoundException('Không tìm thấy thẻ con với ID đã cung cấp.')

    // $pull kéo thẻ con ra khỏi mảng dựa trên _id
    await this.flashcardModel.findByIdAndUpdate(collectionId, {
      $pull: { cards: { _id: new Types.ObjectId(cardId) } },
    })
    return { message: 'Đã xóa thẻ thành công.' }
  }

  // ─── PATCH /flashcards/:id/cards/:cardId/mark ─────────────────────────────

  async toggleMarkCard(
    collectionId: string,
    cardId: string,
    currentUserId: string,
  ): Promise<{ marked: boolean; message: string }> {
    const col = await this.flashcardModel.findById(collectionId).exec()
    if (!col) {
      throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    }
    // Kiểm tra quyền truy cập (bộ thẻ phải public hoặc user là tác giả)
    const isOwner = col.createdBy.toString() === currentUserId
    if (!col.isPublic && !isOwner) {
      throw new ForbiddenException('Bạn không có quyền tương tác với bộ thẻ riêng tư này.')
    }
    // Tìm thẻ con tương ứng
    const card = col.cards.find((c) => (c as any)._id?.toString() === cardId)
    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ con với ID đã cung cấp.')
    }
    const userObjectId = new Types.ObjectId(currentUserId)
    const cardObjectId = new Types.ObjectId(cardId)
    // Kiểm tra user đã đánh dấu chưa
    const alreadyMarked = card.markedBy.some((uid) => uid.toString() === currentUserId)
    if (alreadyMarked) {
      // Hủy đánh dấu: kéo userId ra khỏi mảng markedBy
      await this.flashcardModel
        .findByIdAndUpdate(
          collectionId,
          {
            $pull: { 'cards.$[card].markedBy': userObjectId },
          },
          {
            arrayFilters: [{ 'card._id': cardObjectId }],
          },
        )
        .exec()
      return { marked: false, message: 'Đã hủy đánh dấu thẻ thành công.' }
    } else {
      // Đánh dấu: thêm userId vào mảng markedBy (dùng $addToSet tránh trùng lặp)
      await this.flashcardModel
        .findByIdAndUpdate(
          collectionId,
          {
            $addToSet: { 'cards.$[card].markedBy': userObjectId },
          },
          {
            arrayFilters: [{ 'card._id': cardObjectId }],
          },
        )
        .exec()
      return { marked: true, message: 'Đã đánh dấu thẻ thành công.' }
    }
  }

  // ─── PATCH /flashcards/:id/cards/:cardId/status ───────────────────────────
  async updateCardStatus(
    collectionId: string,
    cardId: string,
    currentUserId: string,
    isMastered: boolean,
  ): Promise<{ mastered: boolean; message: string }> {
    const col = await this.flashcardModel.findById(collectionId).exec()
    if (!col) {
      throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    }
    const card = col.cards.find((c) => (c as any)._id?.toString() === cardId)
    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ con với ID đã cung cấp.')
    }

    const userObjectId = new Types.ObjectId(currentUserId)
    const cardObjectId = new Types.ObjectId(cardId)

    if (isMastered) {
      await this.flashcardModel
        .findByIdAndUpdate(
          collectionId,
          { $addToSet: { 'cards.$[card].masteredBy': userObjectId } },
          { arrayFilters: [{ 'card._id': cardObjectId }] },
        )
        .exec()
      return { mastered: true, message: 'Đã đánh dấu thẻ là Đã biết.' }
    } else {
      await this.flashcardModel
        .findByIdAndUpdate(
          collectionId,
          { $pull: { 'cards.$[card].masteredBy': userObjectId } },
          { arrayFilters: [{ 'card._id': cardObjectId }] },
        )
        .exec()
      return { mastered: false, message: 'Đã bỏ đánh dấu thẻ Đã biết.' }
    }
  }

  // ─── PUT /flashcards/:id/reset-progress ───────────────────────────────────
  async resetProgress(collectionId: string, currentUserId: string): Promise<{ message: string }> {
    const col = await this.flashcardModel.findById(collectionId).exec()
    if (!col) {
      throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    }

    const userObjectId = new Types.ObjectId(currentUserId)

    // $pull from nested subdocument array using arrayFilters ($[elem] positional filtered)
    await this.flashcardModel
      .updateOne(
        { _id: col._id },
        { $pull: { 'cards.$[elem].masteredBy': userObjectId } },
        { arrayFilters: [{ 'elem._id': { $exists: true } }] },
      )
      .exec()

    return { message: 'Đã đặt lại tiến độ học tập thành công.' }
  }

  // ─── DELETE /flashcards/:id (Soft Delete) ────────────────────────────────
  async remove(collectionId: string, currentUserId: string): Promise<{ message: string }> {
    const col = await this.flashcardModel.findOne({ _id: collectionId, isDeleted: { $ne: true } }).exec()
    if (!col) {
      throw new NotFoundException('Không tìm thấy bộ thẻ ghi nhớ này.')
    }
    if (col.createdBy.toString() !== currentUserId) {
      throw new ForbiddenException('Chỉ tác giả mới có quyền xóa bộ thẻ này.')
    }
    await this.flashcardModel
      .findByIdAndUpdate(collectionId, {
        $set: { isDeleted: true, deletedAt: new Date() },
      })
      .exec()
    return { message: 'Đã xóa bộ thẻ ghi nhớ thành công.' }
  }

  // ─── PATCH /flashcards/:id/restore ────────────────────────────────────────
  async restore(collectionId: string, currentUserId: string): Promise<{ message: string }> {
    const col = await this.flashcardModel.findOne({ _id: collectionId, isDeleted: true }).exec()
    if (!col) {
      throw new NotFoundException('Không tìm thấy bộ thẻ đã xóa với ID này.')
    }
    if (col.createdBy.toString() !== currentUserId) {
      throw new ForbiddenException('Chỉ tác giả mới có quyền khôi phục bộ thẻ này.')
    }
    await this.flashcardModel
      .findByIdAndUpdate(collectionId, {
        $set: { isDeleted: false, deletedAt: null },
      })
      .exec()
    return { message: 'Đã khôi phục bộ thẻ ghi nhớ thành công.' }
  }
}
