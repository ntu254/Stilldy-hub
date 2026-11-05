import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SubscriptionsService } from './subscriptions.service'
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto'
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto'
import { PurchaseDto } from './dto/purchase.dto'
import { QueryPaymentDto } from './dto/query-payment.dto'
import { QueryPaymentStatsDto } from './dto/query-payment-stats.dto'
import { QueryUserPaymentDto } from './dto/query-user-payment.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../users/entities/user.entity'
import { SkipAuth } from '../auth/auth.decorator'
import { User } from '../../common/decorators/user.decorator'
import type { UserInfo } from '../../common/decorators/user.decorator'

@ApiTags('Subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // --- PUBLIC ENDPOINTS ---

  @Get('subscription-plans')
  @SkipAuth()
  @ApiOperation({ summary: 'Lấy danh sách các gói dịch vụ đang hoạt động' })
  getPlans() {
    return this.subscriptionsService.getPlans()
  }

  @Get('subscription-plans/:id')
  @SkipAuth()
  @ApiOperation({ summary: 'Lấy chi tiết một gói nâng cấp' })
  getPlanById(@Param('id') id: string) {
    return this.subscriptionsService.getPlanById(id)
  }

  @Post('subscriptions/webhook')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayOS Webhook nhận kết quả giao dịch tự động' })
  handleWebhook(@Body() body: any) {
    return this.subscriptionsService.handleWebhook(body)
  }

  // --- USER AUTHENTICATED ENDPOINTS ---

  @Post('subscriptions/purchase')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Khởi tạo thanh toán mua gói nâng cấp' })
  purchasePlan(@User() user: UserInfo, @Body() dto: PurchaseDto) {
    return this.subscriptionsService.purchasePlan(user.userID, dto)
  }

  @Get('subscriptions/upgrade-preview')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Xem trước chi phí nâng cấp gói dịch vụ' })
  getUpgradePreview(@User() user: UserInfo, @Query('planId') planId: string) {
    return this.subscriptionsService.getUpgradePreview(user.userID, planId)
  }

  @Get('subscriptions/my')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Lấy thông tin gói đăng ký hiện tại của tôi' })
  getMySubscription(@User() user: UserInfo) {
    return this.subscriptionsService.getMySubscription(user.userID)
  }

  @Get('subscriptions/status/:orderCode')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Truy vấn trạng thái một hóa đơn cụ thể' })
  getPaymentStatus(@Param('orderCode') orderCode: string, @User() user: UserInfo) {
    return this.subscriptionsService.getPaymentStatus(Number(orderCode), user.userID)
  }

  @Get('payments/history')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Lấy lịch sử giao dịch thanh toán của tôi' })
  getPaymentHistory(@User() user: UserInfo, @Query() query: QueryUserPaymentDto) {
    return this.subscriptionsService.getPaymentHistory(user.userID, query)
  }

  // --- ADMIN ENDPOINTS (CRUD SubscriptionPlans & Payments) ---

  @Get('admin/payments')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Lấy toàn bộ danh sách lịch sử giao dịch toàn hệ thống' })
  getAllPayments(@Query() query: QueryPaymentDto) {
    return this.subscriptionsService.getAllPayments(query)
  }

  @Get('admin/payments/stats')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Lấy số liệu thống kê giao dịch thanh toán phục vụ Dashboard/Lịch sử' })
  getPaymentStats(@Query() query: QueryPaymentStatsDto) {
    return this.subscriptionsService.getPaymentStats(query)
  }

  @Get('admin/subscription-plans')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Lấy toàn bộ danh sách gói dịch vụ (kể cả gói bị vô hiệu hóa)' })
  getPlansForAdmin() {
    return this.subscriptionsService.getPlansForAdmin()
  }

  @Post('admin/subscription-plans')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Tạo gói dịch vụ mới' })
  createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto)
  }

  @Put('admin/subscription-plans/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Cập nhật gói dịch vụ' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.subscriptionsService.updatePlan(id, dto)
  }

  @Delete('admin/subscription-plans/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: '[Admin] Xóa (vô hiệu hóa) gói dịch vụ' })
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id)
  }
}
