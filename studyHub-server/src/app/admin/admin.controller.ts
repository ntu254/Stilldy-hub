import { Controller, Get, Delete, Patch, Post, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { AuthGuard } from '../auth/auth.guard'
import { RolesGuard } from '../../common/security/roles/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../users/entities/user.entity'
import { QueryReportedDocumentDto } from './dto/query-reported-document.dto'
import { QueryDocumentDto } from './dto/query-document.dto'

@ApiTags('Admin - Management Panel')
@ApiBearerAuth('accessToken')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Lấy toàn bộ số liệu tổng quan đổ lên biểu đồ và các khối thông số Dashboard' })
  async getStats() {
    return await this.adminService.getDashboardStats()
  }

  @Get('documents')
  @ApiOperation({ summary: 'Lấy danh sách tất cả tài liệu với tìm kiếm, lọc và phân trang' })
  async getAllDocuments(@Query() query: QueryDocumentDto) {
    return await this.adminService.getAllDocuments(query)
  }

  @Get('documents/reported')
  @ApiOperation({ summary: 'Lấy danh sách hàng đợi các file tài liệu đang bị sinh viên gắn cờ báo cáo vi phạm' })
  async getReportedDocs(@Query() query: QueryReportedDocumentDto) {
    return await this.adminService.getReportedDocuments(query)
  }

  @Patch('documents/:id/reject-report')
  @ApiOperation({ summary: 'Bác bỏ báo cáo (Gỡ cờ vi phạm cho tài liệu học tập sạch)' })
  async rejectDocReport(@Param('id') id: string) {
    return await this.adminService.rejectReport(id)
  }

  @Get('documents/:id/reports')
  @ApiOperation({ summary: 'Lấy danh sách các báo cáo vi phạm của một tài liệu cụ thể' })
  async getDocumentReports(@Param('id') id: string) {
    return await this.adminService.getReportsByDocument(id)
  }

  @Delete('documents/:id')
  @ApiOperation({
    summary: 'Thực thi lệnh xóa tối cao đối với tài liệu vi phạm quy chế (Dọn sạch cả DB lẫn Firebase Cloud)',
  })
  async deleteViolatedDoc(@Param('id') id: string) {
    return await this.adminService.supremeDeleteDocument(id)
  }

  @Post('moderate-document/:id')
  @ApiOperation({ summary: 'Xử lý phán quyết Báo cáo của Admin (Giữ lại hoặc Xóa)' })
  @ApiBody({ schema: { properties: { action: { type: 'string', enum: ['KEEP', 'DELETE'] } } } })
  async moderateDocument(@Param('id') id: string, @Body('action') action: 'KEEP' | 'DELETE') {
    return await this.adminService.moderateDocument(id, action)
  }
}
