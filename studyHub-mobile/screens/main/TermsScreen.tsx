import React from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ArrowLeft, FileText } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'

export default function TermsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 220 }}
      >
        {/* Header Banner */}
        <View style={{ marginBottom: 20, borderRadius: 24, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Svg height="100%" width="100%">
              <Defs>
                <LinearGradient id="gradTerms" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#F0FDF4" />
                  <Stop offset="100%" stopColor="#DCFCE7" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#gradTerms)" />
              <Circle cx="90%" cy="10%" r="50" fill="#BBF7D0" opacity="0.6" />
              <Circle cx="80%" cy="90%" r="30" fill="#86EFAC" opacity="0.4" />
            </Svg>
          </View>
          <View
            style={{
              padding: 20,
              borderWidth: 1.5,
              borderColor: '#BBF7D0',
              borderRadius: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                {
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                  shadowColor: '#10B981',
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                },
                pressed && { backgroundColor: '#F0FDF4' }
              ]}
            >
              <ArrowLeft color='#10B981' size={18} />
            </Pressable>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Hệ thống
              </Text>
              <Text style={{ color: '#14532D', fontSize: 22, fontWeight: '900', marginTop: 2 }}>
                Điều khoản sử dụng
              </Text>
            </View>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: '#10B981',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#10B981',
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <FileText color='#FFFFFF' size={18} />
            </View>
          </View>
        </View>

        {/* Content Container */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 20,
            gap: 20,
            shadowColor: '#0F172A',
            shadowOpacity: 0.04,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginBottom: 4 }}>
            Cập nhật lần cuối: 24 tháng 6, 2026
          </Text>

          <TermSection
            number="1"
            title="Giới thiệu"
            content="Chào mừng bạn đến với AI Study Hub. Khi sử dụng hệ thống, người dùng đồng ý tuân thủ các điều khoản và quy định được nêu trong tài liệu này. Nếu không đồng ý với bất kỳ điều khoản nào, người dùng không nên tiếp tục sử dụng hệ thống."
          />

          <TermSection
            number="2"
            title="Đối tượng sử dụng"
            content="Hệ thống AI Study Hub được xây dựng dành cho:\n• Sinh viên và người học có nhu cầu lưu trữ, quản lý tài liệu học tập.\n• Giảng viên hoặc cá nhân muốn chia sẻ tài liệu phục vụ học tập.\n• Quản trị viên được phân quyền quản lý hệ thống.\n\nNgười dùng phải cung cấp thông tin chính xác khi đăng ký tài khoản."
          />

          <TermSection
            number="3"
            title="Tài khoản người dùng"
            content="Người dùng có trách nhiệm:\n• Bảo mật thông tin đăng nhập của mình.\n• Không chia sẻ tài khoản cho người khác sử dụng.\n• Chịu trách nhiệm đối với mọi hoạt động phát sinh từ tài khoản của mình.\n• Thông báo cho quản trị viên nếu phát hiện hành vi truy cập trái phép.\n\nHệ thống có quyền tạm khóa hoặc chấm dứt tài khoản nếu phát hiện hành vi vi phạm điều khoản sử dụng."
          />

          <TermSection
            number="4"
            title="Quy định về tài liệu tải lên"
            content="Người dùng được phép tải lên các tài liệu phục vụ học tập như:\n• Giáo trình, Bài giảng\n• Tài liệu tham khảo, Báo cáo học tập, Tài liệu nghiên cứu\n\nNgười dùng không được tải lên:\n• Nội dung vi phạm pháp luật.\n• Nội dung chứa mã độc hoặc phần mềm gây hại.\n• Nội dung xúc phạm, quấy rối hoặc gây ảnh hưởng tiêu cực đến cộng đồng.\n• Nội dung vi phạm quyền sở hữu trí tuệ hoặc bản quyền của bên thứ ba.\n\nNgười dùng hoàn toàn chịu trách nhiệm đối với nội dung tài liệu mà mình tải lên hệ thống."
          />

          <TermSection
            number="5"
            title="Quy định về chia sẻ tài liệu"
            content="Người dùng có thể:\n• Chia sẻ tài liệu công khai.\n• Tạo liên kết chia sẻ tài liệu.\n• Chuyển đổi trạng thái tài liệu giữa Công khai và Riêng tư.\n\nNgười dùng phải đảm bảo rằng việc chia sẻ tài liệu không vi phạm bản quyền hoặc quyền lợi của bên thứ ba."
          />

          <TermSection
            number="6"
            title="Sử dụng AI Chatbot"
            content="AI Chatbot được cung cấp nhằm hỗ trợ học tập và tra cứu thông tin.\n\nNgười dùng đồng ý rằng:\n• Câu trả lời do AI tạo ra chỉ mang tính chất tham khảo.\n• Hệ thống không đảm bảo độ chính xác tuyệt đối của mọi câu trả lời.\n• Người dùng cần tự đánh giá và kiểm chứng thông tin trước khi sử dụng cho mục đích học tập hoặc nghiên cứu.\n\nNgười dùng không được sử dụng chatbot cho các mục đích trái pháp luật hoặc gây ảnh hưởng đến hệ thống."
          />

          <TermSection
            number="7"
            title="Quyền và trách nhiệm của quản trị viên"
            content="Quản trị viên có quyền:\n• Quản lý người dùng và tài liệu.\n• Xóa hoặc hạn chế quyền truy cập đối với nội dung vi phạm.\n• Khóa tài khoản vi phạm điều khoản sử dụng.\n• Theo dõi hoạt động hệ thống nhằm đảm bảo an toàn và ổn định.\n\nQuản trị viên có trách nhiệm bảo vệ dữ liệu người dùng theo phạm vi kỹ thuật và quy định hiện hành."
          />

          <TermSection
            number="8"
            title="Bảo mật dữ liệu"
            content="Hệ thống cam kết:\n• Bảo vệ thông tin cá nhân của người dùng.\n• Áp dụng các biện pháp bảo mật phù hợp để hạn chế truy cập trái phép.\n• Không chia sẻ thông tin cá nhân cho bên thứ ba khi chưa có sự đồng ý của người dùng, trừ trường hợp được yêu cầu bởi cơ quan có quyền hạn theo quy định pháp luật."
          />

          <TermSection
            number="9"
            title="Giới hạn trách nhiệm"
            content="AI Study Hub không chịu trách nhiệm đối với:\n• Thiệt hại phát sinh từ việc người dùng sử dụng sai mục đích.\n• Mất mát dữ liệu do sự cố ngoài khả năng kiểm soát của hệ thống.\n• Nội dung do người dùng tải lên hoặc chia sẻ.\n• Sai sót trong các câu trả lời được tạo bởi AI Chatbot."
          />

          <TermSection
            number="10"
            title="Thay đổi điều khoản"
            content="AI Study Hub có quyền cập nhật hoặc điều chỉnh các điều khoản sử dụng khi cần thiết nhằm nâng cao chất lượng dịch vụ. Mọi thay đổi sẽ được thông báo trên hệ thống và có hiệu lực kể từ thời điểm công bố."
          />

          <TermSection
            number="11"
            title="Hiệu lực"
            content="Việc đăng ký tài khoản hoặc tiếp tục sử dụng AI Study Hub đồng nghĩa với việc người dùng đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản sử dụng được quy định trong tài liệu này."
          />
        </View>
      </ScrollView>
    </ScreenShell>
  )
}

function TermSection({ number, title, content }: { number: string; title: string; content: string }) {
  const formattedContent = content.split('\\n').map((line, index) => (
    <Text key={index} style={{ color: '#475569', fontSize: 14, lineHeight: 22, marginTop: line ? 4 : 0 }}>
      {line}
    </Text>
  ))

  return (
    <View style={{ borderBottomWidth: number !== '11' ? 1 : 0, borderBottomColor: '#F1F5F9', paddingBottom: number !== '11' ? 16 : 0 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
        {number}. {title}
      </Text>
      <View>{formattedContent}</View>
    </View>
  )
}
