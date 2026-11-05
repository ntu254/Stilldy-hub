import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from './entities/user.entity'
import { User } from '../../common/decorators/user.decorator'
import type { UserInfo } from '../../common/decorators/user.decorator'
import { QueryUserDto } from './dto/query-user.dto'

@Controller('users')
@Roles(UserRole.ADMIN)
@ApiBearerAuth('accessToken')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @Roles()
  updateMe(@User() user: UserInfo, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.userID, updateUserDto)
  }

  @Patch('me/avatar')
  @Roles()
  @ApiOperation({ summary: 'Tải lên và cập nhật ảnh đại diện của tôi' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh đại diện định dạng .jpg, .jpeg, .png (tối đa 2MB)',
        },
      },
      required: ['avatar'],
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 2 * 1024 * 1024 }, // Giới hạn 2MB
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
          return callback(new BadRequestException('Hệ thống chỉ hỗ trợ định dạng ảnh .jpg, .jpeg, .png!'), false)
        }
        callback(null, true)
      },
    }),
  )
  uploadAvatar(@User() user: UserInfo, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để tải lên!')
    }
    return this.usersService.updateAvatar(user.userID, file)
  }

  @Get('me')
  @Roles()
  getMe(@User() user: UserInfo) {
    return this.usersService.findById(user.userID)
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOneWithStats(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id)
  }
}
