// 🟢 HƯỚNG DẪN KẾT NỐI DATABASE TRÊN MOBILE:
// Trên các ứng dụng di động (React Native / Expo), chúng ta không kết nối trực tiếp (Direct Connection)
// đến Database MongoDB để bảo mật thông tin bảo mật (credentials) và tuân thủ mô hình 3 lớp (3-tier architecture).
//
// Thay vào đó:
// 1. Backend (NestJS Server) sẽ trực tiếp kết nối với MongoDB Atlas thông qua biến môi trường MONGODB_URI.
// 2. Mobile (Expo) sẽ kết nối và gửi yêu cầu đến Database thông qua các API đầu cuối (RESTful API).
//
// File cấu hình kết nối API thực tế nằm tại: studyHub-mobile/redux/authSlice.ts

export const DB_CONNECTION_INFO = {
  dbType: 'MongoDB Atlas',
  connectedThrough: 'NestJS Backend API (Port 8888)',
  status: 'ONLINE',
}
