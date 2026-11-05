import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  Query,
  BadRequestException,
  Res,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger'
import { DocumentsService } from './documents.service'
import { UploadDocumentDto } from './dto/upload-document.dto'
import { UpdateDocumentDto } from './dto/update-document.dto'
import { UpdatePrivacyDto } from './dto/update-privacy.dto'
import { QueryDocumentDto } from './dto/query-document.dto'
import { User, type UserInfo } from '../../common/decorators/user.decorator'
import { SkipAuth } from '../auth/auth.decorator'
import { ReportDocumentDto } from './dto/report-document.dto'
import { OptionalAuthGuard } from '../auth/optional-auth.guard'
import { SendDocumentMessageDto } from './dto/send-document-message.dto'

@ApiTags('Document Workspace')
@ApiBearerAuth('accessToken')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('public')
  @SkipAuth()
  @ApiOperation({ summary: 'Lấy danh sách tài liệu công khai (không cần đăng nhập)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'title', required: false, description: 'Tìm kiếm mờ theo tên tài liệu' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Lọc theo môn học' })
  @ApiQuery({ name: 'tags', required: false, description: 'Lọc theo tags, phân tách bằng dấu phẩy (vd: sql,database)' })
  @ApiQuery({
    name: 'fileType',
    required: false,
    enum: ['pdf', 'docx', 'png', 'jpg', 'xlsx', 'image'],
    description: '"image" = lọc tất cả ảnh (png + jpg + jpeg)',
  })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'title', 'fileSize'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findPublic(@Query() query: QueryDocumentDto) {
    return this.documentsService.findPublicDocuments(query)
  }

  @Get('mine')
  @ApiOperation({ summary: 'Lấy danh sách tài liệu của tôi (yêu cầu đăng nhập)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'title', required: false, description: 'Tìm kiếm mờ theo tên tài liệu' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Lọc theo môn học' })
  @ApiQuery({ name: 'tags', required: false, description: 'Lọc theo tags, phân tách bằng dấu phẩy (vd: sql,database)' })
  @ApiQuery({
    name: 'fileType',
    required: false,
    enum: ['pdf', 'docx', 'png', 'jpg', 'xlsx', 'image'],
    description: '"image" = lọc tất cả ảnh (png + jpg + jpeg)',
  })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'title', 'fileSize'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findMine(@Query() query: QueryDocumentDto, @User() user: UserInfo) {
    return this.documentsService.findMyDocuments(user.userID, query)
  }

  @Get('user/recent-uploaded')
  @ApiOperation({ summary: 'Sinh viên lấy danh sách 4 tài liệu vừa mới tải lên' })
  async getMyRecentUploads(@User() user: UserInfo) {
    const userId = user.userID
    return await this.documentsService.getRecentUploadedDocuments(userId)
  }

  @Get('user/stats')
  @ApiOperation({ summary: 'Sinh viên lấy số liệu thống kê cá nhân (Tổng số file đã upload, tổng dung lượng đã dùng)' })
  async getMyWorkspaceStats(@User() user: UserInfo) {
    const userId = user.userID
    return await this.documentsService.getUserStats(userId)
  }

  @Get('user/saved-list')
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách các tài liệu học tập sinh viên này đã bấm lưu' })
  async getMySavedList(@User() user: UserInfo) {
    return await this.documentsService.getSavedDocumentsByUser(user.userID)
  }

  @Get(':id')
  @SkipAuth()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary:
      'Lấy chi tiết tài liệu kèm lịch sử phiên bản, tự động tăng viewCount. Tài liệu isPublic=true không cần đăng nhập, tài liệu riêng tư cần đăng nhập và là chủ sở hữu.',
  })
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId: string | undefined = req.user?.userID
    const role: string | undefined = req.user?.role
    return this.documentsService.findDocumentById(userId, id, role)
  }

  @Patch(':id/privacy')
  @ApiOperation({
    summary: 'Bật/tắt trạng thái công khai của tài liệu (chỉ chủ sở hữu)',
    description:
      'Khi isPublic=true, bắt buộc phải gửi kèm dmcaAccepted=true để xác nhận chịu trách nhiệm pháp lý ' +
      'theo tiêu chuẩn DMCA (Digital Millennium Copyright Act). ' +
      'Hệ thống sẽ ghi lại thời điểm xác nhận làm audit trail.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isPublic: {
          type: 'boolean',
          description: 'true = công khai, false = riêng tư',
          example: true,
        },
        dmcaAccepted: {
          type: 'boolean',
          description:
            'Bắt buộc phải là true khi isPublic=true. ' +
            'Xác nhận người dùng chịu trách nhiệm về bản quyền theo luật DMCA.',
          example: true,
        },
      },
      required: ['isPublic'],
    },
  })
  updatePrivacy(@Param('id') id: string, @Body() dto: UpdatePrivacyDto, @User() user: UserInfo) {
    return this.documentsService.updatePrivacy(user.userID, id, dto.isPublic, dto.dmcaAccepted)
  }

  @Get(':id/share-link')
  @ApiOperation({ summary: 'Lấy signed URL chia sẻ trỏ đến phiên bản file mới nhất' })
  getShareLink(@Param('id') id: string, @User() user: UserInfo) {
    return this.documentsService.getShareLink(user.userID, id)
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Tải xuống file tài liệu (yêu cầu đăng nhập, kiểm tra quyền riêng tư)' })
  async downloadDocument(@Param('id') id: string, @Res() res: any, @User() user: UserInfo) {
    const { stream, fileName } = await this.documentsService.downloadDocument(id, user.userID, user.role)

    // Thiết lập Header báo trình duyệt đây là hành vi TẢI FILE (Attachment)
    // encodeURIComponent giúp tên file tiếng Việt có dấu không bị lỗi font khi tải về
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    res.set({
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Type': 'application/octet-stream',
    })

    // Pipe trực tiếp luồng đọc từ Firebase sang luồng ghi của client

    stream.pipe(res)
  }

  @Get(':id/file')
  @SkipAuth()
  @ApiOperation({ summary: 'Stream file tài liệu qua NestJS (CORS bridge cho Firebase Storage)' })
  async getFile(@Param('id') id: string, @Res() res: any, @Req() req: any) {
    const doc = await this.documentsService.findDocumentByIdPublic(id)
    const latestVersion = doc.versions[doc.versions.length - 1]
    if (!latestVersion) {
      throw new NotFoundException('Không tìm thấy phiên bản tệp tin.')
    }

    // 1. Tự động nhận diện MIME Type chính xác dựa trên đuôi file hệ thống
    const ext = latestVersion.fileName.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'

    switch (ext) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
      case 'pptx':
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        break
    }

    // 2. fileSize & ETag lấy trực tiếp từ DB — không cần gọi thêm Firebase API
    const fileSize = latestVersion.fileSize ?? null
    const etag = `"${latestVersion.fileHash}"`

    // 3. ETag check — trả 304 Not Modified nếu browser đã có bản đúng
    const typedReq = req as { headers: Record<string, string> }
    const clientEtag = typedReq.headers['if-none-match']
    if (clientEtag && clientEtag === etag) {
      ;(res as { status: (code: number) => { end: () => void } }).status(304).end()
      return
    }

    // 4. Lấy stream từ Firebase
    const stream = await this.documentsService.getFileStream(latestVersion.fileUrl)

    // 5. Set response headers
    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(latestVersion.fileName)}"`,
      'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length, ETag',
      'Cache-Control': 'private, max-age=3600, must-revalidate',
      ETag: etag,
    }

    if (fileSize) {
      headers['Content-Length'] = fileSize
    }

    ;(res as { set: (h: Record<string, string | number>) => void }).set(headers)
    ;(stream as NodeJS.ReadableStream).pipe(res as NodeJS.WritableStream)
  }

  @Post('upload')
  @ApiOperation({ summary: 'Sinh viên tải lên tài liệu học tập mới (Version 1)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Chấp nhận file .pdf, .docx, .png, .jpg, .txt, .md',
        },
        title: { type: 'string', example: 'Đề cương triết học học kỳ 2' },
        description: { type: 'string', example: 'Tài liệu tóm tắt kiến thức cốt lõi ôn thi' },
        subjectId: { type: 'string', example: '65f123456789abcdef012345' },
        tags: { type: 'array', items: { type: 'string' }, example: ['database', 'sql'] },
      },
      required: ['file', 'title', 'subjectId'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // Cấu hình giới hạn tối đa 25MB một file tài liệu
      fileFilter: (req, file, callback) => {
        // Chỉ cho phép tải lên các định dạng học thuật cốt lõi
        if (!file.originalname.match(/\.(pdf|docx|png|jpg|jpeg|txt|md)$/)) {
          return callback(
            new BadRequestException('Hệ thống chỉ hỗ trợ định dạng file .pdf, .docx, .png, .jpg, .txt, .md!'),
            false,
          )
        }
        callback(null, true)
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @User() user: UserInfo,
  ) {
    return await this.documentsService.uploadNewDocument(user.userID, file, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật tiêu đề hoặc mô tả tài liệu (chỉ chủ sở hữu)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Đề cương ôn tập học kỳ 2' },
        description: { type: 'string', example: 'Cập nhật nội dung mô tả tài liệu' },
      },
    },
  })
  updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @User() user: UserInfo) {
    return this.documentsService.updateDocument(user.userID, id, dto)
  }

  @Post(':id/new-version')
  @ApiOperation({ summary: 'Tải lên phiên bản file mới (chỉ chủ sở hữu), tự động tăng versionNumber' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File phiên bản mới .pdf, .docx, .png, .jpg, .txt, .md',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(pdf|docx|png|jpg|jpeg|txt|md)$/)) {
          return callback(
            new BadRequestException('Hệ thống chỉ hỗ trợ định dạng file .pdf, .docx, .png, .jpg, .txt, .md!'),
            false,
          )
        }
        callback(null, true)
      },
    }),
  )
  async uploadNewVersion(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @User() user: UserInfo) {
    return await this.documentsService.uploadNewVersion(user.userID, id, file)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm tài liệu (chủ sở hữu hoặc Admin), chuyển _destroy thành true' })
  deleteDocument(@Param('id') id: string, @User() user: UserInfo) {
    return this.documentsService.deleteDocument(user.userID, id, user.role)
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Sinh viên bấm nút báo cáo một tài liệu vi phạm học thuật/nội dung' })
  async reportDoc(@Param('id') id: string, @Body() dto: ReportDocumentDto, @User() user: UserInfo) {
    return await this.documentsService.reportDocument(id, user.userID, dto)
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Sinh viên bấm Like / Hủy Like tài liệu' })
  async likeDoc(@Param('id') id: string, @User() user: UserInfo) {
    return await this.documentsService.toggleLike(id, user.userID)
  }

  @Post(':id/dislike')
  @ApiOperation({ summary: 'Sinh viên bấm Dislike / Hủy Dislike tài liệu' })
  async dislikeDoc(@Param('id') id: string, @User() user: UserInfo) {
    return await this.documentsService.toggleDislike(id, user.userID)
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Sinh viên bấm Lưu tài liệu vào bộ sưu tập cá nhân (Bookmark)' })
  async saveDoc(@Param('id') id: string, @User() user: UserInfo) {
    return await this.documentsService.toggleSaveDocument(id, user.userID)
  }

  @Get(':id/conversation')
  @ApiOperation({ summary: 'Lấy lịch sử đoạn chat của tài liệu (chatbot collapse)' })
  async getConversation(@Param('id') id: string, @User() user: UserInfo) {
    return await this.documentsService.getOrCreateConversation(user.userID, id)
  }

  @Post(':id/conversation')
  @ApiOperation({ summary: 'Gửi tin nhắn chatbot collapse cho tài liệu' })
  @ApiBody({ type: SendDocumentMessageDto })
  async sendMessage(@Param('id') id: string, @Body() dto: SendDocumentMessageDto, @User() user: UserInfo) {
    return await this.documentsService.addMessageToConversation(user.userID, id, dto.textContent)
  }
}
