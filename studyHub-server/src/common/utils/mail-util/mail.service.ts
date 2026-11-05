// src/app/common/utils/mail.service.ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class MailService {
  private resend: Resend | null = null

  constructor(private configService: ConfigService) {
    // Lấy API Key từ file .env thông qua ConfigService hoặc process.env
    const apiKey = this.configService.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY
    if (apiKey) {
      this.resend = new Resend(apiKey)
    } else {
      console.warn('⚠️ Warning: RESEND_API_KEY is not defined. Email service will not work.')
      this.resend = null
    }
  }

  async sendResetPasswordEmail(email: string, token: string, redirectTo?: string) {
    const feUrl = this.configService.get<string>('FE_URL') ?? 'http://localhost:5173'
    const isValidUrl = (url: string) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }
    const baseUrl = (redirectTo && isValidUrl(redirectTo) ? redirectTo : feUrl).replace(/\/$/, '')
    const resetLink = `${baseUrl}/reset-password?token=${token}`

    if (!this.resend) {
      console.error('❌ Email service is not configured (RESEND_API_KEY is missing).')
      return
    }

    try {
      await this.resend.emails.send({
        from: 'Nexus <no-reply@thienantech.pro.vn>',
        to: email,
        subject: 'Khôi phục mật khẩu - Nexus',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
              <tr><td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;max-width:600px;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color:#4f46e5;padding:24px 32px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:0.5px;">Nexus</h1>
                      <p style="margin:6px 0 0;color:#c7d2fe;font-size:13px;">Nền tảng lưu trữ tài liệu học tập</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:32px;color:#333333;line-height:1.7;">
                      <h2 style="margin-top:0;color:#1e1b4b;font-size:18px;">Yêu cầu khôi phục mật khẩu</h2>
                      <p style="margin:12px 0;font-size:15px;">Xin chào,</p>
                      <p style="margin:12px 0;font-size:15px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Nexus của bạn. Nhấn vào nút bên dưới để tiến hành đổi mật khẩu:</p>
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}"
                               style="display:inline-block;padding:13px 32px;background-color:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:bold;letter-spacing:0.3px;">
                              Đặt lại mật khẩu
                            </a>
                          </td>
                        </tr>
                      </table>
                      <!-- Note -->
                      <div style="background-color:#fef9c3;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;font-size:13px;color:#78350f;">
                        &#9200; Liên kết này chỉ có hiệu lực trong <strong>15 phút</strong>. Sau thời gian đó, bạn cần gửi yêu cầu mới.
                      </div>
                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">Nếu nút không hoạt động, hãy sao chép và dán đường dẫn sau vào trình duyệt:</p>
                      <p style="word-break:break-all;color:#4f46e5;font-size:13px;margin:0;">${resetLink}</p>
                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                      <p style="font-size:13px;color:#9ca3af;margin:0;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
                      <p style="margin:0 0 4px;">&copy; ${new Date().getFullYear()} Nexus. Mọi quyền được bảo lưu.</p>
                      <p style="margin:0;">Email này được gửi tự động, vui lòng không trả lời.</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      })
    } catch (error) {
      console.error('Lỗi gửi mail:', error)
      throw error
    }
  }
}
