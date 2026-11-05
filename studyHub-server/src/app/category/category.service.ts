import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Category, CategoryDocument } from './schemas/category.schema'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  async findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find({ _destroy: false }).sort({ name: 1 }).exec()
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ _id: id, _destroy: false }).exec()
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục')
    }
    return category
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const existing = await this.categoryModel.findOne({ name: dto.name, _destroy: false }).exec()
    if (existing) {
      throw new ConflictException('Tên danh mục đã tồn tại')
    }
    return this.categoryModel.create(dto)
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    if (dto.name) {
      const existing = await this.categoryModel.findOne({ name: dto.name, _id: { $ne: id }, _destroy: false }).exec()
      if (existing) {
        throw new ConflictException('Tên danh mục đã tồn tại')
      }
    }
    const updated = await this.categoryModel
      .findOneAndUpdate({ _id: id, _destroy: false }, dto, { returnDocument: 'after' })
      .exec()
    if (!updated) {
      throw new NotFoundException('Không tìm thấy danh mục')
    }
    return updated
  }

  async remove(id: string): Promise<void> {
    const updated = await this.categoryModel
      .findOneAndUpdate({ _id: id, _destroy: false }, { _destroy: true }, { returnDocument: 'after' })
      .exec()
    if (!updated) {
      throw new NotFoundException('Không tìm thấy danh mục')
    }
  }
}
