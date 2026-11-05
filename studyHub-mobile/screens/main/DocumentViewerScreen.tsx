import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, View, Modal, Platform, KeyboardAvoidingView, FlatList } from 'react-native'
import { ArrowLeft, Sparkles, BookOpen, FileText, ThumbsUp, ThumbsDown, Bookmark, Download, Trash2, Flag, UploadCloud, X, AlertCircle, Maximize, Minimize, Send, ShieldCheck, Check } from 'lucide-react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import * as DocumentPicker from 'expo-document-picker'
import { WebView } from 'react-native-webview'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState } from '../../redux/store'
import { documentsApi, DocumentInfo } from '../../api/documentsApi'
import { useToast } from '../../components/ui/ToastProvider'
import { API_BASE_URL } from '../../api/apiClient'

function formatBytes(bytes?: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentViewerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<NativeStackScreenProps<RootStackParamList, 'DocumentViewer'>['route']>()
  const routeParams = (route as any).params ?? {}
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const token = useSelector((state: RootState) => state.auth.token)
  const toast = useToast()

  const documentId = routeParams.documentId
  const initialTitle = routeParams.documentTitle ?? 'Chi tiết tài liệu'
  const initialSubjectName = routeParams.sourceSubject ?? 'Chung'

  const [document, setDocument] = useState<DocumentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [updatingVersion, setUpdatingVersion] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false)
  const [dmcaModalVisible, setDmcaModalVisible] = useState(false)

  // Quick Chatbot states
  const [showQuickChat, setShowQuickChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const [sendingChat, setSendingChat] = useState(false)

  const loadChatHistory = async () => {
    if (!document) return
    setLoadingChat(true)
    try {
      const res = await documentsApi.getDocumentConversation(document._id)
      setChatMessages(res.messages || [])
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải lịch sử trò chuyện.')
    } finally {
      setLoadingChat(false)
    }
  }

  const handleSendChatMessage = async () => {
    if (!document || !chatDraft.trim() || sendingChat) return
    const userMsgText = chatDraft.trim()
    setChatDraft('')
    
    // Add locally immediately for fast feedback
    const tempUserMsg = {
      sender: 'user',
      textContent: userMsgText,
      createdAt: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, tempUserMsg])
    setSendingChat(true)
    
    try {
      const res = await documentsApi.sendDocumentMessage(document._id, userMsgText)
      setChatMessages(res.messages || [])
    } catch (err: any) {
      toast.error(err.toString() || 'Lỗi gửi tin nhắn AI.')
    } finally {
      setSendingChat(false)
    }
  }

  useEffect(() => {
    if (showQuickChat) {
      loadChatHistory()
    }
  }, [showQuickChat])

  // Tải chi tiết tài liệu
  const loadDetail = async () => {
    setLoading(true)
    try {
      const detail = await documentsApi.getDocumentDetail(documentId)
      setDocument(detail)
      setEditTitle(detail.title)
      setEditDescription(detail.description || '')
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải thông tin chi tiết tài liệu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [documentId])

  // Xử lý Thích (Like)
  const handleLike = async () => {
    if (!document) return
    try {
      const stats = await documentsApi.toggleLike(document._id)
      setDocument((prev) => prev ? { ...prev, ...stats } : null)
    } catch (err: any) {
      toast.error(err.toString())
    }
  }

  // Xử lý Phản đối (Dislike)
  const handleDislike = async () => {
    if (!document) return
    try {
      const stats = await documentsApi.toggleDislike(document._id)
      setDocument((prev) => prev ? { ...prev, ...stats } : null)
    } catch (err: any) {
      toast.error(err.toString())
    }
  }

  // Xử lý Lưu (Save)
  const handleSave = async () => {
    if (!document) return
    try {
      const res = await documentsApi.toggleSave(document._id)
      setDocument((prev) => prev ? { ...prev, isSavedByUser: res.isSaved } : null)
      toast.info(res.message)
    } catch (err: any) {
      toast.error(err.toString())
    }
  }

  // Xử lý Tải xuống (Download)
  const handleDownload = async () => {
    if (!document) return
    try {
      toast.success('Bắt đầu tải xuống...')
      const downloadUrl = documentsApi.getDownloadUrl(document._id)
      
      // Clean title for local cache filename
      const cleanTitle = document.title.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const localUri = `${FileSystem.cacheDirectory}${cleanTitle}`

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (downloadResult.status === 200) {
        toast.success(`Tải xuống thành công!`)

        if (Platform.OS === 'android') {
          try {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const fileContent = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: 'base64' });
              const mimeType = downloadResult.headers['content-type'] || 'application/octet-stream';
              const createdFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                cleanTitle,
                mimeType
              );
              await FileSystem.writeAsStringAsync(createdFileUri, fileContent, { encoding: 'base64' });
              toast.success('Đã lưu tài liệu vào máy thành công!');
              return;
            }
          } catch (safErr) {
            console.warn('[SAF Save Failed]:', safErr);
          }
        }
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: downloadResult.headers['content-type'] || 'application/octet-stream',
            dialogTitle: `Tải tài liệu: ${document.title}`,
          })
        } else {
          Alert.alert('Đã tải tệp về thiết bị', `Tệp đã được tải và lưu tạm thời tại:\n${downloadResult.uri}`)
        }
      } else {
        throw new Error('Lỗi máy chủ khi tải tệp.')
      }
    } catch (err: any) {
      console.error('[Download Error]:', err)
      toast.error('Tải trực tiếp thất bại, đang mở liên kết trực tuyến...')
      try {
        const { shareLink } = await documentsApi.getShareLink(document._id)
        const supported = await Linking.canOpenURL(shareLink)
        if (supported) {
          await Linking.openURL(shareLink)
        } else {
          toast.error('Không thể mở liên kết tải xuống trên thiết bị này.')
        }
      } catch (linkErr: any) {
        toast.error(linkErr.toString())
      }
    }
  }

  // Xử lý Báo cáo (Report)
  const handleReport = async () => {
    if (!document) return
    if (!reportReason.trim()) {
      toast.warning('Vui lòng nhập lý do báo cáo.')
      return
    }

    setReporting(true)
    try {
      const res = await documentsApi.reportDocument(document._id, reportReason.trim())
      toast.success(res.message)
      setReportModalVisible(false)
      setReportReason('')
    } catch (err: any) {
      toast.error(err.toString())
    } finally {
      setReporting(false)
    }
  }

  // Xử lý Xóa (Delete)
  const handleDelete = async () => {
    if (!document) return
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa tài liệu này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentsApi.deleteDocument(document._id)
              toast.success('Tài liệu đã được xóa.')
              navigation.goBack()
            } catch (err: any) {
              toast.error(err.toString())
            }
          },
        },
      ]
    )
  }

  // Xử lý Cập nhật phiên bản mới (New Version)
  const handleUploadNewVersion = async () => {
    if (!document) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/*',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      })

      if (result.canceled) return
      const asset = result.assets?.[0]
      if (!asset) return

      setUpdatingVersion(true)
      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as any)

      const updatedDoc = await documentsApi.uploadNewVersion(document._id, formData)
      setDocument(updatedDoc)
      toast.success(`Đã tải lên phiên bản mới thành công (V${updatedDoc.versions.length})!`)
    } catch (err: any) {
      toast.error(err.toString())
    } finally {
      setUpdatingVersion(false)
    }
  }

  // Xử lý cập nhật thông tin tài liệu
  const handleUpdateMetadata = async () => {
    if (!document) return
    if (!editTitle.trim()) {
      toast.warning('Vui lòng nhập tiêu đề tài liệu.')
      return
    }

    try {
      const updatedDoc = await documentsApi.updateDocument(document._id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      })
      setDocument((prev) => prev ? { ...prev, ...updatedDoc } : null)
      toast.success('Đã cập nhật thông tin tài liệu thành công!')
      setEditModalVisible(false)
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể cập nhật thông tin tài liệu.')
    }
  }

  // Xử lý nút chuyển đổi quyền riêng tư
  const handlePressPrivacy = () => {
    if (!document || updatingPrivacy) return
    if (!document.isPublic) {
      // Khi muốn mở công khai -> Hiện Modal xác nhận điều khoản DMCA
      setDmcaModalVisible(true)
    } else {
      // Khi muốn đóng công khai -> Chuyển về riêng tư trực tiếp
      executePrivacyUpdate(false, false)
    }
  }

  const executePrivacyUpdate = async (isPublic: boolean, dmcaAccepted: boolean) => {
    if (!document) return
    setUpdatingPrivacy(true)
    try {
      const updatedDoc = await documentsApi.updatePrivacy(document._id, isPublic, dmcaAccepted)
      setDocument((prev) => (prev ? { ...prev, isPublic: updatedDoc.isPublic } : null))
      setDmcaModalVisible(false)
      toast.success(
        isPublic
          ? '🌐 Đã chuyển tài liệu sang chế độ Công khai thành công!'
          : '🔒 Đã chuyển tài liệu sang chế độ Riêng tư thành công!',
        4000
      )
    } catch (err: any) {
      toast.error(err.toString() || 'Thay đổi trạng thái thất bại. Vui lòng thử lại.', 5000)
    } finally {
      setUpdatingPrivacy(false)
    }
  }

  const isOwner = document?.uploadedBy?._id === currentUser?.id || false
  const activeTitle = document?.title ?? initialTitle
  const activeSubject = document?.subjectId?.name ?? initialSubjectName

  const latestVersion = document?.versions && document.versions.length > 0
    ? document.versions[document.versions.length - 1]
    : null
  const fileName = latestVersion?.fileName || ''
  const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
  const isPdf = fileExt === 'pdf'
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'].includes(fileExt)
  const fileUrl = latestVersion?.fileUrl || ''
  const webViewUrl = Platform.OS === 'ios'
    ? fileUrl
    : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      <View
        style={{
          paddingTop: Platform.OS === 'ios' ? 54 : 44, // Safe area space
          paddingHorizontal: 20,
          paddingBottom: 14,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#0F172A',
          shadowOpacity: 0.02,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#F1F5F9',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft color='#334155' size={18} />
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 12 }}>
          <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', textAlign: 'center' }} numberOfLines={1}>
            {activeTitle}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <BookOpen color='#64748B' size={12} />
            <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '500' }}>{activeSubject}</Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size='large' color='#06B6D4' />
          <Text style={{ marginTop: 12, color: '#64748B' }}>Đang tải chi tiết tài liệu...</Text>
        </View>
      ) : !document ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ color: '#64748B', fontWeight: '700' }}>Không thể tìm thấy tài liệu.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 170 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#0F172A',
              shadowOpacity: 0.03,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
              marginBottom: 16,
            }}
          >
            {isPdf ? (
              <View style={{ height: 280, width: '100%', backgroundColor: '#E2E8F0', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                <WebView
                  source={{ uri: webViewUrl }}
                  style={{ flex: 1 }}
                  scalesPageToFit
                  startInLoadingState
                  renderLoading={() => (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
                      <ActivityIndicator size="small" color="#6366F1" />
                    </View>
                  )}
                />
                
                <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={async () => {
                      const supported = await Linking.canOpenURL(fileUrl)
                      if (supported) {
                        await Linking.openURL(fileUrl)
                      } else {
                        toast.error('Không thể mở liên kết này.')
                      }
                    }}
                    style={{
                      backgroundColor: 'rgba(15,23,42,0.75)',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Mở trình duyệt</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFullscreen(true)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: 'rgba(15,23,42,0.75)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Maximize size={16} color='#FFFFFF' />
                  </Pressable>
                </View>
              </View>
            ) : isImage ? (
              <View style={{ height: 280, width: '100%', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                <Image
                  source={{ uri: fileUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode='contain'
                />
              </View>
            ) : (
              /* Non-PDF / Non-Image Placeholder */
              <View style={{ width: '100%', backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1, marginBottom: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: fileExt === 'doc' || fileExt === 'docx' ? '#EFF6FF' : '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={24} color={fileExt === 'doc' || fileExt === 'docx' ? '#2563EB' : '#EA580C'} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <AlertCircle size={12} color='#D97706' />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706', textTransform: 'uppercase' }}>Xem trước không khả dụng</Text>
                </View>
                <Text style={{ color: '#64748B', fontSize: 11, textAlign: 'center', paddingHorizontal: 16, marginBottom: 12, lineHeight: 16 }}>
                  Định dạng <Text style={{ fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' }}>.{fileExt}</Text> không hỗ trợ xem trực tiếp. Vui lòng tải xuống để xem nội dung đầy đủ.
                </Text>
                <Pressable
                  onPress={handleDownload}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Download size={14} color='#64748B' />
                  <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Tải xuống để xem</Text>
                </Pressable>
              </View>
            )}
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View
                  style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#DBEAFE' }}
                >
                  <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '700' }}>V{document.versions.length} Active</Text>
                </View>
                <View
                  style={{
                    backgroundColor: document.isPublic ? '#ECFDF5' : '#F8FAFC',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: document.isPublic ? '#D1FAE5' : '#E2E8F0',
                  }}
                >
                  <Text style={{ color: document.isPublic ? '#059669' : '#64748B', fontSize: 11, fontWeight: '700' }}>
                    {document.isPublic ? 'Công khai' : 'Riêng tư'}
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#0F172A', fontSize: 20, fontWeight: '800', lineHeight: 26 }}>{document.title}</Text>
              <Text style={{ color: '#475569', marginTop: 8, lineHeight: 22, fontSize: 14 }}>
                {document.description || 'Không có nội dung mô tả tài liệu này.'}
              </Text>

              <View
                style={{
                  marginTop: 18,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                  paddingTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Image
                    source={{
                      uri:
                        (document.uploadedBy as any)?.avatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
                    }}
                    style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0' }}
                  />
                  <View>
                    <Text style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 }}>
                      Người đăng
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 }}>
                      {document.uploadedBy?.displayName || document.uploadedBy?.fullName || (document.uploadedBy?.email ? document.uploadedBy.email.split('@')[0] : '') || 'Ẩn danh'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 }}>
                      Lượt xem
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 }}>
                      {document.viewCount}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 }}>
                      Tải về
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 }}>
                      {document.downloadCount}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingVertical: 10,
              paddingHorizontal: 8,
              justifyContent: 'space-around',
              alignItems: 'center',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOpacity: 0.02,
              shadowRadius: 10,
              elevation: 1,
            }}
          >
            <Pressable
              onPress={handleLike}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: document.isLikedByUser ? '#EFF6FF' : 'transparent',
              }}
            >
              <ThumbsUp color={document.isLikedByUser ? '#3B82F6' : '#64748B'} size={18} fill={document.isLikedByUser ? '#3B82F6' : 'transparent'} />
              <Text style={{ color: document.isLikedByUser ? '#3B82F6' : '#64748B', fontSize: 13, fontWeight: '700' }}>{document.totalLikes}</Text>
            </Pressable>

            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />

            <Pressable
              onPress={handleDislike}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: document.isDislikedByUser ? '#FEF2F2' : 'transparent',
              }}
            >
              <ThumbsDown color={document.isDislikedByUser ? '#EF4444' : '#64748B'} size={18} fill={document.isDislikedByUser ? '#EF4444' : 'transparent'} />
              <Text style={{ color: document.isDislikedByUser ? '#EF4444' : '#64748B', fontSize: 13, fontWeight: '700' }}>{document.totalDislikes}</Text>
            </Pressable>

            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />

            <Pressable
              onPress={handleSave}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: document.isSavedByUser ? '#FEF9C3' : 'transparent',
              }}
            >
              <Bookmark color={document.isSavedByUser ? '#CA8A04' : '#64748B'} size={18} fill={document.isSavedByUser ? '#CA8A04' : 'transparent'} />
              <Text style={{ color: document.isSavedByUser ? '#CA8A04' : '#64748B', fontSize: 13, fontWeight: '700' }}>Lưu</Text>
            </Pressable>

            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />

            <Pressable
              onPress={handleDownload}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Download color='#475569' size={18} />
              <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700' }}>Tải về</Text>
            </Pressable>

            {!isOwner && (
              <>
                <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />
                <Pressable
                  onPress={() => setReportModalVisible(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }}
                >
                  <Flag color='#EF4444' size={18} />
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Báo lỗi</Text>
                </Pressable>
              </>
            )}
          </View>

          {isOwner && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 20,
                marginBottom: 16,
                shadowColor: '#0F172A',
                shadowOpacity: 0.02,
                shadowRadius: 12,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color='#6366F1' />
                </View>
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800' }}>Quản lý tài liệu</Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <Pressable
                  onPress={() => setEditModalVisible(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  <FileText size={16} color='#64748B' />
                  <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>Sửa thông tin</Text>
                </Pressable>

                <Pressable
                  onPress={handlePressPrivacy}
                  disabled={updatingPrivacy}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  {updatingPrivacy ? (
                    <ActivityIndicator size='small' color='#6366F1' />
                  ) : (
                    <>
                      <BookOpen size={16} color={document.isPublic ? '#10B981' : '#64748B'} />
                      <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>
                        {document.isPublic ? 'Đóng công khai' : 'Mở công khai'}
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleUploadNewVersion}
                  disabled={updatingVersion}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  {updatingVersion ? (
                    <ActivityIndicator size='small' color='#6366F1' />
                  ) : (
                    <>
                      <UploadCloud size={16} color='#6366F1' />
                      <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>Đổi file mới</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleDelete}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#FEF2F2',
                    borderWidth: 1,
                    borderColor: '#FEE2E2',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flex: 1,
                    minWidth: '45%',
                  }}
                >
                  <Trash2 size={16} color='#EF4444' />
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>Xóa tài liệu</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 20,
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOpacity: 0.02,
              shadowRadius: 12,
              elevation: 1,
            }}
          >
            <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', marginBottom: 14 }}>
              Phiên bản tài liệu ({document.versions.length})
            </Text>
            <View style={{ gap: 10 }}>
              {document.versions.map((ver) => (
                <View
                  key={ver.versionNumber}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#EFF6FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <FileText color='#3B82F6' size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                      V{ver.versionNumber}: {ver.fileName}
                    </Text>
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                      {new Date(ver.createdAt).toLocaleDateString('vi-VN')} • {formatBytes(ver.fileSize)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {!loading && document && currentUser?.role !== 'admin' && (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
          }}
        >
          <Pressable
            onPress={() => {
              if (currentUser?.role === 'admin') {
                navigation.navigate('Chat', {
                  documentId: document._id,
                  documentTitle: document.title,
                  source: 'viewer',
                  sourceSubject: document.subjectId?.name || initialSubjectName,
                })
              } else {
                navigation.navigate('MainTabs', {
                  screen: 'Chat',
                  params: {
                    documentId: document._id,
                    documentTitle: document.title,
                    source: 'viewer',
                    sourceSubject: document.subjectId?.name || initialSubjectName,
                  },
                })
              }
            }}
            style={{
              height: 52,
              borderRadius: 14,
              backgroundColor: '#8678EA',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: '#8678EA',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Sparkles color='#FFFFFF' size={18} />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Hỏi AI về tài liệu này</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={reportModalVisible} transparent animationType='fade' onRequestClose={() => setReportModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
          onPress={() => setReportModalVisible(false)}
        >
          <Pressable
            onPress={() => null}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              paddingBottom: 24,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
            >
              <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Báo cáo vi phạm</Text>
              <Pressable onPress={() => setReportModalVisible(false)}>
                <X color='#64748B' size={20} />
              </Pressable>
            </View>
            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 12 }}>
              Vui lòng cho biết lý do bạn báo cáo tài liệu này (nội dung spam, bản quyền, sai môn học, v.v.)
            </Text>

            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder='Nhập lý do chi tiết...'
              placeholderTextColor='#94A3B8'
              multiline
              style={{
                minHeight: 100,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
                padding: 14,
                color: '#0F172A',
                fontSize: 14,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
            />

            <Pressable
              onPress={handleReport}
              disabled={reporting}
              style={{
                height: 54,
                borderRadius: 18,
                backgroundColor: reporting ? '#94A3B8' : '#EF4444',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 10,
              }}
            >
              {reporting ? (
                <ActivityIndicator size='small' color='#FFFFFF' />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Gửi đơn báo cáo</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={fullscreen} animationType='fade' transparent={false} onRequestClose={() => setFullscreen(false)}>
        <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: Platform.OS === 'ios' ? 44 : 20 }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', flex: 1, marginRight: 12 }} numberOfLines={1}>
              {document?.title || ''}
            </Text>
            <Pressable
              onPress={() => setFullscreen(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minimize size={16} color='#FFFFFF' />
            </Pressable>
          </View>
          
          <WebView
            source={{ uri: webViewUrl }}
            style={{ flex: 1 }}
            scalesPageToFit
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          />
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType='fade' onRequestClose={() => setEditModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
          onPress={() => setEditModalVisible(false)}
        >
          <Pressable
            onPress={() => null}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              paddingBottom: 24,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5,
            }}
          >

            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
            >
              <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Sửa thông tin tài liệu</Text>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <X color='#64748B' size={20} />
              </Pressable>
            </View>

            <View style={{ gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>Tiêu đề tài liệu</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder='Nhập tiêu đề tài liệu mới...'
                  placeholderTextColor='#94A3B8'
                  style={{
                    height: 52,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    backgroundColor: '#F8FAFC',
                    paddingHorizontal: 14,
                    color: '#0F172A',
                    fontSize: 14,
                  }}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>Mô tả tài liệu</Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder='Mô tả ngắn gọn về tài liệu...'
                  placeholderTextColor='#94A3B8'
                  multiline
                  style={{
                    minHeight: 100,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    backgroundColor: '#F8FAFC',
                    padding: 14,
                    color: '#0F172A',
                    fontSize: 14,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => setEditModalVisible(false)}
                  style={{
                    flex: 1,
                    height: 54,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#64748B', fontWeight: '800' }}>Hủy bỏ</Text>
                </Pressable>
                <Pressable
                  onPress={handleUpdateMetadata}
                  style={{
                    flex: 1.5,
                    height: 54,
                    borderRadius: 18,
                    backgroundColor: '#0F172A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Lưu thay đổi</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={showQuickChat}
        animationType='slide'
        transparent
        onRequestClose={() => setShowQuickChat(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.3)' }}>
            <Pressable 
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
              onPress={() => setShowQuickChat(false)} 
            />
            
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '70%',
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                shadowColor: '#0F172A',
                shadowOpacity: 0.1,
                shadowRadius: 15,
                elevation: 10,
                paddingBottom: Platform.OS === 'ios' ? 34 : 24,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingVertical: 18,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(134, 120, 234, 0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Sparkles size={18} color='#8678EA' />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    Trợ lý học tập AI
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                    Đang hỏi về: {document?.title}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowQuickChat(false)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color='#64748B' />
                </Pressable>
              </View>

              {loadingChat ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size='small' color='#8678EA' />
                  <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>
                    Đang kết nối hội thoại...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={chatMessages}
                  style={{ flex: 1 }}
                  keyExtractor={(_: any, i: number) => i.toString()}
                  contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                  ref={(r: any) => {
                    setTimeout(() => r?.scrollToEnd({ animated: true }), 100)
                  }}
                  renderItem={({ item }: { item: any }) => {
                    const isUser = item.sender === 'user'
                    return (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: isUser ? 'flex-end' : 'flex-start',
                          marginBottom: 14,
                        }}
                      >
                        {!isUser && (
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              backgroundColor: '#8678EA',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 8,
                              marginTop: 2,
                            }}
                          >
                            <Sparkles size={13} color='#FFFFFF' />
                          </View>
                        )}
                        <View
                          style={{
                            maxWidth: '75%',
                            backgroundColor: isUser ? '#8678EA' : '#F1F5F9',
                            borderRadius: 18,
                            borderTopRightRadius: isUser ? 4 : 18,
                            borderTopLeftRadius: isUser ? 18 : 4,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text
                            style={{
                              color: isUser ? '#FFFFFF' : '#0F172A',
                              fontSize: 14,
                              lineHeight: 20,
                            }}
                          >
                            {item.textContent}
                          </Text>
                        </View>
                      </View>
                    )
                  }}
                  ListEmptyComponent={
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                      <Sparkles size={36} color='#94A3B8' />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B', marginTop: 12 }}>
                        Trò chuyện với AI của tài liệu
                      </Text>
                      <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
                        Hãy gửi câu hỏi về nội dung tài liệu này, trợ lý AI sẽ trả lời bạn tức thì!
                      </Text>
                    </View>
                  }
                />
              )}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingTop: 10,
                  paddingBottom: Platform.OS === 'ios' ? 0 : 12,
                  borderTopWidth: 1,
                  borderTopColor: '#F1F5F9',
                  alignSelf: 'stretch',
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <TextInput
                    value={chatDraft}
                    onChangeText={setChatDraft}
                    placeholder='Hỏi AI điều gì đó về tài liệu...'
                    placeholderTextColor='#94A3B8'
                    style={{
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: '#F1F5F9',
                      paddingHorizontal: 16,
                      color: '#0F172A',
                      fontSize: 14,
                      width: '100%',
                    }}
                  />
                </View>
                <Pressable
                  onPress={handleSendChatMessage}
                  disabled={!chatDraft.trim() || sendingChat}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: chatDraft.trim() && !sendingChat ? '#8678EA' : '#CBD5E1',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1,
                    flexShrink: 0,
                  })}
                >
                  {sendingChat ? (
                    <ActivityIndicator size='small' color='#FFFFFF' />
                  ) : (
                    <Send size={18} color='#FFFFFF' />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Xác Nhận DMCA & Bản Quyền khi mở Công khai */}
      <Modal
        visible={dmcaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDmcaModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 22,
              shadowColor: '#0F172A',
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            {/* Header Icon */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                  marginBottom: 10,
                }}
              >
                <ShieldCheck size={28} color="#059669" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                Xác nhận Điều khoản DMCA
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 2 }}>
                Xác nhận bản quyền trước khi mở công khai
              </Text>
            </View>

            {/* Content Box */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                Bằng việc mở công khai tài liệu này, bạn xác nhận rằng:
              </Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Check size={14} color="#059669" style={{ marginTop: 3 }} />
                  <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 18 }}>
                    Tài liệu do bạn tự biên soạn hoặc thuộc quyền sở hữu/chia sẻ hợp pháp của bạn.
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Check size={14} color="#059669" style={{ marginTop: 3 }} />
                  <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 18 }}>
                    Tuân thủ chính sách bảo vệ bản quyền tác giả DMCA (Digital Millennium Copyright Act) của StudyHub.
                  </Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setDmcaModalVisible(false)}
                disabled={updatingPrivacy}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => executePrivacyUpdate(true, true)}
                disabled={updatingPrivacy}
                style={{
                  flex: 1.5,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: '#059669',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#059669',
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {updatingPrivacy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                    Đồng ý & Mở công khai
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  )
}
