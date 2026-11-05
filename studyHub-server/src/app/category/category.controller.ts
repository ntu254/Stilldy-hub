import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CategoryService } from './category.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../users/entities/user.entity'
import { SkipAuth } from '../auth/auth.decorator'

@ApiTags('Category')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'Lấy danh sách tất cả danh mục' })
  findAll() {
    return this.categoryService.findAll()
  }

  @Get(':id')
  @SkipAuth()
  @ApiOperation({ summary: 'Lấy chi tiết một danh mục theo ID' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findById(id)
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Tạo danh mục mới' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Cập nhật danh mục' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Xoá danh mục' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id)
  }
}
