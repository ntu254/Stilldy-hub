import React, { useEffect, useState, useCallback } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View, Image, Platform, Alert, LayoutAnimation, UIManager, Linking } from 'react-native'
import { BookOpen, Filter, Plus, Search, FileText, X, UploadCloud, Download, CheckCircle, AlertCircle, Sparkles, Tag, Eye, User, HardDrive, Lock, ExternalLink, Trash2, Globe, Star, Ellipsis, Pencil, Share2, Image as ImageIcon } from 'lucide-react-native'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import { useToast } from '../../components/ui/ToastProvider'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'

import { documentsApi, DocumentInfo } from '../../api/documentsApi'
import { categoriesApi, Category } from '../../api/categoriesApi'

type SelectedFile = {
  name: string
  uri: string
  mimeType?: string | null
  size?: number | null
}

const PRESET_COLORS = ['#DBEAFE', '#E0F2FE', '#DCFCE7', '#E9D5FF', '#FDE68A']

function getDocColor(id: string) {
  if (!id) return PRESET_COLORS[0]
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PRESET_COLORS[sum % PRESET_COLORS.length]
}

function getFileTypeLabel(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'webp', 'heic'].includes(ext)) return 'Image'
  if (['ppt', 'pptx'].includes(ext)) return 'Slides'
  if (['xls', 'xlsx'].includes(ext)) return 'Sheets'
  if (['doc', 'docx'].includes(ext)) return 'Doc'
  return ext.toUpperCase() || 'PDF'
}

function formatBytes(bytes?: number) {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DocumentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute()
  const toast = useToast()
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const token = useSelector((state: RootState) => state.auth.token)

  // States cho danh sách tài liệu và chuyên mục
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState<'public' | 'mine' | 'saved'>('public')

  // In-memory cache for instant tab switching (0ms delay)
  const docsCache = React.useRef<Record<string, DocumentInfo[]>>({})

  // Custom Delete Modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Document Options Menu states
  const [optionsVisible, setOptionsVisible] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 })

  // Edit Metadata Modal states
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [updatingMetadata, setUpdatingMetadata] = useState(false)
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false)

  const handleOpenOptions = (item: DocumentInfo, event: any) => {
    const { pageX, pageY } = event?.nativeEvent || { pageX: 200, pageY: 200 }
    
    const uploaderId = typeof item.uploadedBy === 'object' ? (item.uploadedBy?._id || (item.uploadedBy as any)?.id) : item.uploadedBy
    const isOwner = currentUser?.id ? String(uploaderId) === String(currentUser.id) : false
    const isUserAdmin = currentUser?.role === 'admin'
    const canModify = isOwner || isUserAdmin
    const approximateHeight = canModify ? 280 : 130

    const { Dimensions } = require('react-native')
    const screenHeight = Dimensions.get('window').height

    let yPos = pageY + 12
    if (yPos + approximateHeight > screenHeight - 60) {
      yPos = pageY - approximateHeight - 12
    }

    setDropdownPosition({ x: pageX - 210, y: yPos })
    setSelectedDoc(item)
    setOptionsVisible(true)
  }

  const handleTriggerEdit = () => {
    if (!selectedDoc) return
    setEditTitle(selectedDoc.title)
    setEditDescription(selectedDoc.description || '')
    setOptionsVisible(false)
    setEditModalVisible(true)
  }

  const handleSaveMetadata = async () => {
    if (!selectedDoc) return
    if (!editTitle.trim()) {
      toast.error('Vui lòng nhập tên tài liệu!')
      return
    }
    setUpdatingMetadata(true)
    try {
      await documentsApi.updateDocument(selectedDoc._id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      })
      toast.success('Cập nhật tài liệu thành công!')
      setEditModalVisible(false)
      setSelectedDoc(null)
      docsCache.current = {} // Clear cache
      loadDocuments(true)
    } catch (err: any) {
      toast.error(err?.toString() || 'Cập nhật tài liệu thất bại.')
    } finally {
      setUpdatingMetadata(false)
    }
  }

  const handleTogglePrivacy = async () => {
    if (!selectedDoc) return
    setUpdatingPrivacy(true)
    try {
      const isPublic = !selectedDoc.isPublic
      await documentsApi.updatePrivacy(selectedDoc._id, isPublic)
      toast.success(isPublic ? 'Đã chuyển tài liệu sang Công khai!' : 'Đã chuyển tài liệu sang Riêng tư!')
      setOptionsVisible(false)
      setSelectedDoc(null)
      docsCache.current = {} // Clear cache
      loadDocuments(true)
    } catch (err: any) {
      toast.error(err?.toString() || 'Thay đổi quyền riêng tư thất bại.')
    } finally {
      setUpdatingPrivacy(false)
    }
  }

  const handleShareLink = async () => {
    if (!selectedDoc) return
    try {
      const res = await documentsApi.getShareLink(selectedDoc._id)
      setOptionsVisible(false)
      
      const shareUrl = res.shareLink
      const { Share } = require('react-native')
      await Share.share({
        message: `Tham khảo tài liệu "${selectedDoc.title}" trên Nexus: ${shareUrl}`,
        url: shareUrl,
        title: selectedDoc.title,
      })
      setSelectedDoc(null)
    } catch (err: any) {
      toast.error(err?.toString() || 'Lấy link chia sẻ thất bại.')
    }
  }

  const handleViewDetailFromOptions = () => {
    if (!selectedDoc) return
    setOptionsVisible(false)
    const subjectName = selectedDoc.subjectId?.name || 'Thiết bị'
    navigation.navigate('DocumentViewer', {
      documentId: selectedDoc._id,
      documentTitle: selectedDoc.title,
      sourceSubject: subjectName,
    })
    setSelectedDoc(null)
  }

  const handleDownloadFromOptions = () => {
    if (!selectedDoc) return
    setOptionsVisible(false)
    handleDownloadDocument(selectedDoc._id, selectedDoc.title)
    setSelectedDoc(null)
  }

  const handleDeleteFromOptions = () => {
    if (!selectedDoc) return
    setOptionsVisible(false)
    handleDeleteDocument(selectedDoc._id, selectedDoc.title)
    setSelectedDoc(null)
  }

  // Listen to navigation route tab parameters
  useEffect(() => {
    const params = route.params as { tab?: 'public' | 'mine' | 'saved' } | undefined
    if (params?.tab) {
      setActiveTab(params.tab)
      // Reset parameter to prevent stickiness when navigating normally later
      navigation.setParams({ tab: undefined } as any)
    }
  }, [route.params])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilterId, setSubjectFilterId] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<'All' | 'pdf' | 'docx' | 'pptx' | 'png'>('All')
  const [modeFilter, setModeFilter] = useState<'All' | 'public' | 'private'>('All')

  // Modals
  const [filterVisible, setFilterVisible] = useState(false)
  const [uploadVisible, setUploadVisible] = useState(false)

  // Form Upload
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadSubjectId, setUploadSubjectId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'meta-form' | 'uploading' | 'completed' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [createdDocId, setCreatedDocId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const resetUploadModal = () => {
    setUploadState('idle')
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadError('')
    setCreatedDocId(null)
    setUploadTitle('')
    setUploadDescription('')
    setUploadSubjectId(categories.length > 0 ? categories[0]._id : '')
    setTagInput('')
    setTags([])
    setUploadVisible(false)
  }

  // Tải danh mục một lần khi khởi chạy
  useEffect(() => {
    async function loadCategories() {
      try {
        const list = await categoriesApi.getCategories()
        setCategories(list)
        if (list.length > 0) {
          setUploadSubjectId(list[0]._id)
        }
      } catch (err) {
        console.warn('Cannot load categories:', err)
      }
    }
    loadCategories()
  }, [])

  // Enable LayoutAnimation for Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  const handleTabChange = (tab: 'public' | 'mine' | 'saved') => {
    if (tab === activeTab) return

    const cacheKey = `${tab}_${searchQuery}_${subjectFilterId}_${typeFilter}_${modeFilter}`
    if (docsCache.current[cacheKey]) {
      setDocuments(docsCache.current[cacheKey])
    } else {
      setLoading(true)
    }

    setActiveTab(tab)
  }

  // Tải tài liệu với caching tức thì (Instant Cache)
  const loadDocuments = useCallback(async (isRefresh = false) => {
    const cacheKey = `${activeTab}_${searchQuery}_${subjectFilterId}_${typeFilter}_${modeFilter}`

    if (isRefresh) {
      setRefreshing(true)
    } else if (docsCache.current[cacheKey]) {
      setDocuments(docsCache.current[cacheKey])
      setLoading(false)
    } else {
      setLoading(true)
    }

    try {
      const apiParams: any = {}
      if (searchQuery.trim()) {
        apiParams.title = searchQuery.trim()
      }
      if (subjectFilterId !== 'All') {
        apiParams.subjectId = subjectFilterId
      }
      if (typeFilter !== 'All') {
        apiParams.fileType = typeFilter
      }

      let data: DocumentInfo[] = []
      if (activeTab === 'public') {
        const res = await documentsApi.getPublicDocuments(apiParams)
        data = res.data || []
      } else if (activeTab === 'mine') {
        const res = await documentsApi.getMyDocuments(apiParams)
        data = res.data || []
      } else {
        data = await documentsApi.getSavedDocuments()
      }

      if (modeFilter === 'public') {
        data = data.filter((d) => d.isPublic === true)
      } else if (modeFilter === 'private') {
        data = data.filter((d) => d.isPublic === false)
      }

      // Lưu bộ nhớ đệm
      docsCache.current[cacheKey] = data
      setDocuments(data)
    } catch (err: any) {
      console.warn('Error fetching documents list:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab, searchQuery, subjectFilterId, typeFilter, modeFilter])

  // Refresh danh sách mỗi khi các bộ lọc hoặc tab thay đổi, hoặc khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      const params = route.params as { tab?: 'public' | 'mine' | 'saved' } | undefined
      if (params?.tab) {
        setActiveTab(params.tab)
        navigation.setParams({ tab: undefined } as any)
      } else {
        loadDocuments()
      }
    }, [route.params, loadDocuments])
  )

  const handleDeleteDocument = (docId: string, title: string) => {
    setDocToDelete({ id: docId, title })
    setDeleteModalVisible(true)
  }

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return
    setDeleting(true)
    try {
      await documentsApi.deleteDocument(docToDelete.id)
      docsCache.current = {} // Clear cache on delete
      toast.success('Đã xóa tài liệu thành công!')
      setDeleteModalVisible(false)
      setDocToDelete(null)
      loadDocuments(true)
    } catch (err: any) {
      toast.error(err?.toString() || 'Xóa tài liệu thất bại.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleSave = async (docId: string) => {
    try {
      // Optimistic update
      setDocuments((prevDocs) =>
        prevDocs.map((doc) => {
          if (doc._id === docId) {
            return { ...doc, isSavedByUser: !doc.isSavedByUser }
          }
          return doc
        })
      )

      const result = await documentsApi.toggleSave(docId)
      docsCache.current = {} // Clear cache on save toggle
      if (result.isSaved) {
        toast.success('Đã lưu tài liệu vào danh sách yêu thích!')
      } else {
        toast.success('Đã bỏ lưu tài liệu!')
      }
    } catch (err: any) {
      toast.error(err?.toString() || 'Lỗi khi lưu tài liệu.')
      loadDocuments(true)
    }
  }

  const handleDownloadDocument = async (docId: string, title: string) => {
    try {
      toast.success('Bắt đầu tải xuống...')
      const downloadUrl = documentsApi.getDownloadUrl(docId)
      
      // Clean title for local cache filename
      const cleanTitle = title.replace(/[^a-zA-Z0-9.\-_]/g, '_')
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
            dialogTitle: `Tải tài liệu: ${title}`,
          })
        } else {
          Alert.alert('Đã tải tệp về thiết bị', `Tệp đã được tải và lưu tạm thời tại:\n${downloadResult.uri}`)
        }
      } else {
        throw new Error('Lỗi máy chủ khi tải tệp.')
      }
    } catch (err: any) {
      console.error('[Download Error]:', err)
      toast.error('Tải trực tiếp thất bại, đang chuyển sang xem trực tuyến...')
      navigation.navigate('DocumentViewer', {
        documentId: docId,
        documentTitle: title,
      })
    }
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
  }

  const pickFile = async () => {
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

      const nextFile: SelectedFile = {
        name: asset.name ?? 'Chưa đặt tên file',
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      }

      setSelectedFile(nextFile)
      // Pre-fill Title input (removing extension)
      const baseName = asset.name.replace(/\.[^/.]+$/, '')
      setUploadTitle(baseName)
      // Auto tag based on file extension
      const ext = asset.name.split('.').pop()?.toUpperCase()
      setTags(ext ? [ext] : [])
      setUploadState('meta-form')
    } catch (error) {
      console.warn('Lỗi chọn tệp:', error)
    }
  }

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleUpload = async () => {
    if (uploading) return
    if (!selectedFile) {
      toast.warning('Vui lòng chọn một tệp tin trước!')
      return
    }
    if (!uploadTitle.trim()) {
      toast.warning('Vui lòng nhập tiêu đề tài liệu.')
      return
    }
    if (!uploadSubjectId) {
      toast.warning('Vui lòng chọn môn học.')
      return
    }

    setUploading(true)
    setUploadState('uploading')
    setUploadProgress(10)
    setUploadError('')

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 10
      })
    }, 150)

    try {
      const formData = new FormData()
      formData.append('title', uploadTitle.trim())
      formData.append('description', uploadDescription.trim() || 'Tài liệu học tập')
      formData.append('subjectId', uploadSubjectId)
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      } as any)

      if (tags.length > 0) {
        tags.forEach((tag) => formData.append('tags', tag))
      }

      setUploadProgress(30)

      const result = await documentsApi.uploadDocument(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      const docId = result?._id || null
      setCreatedDocId(docId)

      setUploadState('completed')
      docsCache.current = {} // Clear cache on new upload
      toast.success('Tài liệu đã được tải lên thành công!')
      loadDocuments(true)
    } catch (err: any) {
      clearInterval(progressInterval)
      const errorMsg = err?.toString() || 'Đã xảy ra lỗi khi tải lên tài liệu.'
      setUploadError(errorMsg)
      setUploadState('error')
      toast.error(errorMsg)
    } finally {
      setUploading(false)
    }
  }

  const activeSubjectName = categories.find((c) => c._id === subjectFilterId)?.name || 'Tất cả'

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={() => loadDocuments(true)}
        ListHeaderComponent={() => (
          <View style={{ backgroundColor: '#F8FAFC' }}>
            {/* Brand Header */}
            <View
              style={{
                paddingTop: Platform.OS === 'ios' ? 54 : 44,
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
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '900', fontStyle: 'italic', color: '#0F172A', letterSpacing: -0.5 }}>
                NEXUS<Text style={{ color: '#8678EA', fontStyle: 'normal' }}>.</Text>
              </Text>
              <Pressable
                onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
                style={{
                  shadowColor: '#8678EA',
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 1,
                }}
              >
                <Image
                  source={{ uri: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80' }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    borderWidth: 1.5,
                    borderColor: '#8678EA',
                  }}
                />
              </Pressable>
            </View>

            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 14,
                borderRadius: 28,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 16,
                shadowColor: '#0F172A',
                shadowOpacity: 0.06,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: '#0F172A',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <BookOpen color='#FFFFFF' size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '900' }}>Kho tài liệu</Text>
                  <Text style={{ color: '#64748B', marginTop: 3, fontSize: 13, lineHeight: 18 }}>
                    Khám phá và tải tài liệu học tập của cộng đồng.
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 16 }}>
              {[
                { key: 'public', label: 'Khám phá' },
                { key: 'mine', label: 'Của tôi' },
                { key: 'saved', label: 'Đã lưu' },
              ].map((tab) => {
                const active = activeTab === tab.key
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => handleTabChange(tab.key as any)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: active ? '#8678EA' : '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#FFFFFF' : '#64748B' }}>
                      {tab.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 14 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  height: 54,
                }}
              >
                <Search color='#94A3B8' size={18} />
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholder='Tìm theo tiêu đề tài liệu...'
                  placeholderTextColor='#94A3B8'
                  style={{ flex: 1, marginLeft: 10, color: '#0F172A', fontSize: 15 }}
                />
              </View>
              <Pressable
                onPress={() => setFilterVisible(true)}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: '#0F172A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Filter color='#FFFFFF' size={18} />
              </Pressable>
            </View>

            {(subjectFilterId !== 'All' || typeFilter !== 'All') && (
              <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {subjectFilterId !== 'All' && <Chip label={`Môn: ${activeSubjectName}`} />}
                {typeFilter !== 'All' && <Chip label={`Loại: ${typeFilter.toUpperCase()}`} />}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={() => {
          if (loading && !refreshing) {
            return (
              <View style={{ paddingVertical: 40, justifyContent: 'center', alignItems: 'center', marginHorizontal: 20 }}>
                <ActivityIndicator size='large' color='#8678EA' />
                <Text style={{ marginTop: 12, color: '#64748B' }}>Đang tải danh sách tài liệu...</Text>
              </View>
            )
          }
          return (
            <View style={{ paddingVertical: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, marginHorizontal: 20 }}>
              <FileText color='#CBD5E1' size={48} />
              <Text style={{ marginTop: 16, color: '#64748B', textAlign: 'center', fontWeight: '600' }}>
                Không tìm thấy tài liệu nào.
              </Text>
              <Text style={{ marginTop: 6, color: '#94A3B8', textAlign: 'center', fontSize: 13 }}>
                Hãy thử thay đổi từ khóa hoặc bộ lọc của bạn.
              </Text>
            </View>
          )
        }}
        contentContainerStyle={{ paddingBottom: 170 }}
        renderItem={({ item }) => {
          const subjectName = item.subjectId?.name || 'Thiết bị'
          const latestVersion = item.versions?.[item.versions.length - 1]
          const fileName = latestVersion?.fileName || ''
          const fileSize = latestVersion?.fileSize || 0
          const ext = fileName.split('.').pop()?.toLowerCase() || ''
          const fileTypeUpper = ext.toUpperCase() || 'DOCX'

          const uploaderId = typeof item.uploadedBy === 'object' ? (item.uploadedBy?._id || (item.uploadedBy as any)?.id) : item.uploadedBy
          const isOwner = currentUser?.id ? String(uploaderId) === String(currentUser.id) : false

          const uploaderName =
            item.uploadedBy?.displayName ||
            item.uploadedBy?.fullName ||
            (item.uploadedBy?.email ? item.uploadedBy.email.split('@')[0] : '') ||
            'Ẩn danh'
          const isPrivate = !item.isPublic || String(item.isPublic) === 'false'
          // PRIVACY LOCK RULE: Only lock if document is Private AND current user is NOT the uploader (isOwner)!
          // The Uploader (isOwner) CAN ALWAYS VIEW their own private documents!
          const isLocked = isPrivate && !isOwner
          const isSaved = item.isSavedByUser || false

          // Calculate time ago string
          const createdAtDate = item.createdAt ? new Date(item.createdAt) : null
          const timeAgo = createdAtDate
            ? `${Math.max(1, Math.floor((Date.now() - createdAtDate.getTime()) / (1000 * 60)))} phút trước`
            : ''

          return (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 20,
                marginHorizontal: 20,
                marginBottom: 16,
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              {/* Header Row: Document Icon Circle + Star & More menu */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                {(() => {
                  const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
                  return (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: isImg ? '#F5F3FF' : '#EFF6FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isImg ? (
                        <ImageIcon color='#8B5CF6' size={22} />
                      ) : (
                        <FileText color='#3B82F6' size={22} />
                      )}
                    </View>
                  )
                })()}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable hitSlop={10} onPress={() => handleToggleSave(item._id)}>
                    <Star
                      size={20}
                      color={isSaved ? '#EAB308' : '#94A3B8'}
                      fill={isSaved ? '#EAB308' : 'transparent'}
                    />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={(e) => handleOpenOptions(item, e)}>
                    <Ellipsis size={18} color='#94A3B8' />
                  </Pressable>
                </View>
              </View>

              {/* Sub-header Badges Row: Time ago, Subject Tag, Privacy Badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {timeAgo ? (
                  <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '500' }}>{timeAgo}</Text>
                ) : null}

                {timeAgo ? <Text style={{ fontSize: 12, color: '#CBD5E1' }}>•</Text> : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <HardDrive size={13} color='#94A3B8' />
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>{subjectName}</Text>
                </View>

                <Text style={{ fontSize: 12, color: '#CBD5E1' }}>•</Text>

                {/* Privacy Badge */}
                {isPrivate ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      backgroundColor: '#FEF3C7',
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                    }}
                  >
                    <Lock size={11} color='#B45309' />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>Riêng tư</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      backgroundColor: '#DCFCE7',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                    }}
                  >
                    <Globe size={11} color='#15803D' />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>Công khai</Text>
                  </View>
                )}
              </View>

              {/* Document Title */}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#0F172A',
                  lineHeight: 22,
                  marginBottom: 4,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {/* File Size */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 14 }}>
                {formatBytes(fileSize)}
              </Text>

              {/* Description Box */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#F1F5F9',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Sparkles size={14} color='#6366F1' />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#6366F1' }}>Mô tả</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                  {item.description || 'Tài liệu học tập'}
                </Text>
              </View>

              {/* Divider Line */}
              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 14 }} />

              {/* Card Footer Row: File Format Badge (Left), View Action (Center), Delete/Action Button (Right) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* File Format Badge */}
                <View
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    {fileTypeUpper}
                  </Text>
                </View>

                {/* View Action (Center) */}
                {isLocked ? (
                  <Pressable
                    onPress={() => toast.warning('Tài liệu này ở chế độ riêng tư, không thể xem.')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      opacity: 0.45,
                    }}
                  >
                    <Lock size={16} color='#94A3B8' />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#94A3B8' }}>Xem</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() =>
                      navigation.navigate('DocumentViewer', {
                        documentId: item._id,
                        documentTitle: item.title,
                        sourceSubject: subjectName,
                      })
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}
                  >
                    <Eye size={17} color='#6366F1' />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#6366F1' }}>Xem</Text>
                  </Pressable>
                )}

                {/* Delete / Action Button (Right) */}
                {(isOwner || currentUser?.role === 'admin') ? (
                  <Pressable
                    onPress={() => handleDeleteDocument(item._id, item.title)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: '#FEF2F2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={16} color='#EF4444' />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      if (isLocked) {
                        toast.warning('Tài liệu này ở chế độ riêng tư, không thể tải xuống.')
                      } else {
                        handleDownloadDocument(item._id, item.title)
                      }
                    }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#EFF6FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Download size={17} color='#2563EB' />
                  </Pressable>
                )}
              </View>
            </View>
          )
        }}
      />

      <Pressable
        onPress={() => setUploadVisible(true)}
        style={{
          position: 'absolute',
          right: 10,
          bottom: 125,
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: '#0F172A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0F172A',
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        <Plus color='#FFFFFF' size={28} />
      </Pressable>
      <Modal visible={filterVisible} transparent animationType='fade' onRequestClose={() => setFilterVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
          onPress={() => setFilterVisible(false)}
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
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}
            >
              <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>Bộ lọc tìm kiếm</Text>
              <Pressable onPress={() => setFilterVisible(false)}>
                <X color='#64748B' size={20} />
              </Pressable>
            </View>

            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 10 }}>Môn học</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              <FilterButton
                label='Tất cả'
                active={subjectFilterId === 'All'}
                onPress={() => setSubjectFilterId('All')}
              />
              {categories.map((c) => (
                <FilterButton
                  key={c._id}
                  label={c.name}
                  active={subjectFilterId === c._id}
                  onPress={() => setSubjectFilterId(c._id)}
                />
              ))}
            </ScrollView>

            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 10, marginTop: 8 }}>Định dạng file</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {(['All', 'pdf', 'docx', 'pptx', 'png'] as const).map((type) => (
                <FilterButton
                  key={type}
                  label={type === 'All' ? 'Tất cả' : type.toUpperCase()}
                  active={typeFilter === type}
                  onPress={() => setTypeFilter(type)}
                />
              ))}
            </View>

            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 10 }}>Trạng thái tài liệu</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {(['All', 'public', 'private'] as const).map((m) => (
                <FilterButton
                  key={m}
                  label={m === 'All' ? 'Tất cả' : m === 'public' ? 'Public (Công khai)' : 'Private (Riêng tư)'}
                  active={modeFilter === m}
                  onPress={() => setModeFilter(m)}
                />
              ))}
            </View>

            <Pressable
              onPress={() => {
                setFilterVisible(false)
                loadDocuments()
              }}
              style={{
                height: 54,
                borderRadius: 18,
                backgroundColor: '#06B6D4',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Áp dụng bộ lọc</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={uploadVisible} transparent animationType='fade' onRequestClose={resetUploadModal}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', paddingHorizontal: 20 }}
          onPress={resetUploadModal}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color='#6366F1' />
                </View>
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '900' }}>Tải lên tài liệu học tập</Text>
              </View>
              <Pressable onPress={resetUploadModal}>
                <X color='#64748B' size={20} />
              </Pressable>
            </View>

            {uploadState === 'idle' && (
              <View style={{ gap: 14 }}>
                <Pressable
                  onPress={pickFile}
                  style={({ pressed }) => ({
                    height: 180,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: pressed ? '#6366F1' : '#E2E8F0',
                    backgroundColor: pressed ? '#F5F7FF' : '#F8FAFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                  })}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <UploadCloud size={24} color='#6366F1' />
                  </View>
                  <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>
                    Chọn tệp tài liệu học tập
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4, textAlign: 'center', lineHeight: 16 }}>
                    Hỗ trợ PDF, DOCX, PPTX, PNG, JPG, TXT...
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, width: '100%' }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                    <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '800', marginHorizontal: 10, textTransform: 'uppercase' }}>Hoặc</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                  </View>
                  <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 6 }}>
                    <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '700' }}>Tìm kiếm tệp...</Text>
                  </View>
                </Pressable>
              </View>
            )}

            {uploadState === 'meta-form' && selectedFile && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <FileText size={20} color='#6366F1' />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 2 }}>
                      {selectedFile.mimeType || 'Tệp tin'} • {Math.round((selectedFile.size || 0) / 1024)} KB
                    </Text>
                  </View>
                  <Pressable onPress={pickFile} style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700' }}>Thay đổi</Text>
                  </Pressable>
                </View>

                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Tên tài liệu</Text>
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>*</Text>
                  </View>
                  <TextInput
                    value={uploadTitle}
                    onChangeText={setUploadTitle}
                    placeholder='Nhập tên tài liệu học tập...'
                    placeholderTextColor='#94A3B8'
                    style={{
                      height: 48,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 14,
                      color: '#0F172A',
                      fontSize: 13,
                    }}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Mô tả ngắn</Text>
                  <TextInput
                    value={uploadDescription}
                    onChangeText={setUploadDescription}
                    placeholder='Mô tả ngắn gọn về tài liệu...'
                    placeholderTextColor='#94A3B8'
                    multiline
                    style={{
                      minHeight: 60,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      color: '#0F172A',
                      fontSize: 13,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Môn học liên quan *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                    {categories.map((c) => (
                      <FilterButton
                        key={c._id}
                        label={c.name}
                        active={uploadSubjectId === c._id}
                        onPress={() => setUploadSubjectId(c._id)}
                      />
                    ))}
                  </ScrollView>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Từ khóa / Tags</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={tagInput}
                      onChangeText={setTagInput}
                      onSubmitEditing={handleAddTag}
                      placeholder='Nhập tag ôn tập (ví dụ: SQL) rồi nhấn +...'
                      placeholderTextColor='#94A3B8'
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        backgroundColor: '#F8FAFC',
                        paddingHorizontal: 14,
                        color: '#0F172A',
                        fontSize: 13,
                      }}
                    />
                    <Pressable
                      onPress={handleAddTag}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: '#0F172A',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={20} color='#FFFFFF' />
                    </Pressable>
                  </View>

                  {tags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {tags.map((tag) => (
                        <View
                          key={tag}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#EEF2F6',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            borderRadius: 8,
                            paddingLeft: 8,
                            paddingRight: 4,
                            paddingVertical: 4,
                            gap: 4,
                          }}
                        >
                          <Tag size={10} color='#6366F1' />
                          <Text style={{ color: '#6366F1', fontSize: 10, fontWeight: '700' }}>{tag}</Text>
                          <Pressable onPress={() => handleRemoveTag(tag)} style={{ padding: 2 }}>
                            <X size={10} color='#64748B' />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14, marginTop: 6 }}>
                  <Pressable
                    onPress={resetUploadModal}
                    style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Hủy bỏ</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleUpload}
                    style={{ flex: 1.5, height: 44, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Bắt đầu tải lên</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}

            {uploadState === 'uploading' && selectedFile && (
              <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 10, gap: 16 }}>
                <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={28} color='#6366F1' />
                </View>
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 14, textAlign: 'center' }} numberOfLines={1}>
                    {uploadTitle}
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                    {Math.round((selectedFile.size || 0) / 1024)} KB
                  </Text>
                </View>

                <View style={{ width: '100%', marginTop: 10, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>Đang truyền tải tài liệu lên máy chủ...</Text>
                    <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '800' }}>{uploadProgress}%</Text>
                  </View>
                  <View style={{ height: 8, width: '100%', backgroundColor: '#EEF2F6', borderRadius: 999, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#6366F1', borderRadius: 999 }} />
                  </View>
                </View>
              </View>
            )}

            {uploadState === 'completed' && (
              <View style={{ alignItems: 'center', paddingVertical: 16, gap: 16 }}>
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={36} color='#10B981' />
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 16 }}>Upload thành công!</Text>
                  <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', paddingHorizontal: 20 }}>
                    Tài liệu <Text style={{ fontWeight: '700', color: '#0F172A' }}>{uploadTitle}</Text> đã được tải lên hệ thống thành công.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, width: '100%', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 10 }}>
                  <Pressable
                    onPress={resetUploadModal}
                    style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Đóng</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const id = createdDocId
                      resetUploadModal()
                      if (id) {
                        navigation.navigate('DocumentViewer', {
                          documentId: id,
                          documentTitle: uploadTitle,
                          sourceSubject: categories.find((c) => c._id === uploadSubjectId)?.name || 'Chung',
                        })
                      }
                    }}
                    style={{ flex: 1.5, height: 44, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                  >
                    <Eye size={16} color='#FFFFFF' />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Xem tài liệu</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {uploadState === 'error' && (
              <View style={{ alignItems: 'center', paddingVertical: 16, gap: 16 }}>
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={36} color='#EF4444' />
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 16 }}>Tải lên thất bại!</Text>
                  <Text style={{ color: '#EF4444', fontSize: 11, textAlign: 'center', paddingHorizontal: 20 }}>
                    {uploadError}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, width: '100%', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 10 }}>
                  <Pressable
                    onPress={resetUploadModal}
                    style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Đóng</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setUploadState('meta-form')}
                    style={{ flex: 1.5, height: 44, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Thử lại</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {(uploadState === 'idle' || uploadState === 'meta-form') && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F5F7FF', borderWidth: 1, borderColor: '#E0E7FF', borderRadius: 12, padding: 10, marginTop: 14 }}>
                <AlertCircle size={14} color='#6366F1' style={{ marginTop: 2 }} />
                <Text style={{ color: '#6366F1', fontSize: 10, flex: 1, lineHeight: 14 }}>
                  <Text style={{ fontWeight: '800' }}>Lưu ý:</Text> Hệ thống hỗ trợ tải lên file tài liệu học tập tối đa 25MB định dạng PDF, Word, PowerPoint, PNG, JPG, TXT...
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType='fade'
        onRequestClose={() => {
          if (!deleting) {
            setDeleteModalVisible(false)
            setDocToDelete(null)
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => {
              if (!deleting) {
                setDeleteModalVisible(false)
                setDocToDelete(null)
              }
            }}
          />

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              width: '88%',
              maxWidth: 360,
              padding: 24,
              shadowColor: '#0F172A',
              shadowOpacity: 0.2,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 },
              elevation: 12,
              alignItems: 'center',
            }}
          >
            {/* Warning Icon Badge */}
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={30} color='#EF4444' />
            </View>

            {/* Modal Title */}
            <Text style={{ fontSize: 19, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
              Xác nhận xóa tài liệu
            </Text>

            {/* Modal Message */}
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              Bạn có chắc chắn muốn xóa tài liệu <Text style={{ fontWeight: '700', color: '#0F172A' }}>"{docToDelete?.title}"</Text> không? Hành động này không thể hoàn tác.
            </Text>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable
                onPress={() => {
                  setDeleteModalVisible(false)
                  setDocToDelete(null)
                }}
                disabled={deleting}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#475569', fontWeight: '800', fontSize: 14 }}>HỦY BỎ</Text>
              </Pressable>

              <Pressable
                onPress={confirmDeleteDocument}
                disabled={deleting}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#EF4444',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size='small' color='#FFFFFF' />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>XÓA TÀI LIỆU</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Document Options Menu Modal (Dropdown Style) */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType='fade'
        onRequestClose={() => {
          setOptionsVisible(false)
          setSelectedDoc(null)
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
          onPress={() => {
            setOptionsVisible(false)
            setSelectedDoc(null)
          }}
        >
          {(() => {
            const { Dimensions } = require('react-native')
            const screenWidth = Dimensions.get('window').width
            const leftPos = Math.max(16, Math.min(screenWidth - 236, dropdownPosition.x))

            return (
              <View
                style={{
                  position: 'absolute',
                  top: dropdownPosition.y,
                  left: leftPos,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  width: 220,
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 10,
                  padding: 6,
                }}
              >
                {/* Menu Options */}
                <View style={{ gap: 2 }}>
                  {/* Option 1: View detail */}
                  <Pressable
                    onPress={handleViewDetailFromOptions}
                    style={({ pressed }) => ({
                      borderRadius: 12,
                      backgroundColor: pressed ? '#F5F3FF' : 'transparent',
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
                      <Eye size={16} color='#64748B' style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155' }}>Xem chi tiết</Text>
                    </View>
                  </Pressable>

                  {/* Owner/Admin Options */}
                  {(() => {
                    if (!selectedDoc) return null
                    const uploaderId = typeof selectedDoc.uploadedBy === 'object' ? (selectedDoc.uploadedBy?._id || (selectedDoc.uploadedBy as any)?.id) : selectedDoc.uploadedBy
                    const isOwner = currentUser?.id ? String(uploaderId) === String(currentUser.id) : false
                    const isUserAdmin = currentUser?.role === 'admin'
                    const canModify = isOwner || isUserAdmin

                    if (!canModify) return null

                    return (
                      <>
                        {/* Option 2: Edit metadata */}
                        <Pressable
                          onPress={handleTriggerEdit}
                          style={({ pressed }) => ({
                            borderRadius: 12,
                            backgroundColor: pressed ? '#F5F3FF' : 'transparent',
                          })}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
                            <Pencil size={16} color='#64748B' style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155' }}>Chỉnh sửa</Text>
                          </View>
                        </Pressable>
                      </>
                    )
                  })()}

                  {/* Option 3: Download */}
                  <Pressable
                    onPress={handleDownloadFromOptions}
                    style={({ pressed }) => ({
                      borderRadius: 12,
                      backgroundColor: pressed ? '#F5F3FF' : 'transparent',
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
                      <Download size={16} color='#64748B' style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155' }}>Tải xuống</Text>
                    </View>
                  </Pressable>

                  {/* Owner/Admin Options (Privacy Toggle) */}
                  {(() => {
                    if (!selectedDoc) return null
                    const uploaderId = typeof selectedDoc.uploadedBy === 'object' ? (selectedDoc.uploadedBy?._id || (selectedDoc.uploadedBy as any)?.id) : selectedDoc.uploadedBy
                    const isOwner = currentUser?.id ? String(uploaderId) === String(currentUser.id) : false
                    const isUserAdmin = currentUser?.role === 'admin'
                    const canModify = isOwner || isUserAdmin

                    if (!canModify) return null

                    return (
                      <>
                        {/* Option 4: Change Privacy */}
                        <Pressable
                          onPress={handleTogglePrivacy}
                          style={({ pressed }) => ({
                            borderRadius: 12,
                            backgroundColor: pressed ? '#F5F3FF' : 'transparent',
                          })}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
                            {selectedDoc.isPublic ? (
                              <>
                                <Lock size={16} color='#64748B' style={{ marginRight: 10 }} />
                                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155' }}>Chuyển Riêng tư</Text>
                              </>
                            ) : (
                              <>
                                <Globe size={16} color='#64748B' style={{ marginRight: 10 }} />
                                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155' }}>Chuyển Công khai</Text>
                              </>
                            )}
                          </View>
                        </Pressable>
                      </>
                    )
                  })()}

                  {/* Option 5: Create share link */}
                  <Pressable
                    onPress={handleShareLink}
                    style={({ pressed }) => ({
                      borderRadius: 12,
                      backgroundColor: pressed ? '#F5F3FF' : 'transparent',
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
                      <Share2 size={16} color='#64748B' style={{ marginRight: 10 }} />
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155' }}>Tạo link chia sẻ</Text>
                    </View>
                  </Pressable>

                  {/* Owner/Admin Options (Delete) */}
                  {(() => {
                    if (!selectedDoc) return null
                    const uploaderId = typeof selectedDoc.uploadedBy === 'object' ? (selectedDoc.uploadedBy?._id || (selectedDoc.uploadedBy as any)?.id) : selectedDoc.uploadedBy
                    const isOwner = currentUser?.id ? String(uploaderId) === String(currentUser.id) : false
                    const isUserAdmin = currentUser?.role === 'admin'
                    const canModify = isOwner || isUserAdmin

                    if (!canModify) return null

                    return (
                      <>
                        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 6, marginHorizontal: 10 }} />
                        {/* Option 6: Delete */}
                        <Pressable
                          onPress={handleDeleteFromOptions}
                          style={({ pressed }) => ({
                            borderRadius: 12,
                            backgroundColor: pressed ? '#FEF2F2' : 'transparent',
                          })}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
                            <Trash2 size={16} color='#EF4444' style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#EF4444' }}>Xóa tài liệu</Text>
                          </View>
                        </Pressable>
                      </>
                    )
                  })()}
                </View>
              </View>
            )
          })()}
        </Pressable>
      </Modal>

      {/* Edit Metadata Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType='fade'
        onRequestClose={() => {
          if (!updatingMetadata) {
            setEditModalVisible(false)
            setSelectedDoc(null)
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => {
              if (!updatingMetadata) {
                setEditModalVisible(false)
                setSelectedDoc(null)
              }
            }}
          />

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={16} color='#6366F1' />
                </View>
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '900' }}>Sửa thông tin tài liệu</Text>
              </View>
              <Pressable onPress={() => {
                if (!updatingMetadata) {
                  setEditModalVisible(false)
                  setSelectedDoc(null)
                }
              }}>
                <X color='#64748B' size={20} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 16 }}>
              {/* Title input */}
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Tên tài liệu</Text>
                  <Text style={{ color: '#EF4444', fontSize: 12 }}>*</Text>
                </View>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder='Nhập tên tài liệu học tập...'
                  placeholderTextColor='#94A3B8'
                  style={{
                    height: 48,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    backgroundColor: '#F8FAFC',
                    paddingHorizontal: 14,
                    color: '#0F172A',
                    fontSize: 13,
                  }}
                />
              </View>

              {/* Description input */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Mô tả ngắn</Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder='Mô tả ngắn gọn về tài liệu...'
                  placeholderTextColor='#94A3B8'
                  multiline
                  style={{
                    minHeight: 80,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    backgroundColor: '#F8FAFC',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    color: '#0F172A',
                    fontSize: 13,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 16 }}>
              <Pressable
                onPress={() => {
                  setEditModalVisible(false)
                  setSelectedDoc(null)
                }}
                disabled={updatingMetadata}
                style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Hủy bỏ</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveMetadata}
                disabled={updatingMetadata}
                style={{ flex: 1.5, height: 46, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}
              >
                {updatingMetadata ? (
                  <ActivityIndicator size='small' color='#FFFFFF' />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Lưu thay đổi</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? '#0F172A' : '#F8FAFC',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#0F172A' : '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: active ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  )
}

function UploadRow({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 20,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: '#E0F2FE',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#0F172A', fontWeight: '700' }} numberOfLines={1}>{title}</Text>
        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
      </View>
    </View>
  )
}
