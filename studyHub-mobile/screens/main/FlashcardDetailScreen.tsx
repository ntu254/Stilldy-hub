import React, { useEffect, useState, useRef } from 'react'
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, View, Platform, StyleSheet, Modal, Alert, TextInput, Image } from 'react-native'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Eye, Globe, Layers, Lock, RotateCcw, Star, Pencil, Shuffle, Maximize2, Minimize2, Check, X, AlertCircle, CheckCircle, Filter, History, Clock, TrendingUp, Calendar, Share2, Play } from 'lucide-react-native'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'

import type { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenShell from '../../components/layout/ScreenShell'
import type { RootState } from '../../redux/store'
import flashcardApi, { FlashcardCollection, CardItem } from '../../api/flashcardApi'
import learningHistoryApi, { LearningHistory } from '../../api/learningHistoryApi'
import { useToast } from '../../components/ui/ToastProvider'

interface TestQuestion {
  id: string
  type: 'multiple-choice' | 'true-false'
  term: string
  correctDefinition: string
  questionText: string
  options?: string[]
  expectedAnswer: string
  userAnswer?: string
}

export default function FlashcardDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<NativeStackScreenProps<RootStackParamList, 'FlashcardDetail'>['route']>()
  const { collectionId } = route.params
  const toast = useToast()
  const currentUser = useSelector((state: RootState) => state.auth.user)

  const handleShareOrCopyLink = async () => {
    try {
      const shareUrl = `https://studyhub.vn/flashcards/${collectionId}`
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
          await (navigator as any).clipboard.writeText(shareUrl)
          toast.show('Đã sao chép liên kết bộ thẻ!', 'success')
        }
      } else {
        const { Share } = require('react-native')
        await Share.share({
          message: `Tham khảo bộ thẻ ghi nhớ "${collection?.title || 'bộ thẻ'}" trên StudyHub: ${shareUrl}`,
          url: shareUrl,
          title: collection?.title || 'StudyHub Flashcard',
        })
        toast.show('Đã sao chép liên kết bộ thẻ!', 'success')
      }
    } catch (error) {
      toast.show('Đã sao chép liên kết bộ thẻ!', 'success')
    }
  }

  const handleTogglePublic = async () => {
    if (!collection) return
    const newStatus = !collection.isPublic
    try {
      setCollection((prev) => prev ? { ...prev, isPublic: newStatus } : null)
      await flashcardApi.update(collection._id, { isPublic: newStatus })
      toast.show(
        newStatus ? '🌐 Đã chuyển bộ thẻ sang chế độ Công khai!' : '🔒 Đã chuyển bộ thẻ sang chế độ Riêng tư!',
        'success',
        4000
      )
    } catch (error: any) {
      setCollection((prev) => prev ? { ...prev, isPublic: !newStatus } : null)
      toast.show(error?.toString() || 'Không thể thay đổi trạng thái công khai.', 'error', 4000)
    }
  }

  const [collection, setCollection] = useState<FlashcardCollection | null>(null)
  const [loading, setLoading] = useState(true)

  // Practice state
  const [cards, setCards] = useState<CardItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filterStarredOnly, setFilterStarredOnly] = useState(false)
  const [finished, setFinished] = useState(false)

  // Progress tracking states
  const [progressTracking, setProgressTracking] = useState(false)
  const [studyCards, setStudyCards] = useState<CardItem[]>([])
  const [studyIndex, setStudyIndex] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [studyingCount, setStudyingCount] = useState(0)
  const [studyFinished, setStudyFinished] = useState(false)

  // Mode selection & Fullscreen states
  const [activeMode, setActiveMode] = useState<'list' | 'study' | 'quiz' | 'test' | 'history'>('list')
  const [listFilter, setListFilter] = useState<'all' | 'starred' | 'unstarred'>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Learn/Quiz Mode state
  const [quizIndex, setQuizIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])

  // Test Mode state
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([])
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testScore, setTestScore] = useState(0)

  // Custom limits & start flags
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizLimit, setQuizLimit] = useState(10)
  const [quizCards, setQuizCards] = useState<CardItem[]>([])
  const [quizMethod, setQuizMethod] = useState<'random' | 'manual'>('random')
  const [selectedQuizCardIds, setSelectedQuizCardIds] = useState<Set<string>>(new Set())

  const [testStarted, setTestStarted] = useState(false)
  const [testLimit, setTestLimit] = useState(10)

  // Learning History state
  const testStartTimeRef = useRef<number>(Date.now())
  const [histories, setHistories] = useState<LearningHistory[]>([])
  const [loadingHistories, setLoadingHistories] = useState(false)
  const [historySortBy, setHistorySortBy] = useState<'createdAt' | 'score' | 'durationSeconds'>('createdAt')
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedHistory, setSelectedHistory] = useState<LearningHistory | null>(null)

  // Flip Animation Setup
  const [isFlipped, setIsFlipped] = useState(false)
  const isFlippedRef = useRef(false)
  const flipAnim = useRef(new Animated.Value(0)).current

  // Flip execution
  const handleCardPress = () => {
    const nextFlipped = !isFlippedRef.current
    isFlippedRef.current = nextFlipped
    setIsFlipped(nextFlipped)

    Animated.timing(flipAnim, {
      toValue: nextFlipped ? 180 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start()
  }

  // Interpolations for card flipping
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  })
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  })

  // Dynamic opacity to fix Android backfaceVisibility shadow bleed bug
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  })
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  })

  // Load collection detail
  const loadDetail = async () => {
    setLoading(true)
    try {
      const data = await flashcardApi.getById(collectionId)
      setCollection(data)
      setCards(data.cards || [])
    } catch (err: any) {
      toast.error(err.toString() || 'Không thể tải chi tiết bộ thẻ.')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      loadDetail()
    }, [collectionId])
  )

  // Reset card rotation when switching cards
  useEffect(() => {
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)
  }, [currentIndex, filterStarredOnly])

  // Filter starred cards
  useEffect(() => {
    if (!collection) return
    if (filterStarredOnly) {
      const starred = (collection.cards || []).filter(
        (c) => c.markedBy && c.markedBy.includes(currentUser?.id || '')
      )
      setCards(starred)
      setCurrentIndex(0)
      setFinished(false)
    } else {
      setCards(collection.cards || [])
      setCurrentIndex(0)
      setFinished(false)
    }
  }, [filterStarredOnly, collection])

  // Dynamic limits adjustment based on cards count and reset start flags on activeMode change
  useEffect(() => {
    const total = cards.length
    if (total > 0) {
      setQuizLimit((prev) => Math.min(prev, total) || Math.min(10, total))
      setTestLimit((prev) => Math.min(prev, total) || Math.min(10, total))
      setSelectedQuizCardIds(new Set(cards.map((c) => c._id)))
    }
  }, [cards])

  useEffect(() => {
    const userId = currentUser?.id || ''
    const mastered = cards.filter((c) => c.masteredBy && c.masteredBy.includes(userId)).length
    setMasteredCount(mastered)
    setStudyingCount(cards.length - mastered)
  }, [cards, currentUser])

  useEffect(() => {
    setQuizStarted(false)
    setTestStarted(false)
    setProgressTracking(false)
    setStudyFinished(false)
    setStudyIndex(0)
  }, [activeMode])

  const loadHistories = async () => {
    if (!collectionId) return
    setLoadingHistories(true)
    try {
      const res = await learningHistoryApi.getHistoryByFlashcard(collectionId, {
        sortBy: historySortBy,
        sortOrder: historySortOrder,
        limit: 20,
      })
      setHistories(res.list || [])
    } catch (err: any) {
      console.error('Failed to load history:', err)
    } finally {
      setLoadingHistories(false)
    }
  }

  useEffect(() => {
    if (activeMode === 'history') {
      loadHistories()
    }
  }, [activeMode, historySortBy, historySortOrder, collectionId])

  // Generate multiple choice options for Learn/Quiz Mode
  const generateQuizOptions = (idx: number) => {
    if (!collection || !collection.cards || collection.cards.length === 0) return []
    const currentCard = quizCards[idx]
    if (!currentCard) return []

    const correct = currentCard.definition
    const others = (collection.cards || [])
      .filter((c) => c._id !== currentCard._id)
      .map((c) => c.definition)

    const uniqueOthers = Array.from(new Set(others))

    const distractors: string[] = []
    const available = [...uniqueOthers]
    while (distractors.length < 3 && available.length > 0) {
      const randIdx = Math.floor(Math.random() * available.length)
      distractors.push(available[randIdx])
      available.splice(randIdx, 1)
    }

    const choices = [correct, ...distractors]
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]]
    }
    return choices
  }

  useEffect(() => {
    if (activeMode === 'quiz' && quizCards[quizIndex]) {
      setShuffledOptions(generateQuizOptions(quizIndex))
      setSelectedAnswer(null)
    }
  }, [quizIndex, activeMode, quizCards])

  // Generate test questions (50% MC, 50% TF) for Test Mode
  const generateTestQuestions = (testCardsList: CardItem[]) => {
    if (!collection || !collection.cards || collection.cards.length === 0 || testCardsList.length === 0) return []

    const shuffled = [...testCardsList]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const generated: TestQuestion[] = shuffled.map((card, index) => {
      const isMultipleChoice = index % 2 === 0
      const others = (collection.cards || [])
        .filter((c) => c._id !== card._id)
        .map((c) => c.definition)
      const uniqueOthers = Array.from(new Set(others))

      if (isMultipleChoice) {
        const distractors: string[] = []
        const available = [...uniqueOthers]
        while (distractors.length < 3 && available.length > 0) {
          const randIdx = Math.floor(Math.random() * available.length)
          distractors.push(available[randIdx])
          available.splice(randIdx, 1)
        }
        const choices = [card.definition, ...distractors]
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]]
        }
        return {
          id: card._id,
          type: 'multiple-choice',
          term: card.term,
          correctDefinition: card.definition,
          questionText: 'Chọn định nghĩa chính xác:',
          options: choices,
          expectedAnswer: card.definition,
        }
      } else {
        const isTrueAssertion = Math.random() > 0.5
        let assertionText = card.definition
        if (!isTrueAssertion && uniqueOthers.length > 0) {
          assertionText = uniqueOthers[Math.floor(Math.random() * uniqueOthers.length)]
        }
        return {
          id: card._id,
          type: 'true-false',
          term: card.term,
          correctDefinition: card.definition,
          questionText: `Định nghĩa: "${assertionText}"`,
          expectedAnswer: isTrueAssertion ? 'True' : 'False',
        }
      }
    })

    return generated
  }

  // Fisher-Yates Shuffler for Flip Cards Mode
  const handleShuffle = () => {
    if (cards.length <= 1) return
    const array = [...cards]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
    setCards(array)
    setCurrentIndex(0)
    setFinished(false)
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)
    toast.success('Đã xáo trộn danh sách thẻ!')
  }

  // Toggle mark/star card
  const handleToggleMark = async (cardId: string) => {
    try {
      const res = await flashcardApi.toggleMarkCard(collectionId, cardId)
      toast.info(res.message)

      // Update locally
      setCollection((prev) => {
        if (!prev) return null
        const updatedCards = (prev.cards || []).map((c) => {
          if (c._id === cardId) {
            let nextMarkedBy = c.markedBy ? [...c.markedBy] : []
            if (res.marked) {
              if (!nextMarkedBy.includes(currentUser?.id || '')) {
                nextMarkedBy.push(currentUser?.id || '')
              }
            } else {
              nextMarkedBy = nextMarkedBy.filter((uid) => uid !== currentUser?.id)
            }
            return { ...c, markedBy: nextMarkedBy }
          }
          return c
        })
        return { ...prev, cards: updatedCards }
      })

      // Also update studyCards state if progressTracking is active
      setStudyCards((prevStudyCards) => {
        return prevStudyCards.map((c) => {
          if (c._id === cardId) {
            let nextMarkedBy = c.markedBy ? [...c.markedBy] : []
            if (res.marked) {
              if (!nextMarkedBy.includes(currentUser?.id || '')) {
                nextMarkedBy.push(currentUser?.id || '')
              }
            } else {
              nextMarkedBy = nextMarkedBy.filter((uid) => uid !== currentUser?.id)
            }
            return { ...c, markedBy: nextMarkedBy }
          }
          return c
        })
      })
    } catch (err: any) {
      toast.error(err.toString())
    }
  }

  // Task 4: update card mastered status
  const handleMarkProgress = async (isMastered: boolean) => {
    const currentStudyCard = studyCards[studyIndex]
    if (!currentStudyCard) return

    const cardId = currentStudyCard._id
    const userId = currentUser?.id || ''

    // 1. Optimistic local update for cards list (original)
    setCards((prev) =>
      prev.map((c) => {
        if (c._id === cardId) {
          const masteredBy = c.masteredBy || []
          if (isMastered) {
            if (!masteredBy.includes(userId)) {
              return { ...c, masteredBy: [...masteredBy, userId] }
            }
          } else {
            return { ...c, masteredBy: masteredBy.filter((uid) => uid !== userId) }
          }
        }
        return c
      })
    )

    // 2. Optimistic local update for studyCards list
    setStudyCards((prev) =>
      prev.map((c) => {
        if (c._id === cardId) {
          const masteredBy = c.masteredBy || []
          if (isMastered) {
            if (!masteredBy.includes(userId)) {
              return { ...c, masteredBy: [...masteredBy, userId] }
            }
          } else {
            return { ...c, masteredBy: masteredBy.filter((uid) => uid !== userId) }
          }
        }
        return c
      })
    )

    // 3. Call background API to save progress
    flashcardApi.updateCardStatus(collectionId, cardId, isMastered).catch((err) => {
      console.error('Lỗi cập nhật tiến độ thẻ con:', err)
    })

    // Reset flip state immediately before changing index to prevent render-jump lag
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)

    // 4. Advance index or show finished screen
    if (studyIndex < studyCards.length - 1) {
      setStudyIndex(studyIndex + 1)
    } else {
      setStudyFinished(true)
    }
  }

  // Task 5: End Screen actions
  const handleFocusUnmastered = () => {
    const userId = currentUser?.id || ''
    // Filter cards from collection which are NOT mastered yet
    const unmastered = cards.filter(c => !c.masteredBy?.includes(userId))
    setStudyCards(unmastered.length > 0 ? unmastered : cards)
    setStudyIndex(0)
    setStudyFinished(false)
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)
  }

  const handleResetProgress = async () => {
    if (collectionId) {
      try {
        await flashcardApi.resetProgress(collectionId)
        toast.success('Đã đặt lại tiến độ học tập của bộ thẻ.')
      } catch (err: any) {
        toast.error(err.toString() || 'Không thể đặt lại tiến độ.')
        return
      }
    }

    const userId = currentUser?.id || ''
    // Clear masteredBy for current user on all cards locally
    const clearedCards = cards.map(c => ({
      ...c,
      masteredBy: (c.masteredBy || []).filter(uid => uid !== userId)
    }))
    setCards(clearedCards)
    setStudyCards(clearedCards)
    setStudyIndex(0)
    setStudyFinished(false)
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)
  }


  const handleNext = () => {
    // Reset flip state immediately before changing index to prevent render-jump lag
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setFinished(true)
    }
  }

  const handlePrev = () => {
    // Reset flip state immediately before changing index to prevent render-jump lag
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setFinished(false)
    setIsFlipped(false)
    isFlippedRef.current = false
    flipAnim.setValue(0)
  }

  if (loading) {
    return (
      <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </ScreenShell>
    )
  }

  if (!collection) return null

  const isOwner = typeof collection.createdBy === 'object'
    ? collection.createdBy?._id === currentUser?.id
    : collection.createdBy === currentUser?.id

  const author = typeof collection.createdBy === 'object' ? collection.createdBy : null
  const authorName = author?.displayName || (typeof collection.createdBy === 'string' ? collection.createdBy : '')
  const authorAvatar = author?.avatar

  const totalStarredCount = (collection.cards || []).filter(
    (c) => c.markedBy && c.markedBy.includes(currentUser?.id || '')
  ).length

  const activeCard = progressTracking && studyCards.length > 0
    ? studyCards[studyIndex]
    : cards[currentIndex]
  const isStarred = activeCard?.markedBy && activeCard.markedBy.includes(currentUser?.id || '')

  return (
    <ScreenShell style={{ backgroundColor: '#F8FAFC' }} topPadding={0}>
      {/* Header */}
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
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', textAlign: 'center' }} numberOfLines={1}>
            {collection.title}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={handleShareOrCopyLink}
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
            <Share2 color='#334155' size={17} />
          </Pressable>
          {isOwner && (
            <Pressable
              onPress={() => navigation.navigate('EditFlashcard', { collectionId: collection._id })}
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
              <Pencil color='#334155' size={17} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}>
        {/* Collection Header Banner Card (matching web design screenshot) */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            padding: 18,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 20,
            shadowColor: '#7C3AED',
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {/* Top Row: Icon + Title/Author + Play Button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: '#7C3AED',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#7C3AED',
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <BookOpen color="#FFFFFF" size={22} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 6 }} numberOfLines={1}>
                  {collection.title}
                </Text>

                {/* Privacy Status Badge directly under title */}
                <View style={{ flexDirection: 'row' }}>
                  <View
                    style={{
                      backgroundColor: collection.isPublic ? '#E8F5E9' : '#FFF3E0',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: collection.isPublic ? '#A5D6A7' : '#FFE082',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '800', color: collection.isPublic ? '#2E7D32' : '#E65100' }}>
                      {collection.isPublic ? '🌐 Công khai' : '🔒 Riêng tư'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Nút "Học ngay" */}
            <Pressable
              onPress={() => setActiveMode('study')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#7C3AED',
                paddingHorizontal: 14,
                height: 38,
                borderRadius: 19,
                shadowColor: '#7C3AED',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Play color="#FFFFFF" fill="#FFFFFF" size={13} />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Học ngay</Text>
            </Pressable>
          </View>

          {/* Compact Grouped Stats Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Layers color="#7C3AED" size={13} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>
                {collection.cards?.length || 0} thẻ
              </Text>
            </View>

            {totalStarredCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEFCE8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#FEF9C3' }}>
                <Star color="#EAB308" fill="#EAB308" size={13} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#CA8A04' }}>
                  {totalStarredCount} đã đánh dấu
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Eye color="#64748B" size={13} />
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                {(collection as any).viewCount ?? (collection as any).views ?? 0} lượt xem
              </Text>
            </View>

            {/* Author Chip (Placed Last) */}
            {authorName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
                {authorAvatar ? (
                  <Image
                    source={{ uri: authorAvatar }}
                    style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#E2E8F0' }}
                  />
                ) : (
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 7, fontWeight: '800', color: '#FFFFFF' }}>
                      {authorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: '#475569', fontWeight: '700' }}>
                  {authorName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {/* Mode Selection Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
          style={{ marginBottom: 20, maxHeight: 40 }}
        >
          {[
            { key: 'list', label: 'Danh sách' },
            { key: 'study', label: 'Thẻ ghi nhớ' },
            { key: 'quiz', label: 'Học' },
            { key: 'test', label: 'Kiểm tra' },
            { key: 'history', label: 'Lịch sử' },
          ].map((mode) => {
            const active = activeMode === mode.key
            return (
              <Pressable
                key={mode.key}
                onPress={() => setActiveMode(mode.key as any)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor: active ? '#7C3AED' : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#FFFFFF' : '#64748B' }}>
                  {mode.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* 0. LIST TAB */}
        {activeMode === 'list' && (
          <View>
            {/* List Filter Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Filter color='#64748B' size={16} style={{ marginRight: 2 }} />
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'starred', label: 'Đã đánh dấu' },
                { key: 'unstarred', label: 'Chưa đánh dấu' },
              ].map((opt) => {
                const active = listFilter === opt.key
                const isStarredOpt = opt.key === 'starred'
                const isUnstarredOpt = opt.key === 'unstarred'

                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setListFilter(opt.key as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: active ? '#7C3AED' : '#FFFFFF',
                      borderWidth: active ? 0 : 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    {isStarredOpt && (
                      <Star
                        color={active ? '#FFFFFF' : '#CA8A04'}
                        fill={active ? '#FFFFFF' : '#CA8A04'}
                        size={12}
                      />
                    )}
                    {isUnstarredOpt && (
                      <Star
                        color={active ? '#FFFFFF' : '#94A3B8'}
                        fill='none'
                        size={12}
                      />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : '#64748B' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* List of cards */}
            {(() => {
              const filtered = (collection.cards || []).filter((card) => {
                const isCardStarred = card.markedBy && card.markedBy.includes(currentUser?.id || '')
                if (listFilter === 'starred') return isCardStarred
                if (listFilter === 'unstarred') return !isCardStarred
                return true
              })

              if (filtered.length === 0) {
                return (
                  <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Layers color='#94A3B8' size={48} />
                    <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: '800', marginTop: 16 }}>
                      Không có thẻ nào để hiển thị
                    </Text>
                    <Text style={{ color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                      Không có thẻ nào khớp với bộ lọc hiện tại.
                    </Text>
                  </View>
                )
              }

              return filtered.map((card, idx) => {
                const isCardStarred = card.markedBy && card.markedBy.includes(currentUser?.id || '')
                return (
                  <View
                    key={card._id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#F1F5F9',
                      marginBottom: 10,
                      gap: 12,
                      shadowColor: '#0F172A',
                      shadowOpacity: 0.015,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 1,
                    }}
                  >
                    {/* Left: Index badge */}
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#F5F3FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>{idx + 1}</Text>
                    </View>

                    {/* Middle: Content */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{card.term}</Text>
                      <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 }}>{card.definition}</Text>
                    </View>

                    {/* Right: Star Button */}
                    <Pressable
                      onPress={() => handleToggleMark(card._id)}
                      style={{ padding: 6 }}
                    >
                      <Star
                        color={isCardStarred ? '#CA8A04' : '#94A3B8'}
                        fill={isCardStarred ? '#CA8A04' : 'none'}
                        size={20}
                      />
                    </Pressable>
                  </View>
                )
              })
            })()}
          </View>
        )}

        {/* 1. STUDY / FLASHCARDS MODE */}
        {activeMode === 'study' && (
          <View>
            {/* Collection description details */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
              {collection.description ? (
                <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 }}>
                  {collection.description}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Layers color='#94A3B8' size={14} />
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                    {collection.cards?.length || 0} thẻ
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star color={totalStarredCount > 0 ? '#EAB308' : '#94A3B8'} size={14} fill={totalStarredCount > 0 ? '#EAB308' : 'none'} />
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                    Đã đánh dấu {totalStarredCount} thẻ
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {collection.isPublic ? <Globe color='#16A34A' size={14} /> : <Lock color='#64748B' size={14} />}
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                    {collection.isPublic ? 'Công khai' : 'Riêng tư'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Filters Starred vs All */}
            {totalStarredCount > 0 && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {[
                  { starred: false, label: 'Tất cả thẻ' },
                  { starred: true, label: `Thẻ đã đánh dấu (${totalStarredCount})` },
                ].map((opt, index) => {
                  const active = filterStarredOnly === opt.starred
                  return (
                    <Pressable
                      key={index}
                      onPress={() => setFilterStarredOnly(opt.starred)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: active ? '#7C3AED' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: active ? '#7C3AED' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : '#64748B' }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            )}

            {cards.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>Theo dõi tiến độ</Text>
                  <Pressable
                    onPress={async () => {
                      const nextVal = !progressTracking
                      setProgressTracking(nextVal)
                      if (nextVal) {
                        const userId = currentUser?.id || ''
                        const unmastered = cards.filter(c => !c.masteredBy?.includes(userId))

                        if (unmastered.length > 0) {
                          setStudyCards(unmastered)
                        } else {
                          // All cards are mastered: reset progress
                          try {
                            await flashcardApi.resetProgress(collectionId)
                          } catch (err) {
                            console.error('Reset progress failed:', err)
                          }
                          const clearedCards = cards.map(c => ({
                            ...c,
                            masteredBy: (c.masteredBy || []).filter(uid => uid !== userId)
                          }))
                          setCards(clearedCards)
                          setStudyCards(clearedCards)
                        }
                        setStudyIndex(0)
                        setStudyFinished(false)
                        setIsFlipped(false)
                        isFlippedRef.current = false
                        flipAnim.setValue(0)
                      }
                    }}
                    style={{
                      width: 46,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: progressTracking ? '#7C3AED' : '#CBD5E1',
                      padding: 2,
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#FFFFFF',
                        alignSelf: progressTracking ? 'flex-end' : 'flex-start',
                      }}
                    />
                  </Pressable>
                </View>

                {progressTracking && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 16 }}>
                    <View style={{ backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: '#C2410C', fontWeight: '800' }}>
                        Đang học: {studyingCount}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '800' }}>
                        Đã biết: {masteredCount}
                      </Text>
                    </View>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <View
                        style={{
                          width: `${cards.length > 0 ? (masteredCount / cards.length) * 100 : 0}%`,
                          height: '100%',
                          backgroundColor: '#16A34A',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Empty cards placeholder */}
            {cards.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Layers color='#94A3B8' size={48} />
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', marginTop: 16 }}>
                  Không có thẻ nào để hiển thị
                </Text>
                <Text style={{ color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                  {filterStarredOnly
                    ? 'Bộ thẻ này chưa có thẻ nào được gắn dấu sao.'
                    : 'Bộ thẻ này hiện chưa có nội dung thẻ con.'}
                </Text>
              </View>
            ) : progressTracking ? (
              /* Progress Tracking Mode Content */
              studyFinished ? (
                /* Progress Finished View */
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 32,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    shadowColor: '#7C3AED',
                    shadowOpacity: 0.05,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 2,
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: '#EEF2FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                    }}
                  >
                    <BookOpen color='#7C3AED' size={32} />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                    {studyingCount === 0 ? 'Nắm bài rất chắc' : 'Gần tới đích'}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 10 }}>
                    {studyingCount === 0
                      ? 'Bạn đã thuộc tất cả các thẻ trong bộ thẻ này! Thật tuyệt vời!'
                      : `Bạn vẫn còn ${studyingCount} thẻ chưa biết. Tiếp tục tập trung luyện tập nhé!`}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 28, width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {studyingCount > 0 ? (
                      <Pressable
                        onPress={handleFocusUnmastered}
                        style={{
                          backgroundColor: '#7C3AED',
                          paddingVertical: 14,
                          paddingHorizontal: 20,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                          Tập trung vào học {studyingCount} thẻ
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => setProgressTracking(false)}
                        style={{
                          backgroundColor: '#7C3AED',
                          paddingVertical: 14,
                          paddingHorizontal: 20,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                          Ôn luyện (Chuyển mode)
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={handleResetProgress}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#E2E8F0',
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        borderRadius: 18,
                        gap: 8,
                      }}
                    >
                      <RotateCcw color='#64748B' size={16} />
                      <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '800' }}>
                        Đặt lại thẻ
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* Progress Active Practice View */
                <View>
                  {/* Interactive Card */}
                  <Pressable onPress={handleCardPress} style={{ width: '100%', height: 320, position: 'relative' }}>
                    {/* Front Side */}
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.cardStyle,
                        styles.cardFront,
                        {
                          transform: [{ rotateY: frontInterpolate }],
                          opacity: frontOpacity,
                          zIndex: isFlipped ? 1 : 2,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Text style={{ fontSize: 26, fontWeight: '900', color: '#0F172A', textAlign: 'center', lineHeight: 36 }}>
                          {activeCard?.term}
                        </Text>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                        <RotateCcw color='#A99BFF' size={14} />
                        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Chạm để lật xem định nghĩa
                        </Text>
                      </View>
                    </Animated.View>

                    {/* Back Side */}
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.cardStyle,
                        styles.cardBack,
                        {
                          transform: [{ rotateY: backInterpolate }],
                          opacity: backOpacity,
                          zIndex: isFlipped ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#334155', textAlign: 'center', lineHeight: 30 }}>
                          {activeCard?.definition}
                        </Text>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                        <RotateCcw color='#7C3AED' size={14} />
                        <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Chạm để lật xem thuật ngữ
                        </Text>
                      </View>
                    </Animated.View>
                  </Pressable>

                  {/* Progress bottom control row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingHorizontal: 4 }}>
                    <Pressable
                      onPress={() => setProgressTracking(false)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 14,
                        backgroundColor: '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#475569', fontSize: 14, fontWeight: '800' }}>Thoát</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleMarkProgress(false)}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: '#FEE2E2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#FCA5A5',
                      }}
                    >
                      <X color='#DC2626' size={22} />
                    </Pressable>

                    <Pressable
                      onPress={() => handleToggleMark(activeCard._id)}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: isStarred ? '#FEF08A' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isStarred ? '#FACC15' : '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Star color={isStarred ? '#CA8A04' : '#64748B'} fill={isStarred ? '#CA8A04' : 'none'} size={22} />
                    </Pressable>

                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                      {studyIndex + 1} / {studyCards.length}
                    </Text>

                    <Pressable
                      onPress={() => handleMarkProgress(true)}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: '#DCFCE7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#86EFAC',
                      }}
                    >
                      <CheckCircle color='#15803D' size={22} />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const shuffled = [...studyCards]
                        for (let i = shuffled.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                        }
                        setStudyCards(shuffled)
                        setStudyIndex(0)
                        setStudyFinished(false)
                        setIsFlipped(false)
                        isFlippedRef.current = false
                        flipAnim.setValue(0)
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: '#F1F5F9',
                      }}
                    >
                      <Shuffle color='#7C3AED' size={18} />
                    </Pressable>
                  </View>
                </View>
              )
            ) : finished ? (
              /* Finished Practice View */
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 32,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  shadowColor: '#7C3AED',
                  shadowOpacity: 0.08,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 3,
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                    borderWidth: 4,
                    borderColor: '#F0FDF4',
                  }}
                >
                  <BookOpen color='#15803D' size={32} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                  Hoàn thành ôn tập!
                </Text>
                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 10 }}>
                  Chúc mừng bạn đã hoàn thành ôn tập toàn bộ thẻ ghi nhớ trong bộ này.
                </Text>

                {/* Stats Grid */}
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 24, paddingTop: 20, width: '100%', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>{cards.length}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '700' }}>Đã học</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#EAB308' }}>{totalStarredCount}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '700' }}>Đánh dấu</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 28, width: '100%' }}>
                  <Pressable
                    onPress={handleReset}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#7C3AED',
                      paddingVertical: 14,
                      borderRadius: 18,
                      gap: 8,
                      shadowColor: '#7C3AED',
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 2,
                    }}
                  >
                    <RotateCcw color='#FFFFFF' size={18} />
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Học lại</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => navigation.goBack()}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      paddingVertical: 14,
                      borderRadius: 18,
                      gap: 8,
                    }}
                  >
                    <ArrowLeft color='#64748B' size={18} />
                    <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '800' }}>Thoát ra</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* Card Flipping Section */
              <View>
                {/* Dynamic Progress Bar & Actions */}
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B' }}>
                      Tiến độ: Thẻ {currentIndex + 1} / {cards.length}
                    </Text>
                    
                    {/* Shuffle & Fullscreen toggles */}
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Pressable onPress={handleShuffle} style={{ padding: 4 }}>
                        <Shuffle color='#7C3AED' size={18} />
                      </Pressable>
                      <Pressable onPress={() => setIsFullscreen(true)} style={{ padding: 4 }}>
                        <Maximize2 color='#7C3AED' size={18} />
                      </Pressable>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED', marginLeft: 4 }}>
                        {Math.round(((currentIndex + 1) / cards.length) * 100)}%
                      </Text>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${((currentIndex + 1) / cards.length) * 100}%`, height: '100%', backgroundColor: '#7C3AED', borderRadius: 3 }} />
                  </View>
                </View>

                 {/* Interactive Card */}
                 <Pressable onPress={handleCardPress} style={{ width: '100%', height: 320, position: 'relative' }}>
                   {/* Front Side */}
                   <Animated.View
                     pointerEvents="none"
                     style={[
                       styles.cardStyle,
                       styles.cardFront,
                       {
                         transform: [{ rotateY: frontInterpolate }],
                         opacity: frontOpacity,
                         zIndex: isFlipped ? 1 : 2,
                       },
                     ]}
                   >
                     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                       <Text style={{ fontSize: 26, fontWeight: '900', color: '#0F172A', textAlign: 'center', lineHeight: 36 }}>
                         {activeCard?.term}
                       </Text>
                     </View>
                     <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                       <RotateCcw color='#A99BFF' size={14} />
                       <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                         Chạm để lật xem định nghĩa
                       </Text>
                     </View>
                   </Animated.View>

                   {/* Back Side */}
                   <Animated.View
                     pointerEvents="none"
                     style={[
                       styles.cardStyle,
                       styles.cardBack,
                       {
                         transform: [{ rotateY: backInterpolate }],
                         opacity: backOpacity,
                         zIndex: isFlipped ? 2 : 1,
                       },
                     ]}
                   >
                     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                       <Text style={{ fontSize: 20, fontWeight: '700', color: '#334155', textAlign: 'center', lineHeight: 30 }}>
                         {activeCard?.definition}
                       </Text>
                     </View>
                     <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                       <RotateCcw color='#7C3AED' size={14} />
                       <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                         Chạm để lật xem thuật ngữ
                       </Text>
                     </View>
                   </Animated.View>
                 </Pressable>

                {/* Navigation & Star Controls */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 16 }}>
                  {/* Prev Button - Hide when index is 0 */}
                  {currentIndex > 0 ? (
                    <Pressable
                      onPress={handlePrev}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronLeft color='#334155' size={24} />
                    </Pressable>
                  ) : (
                    <View style={{ width: 56 }} />
                  )}

                  {/* Star Button */}
                  <Pressable
                    onPress={() => handleToggleMark(activeCard._id)}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: isStarred ? '#FEF08A' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: isStarred ? '#FACC15' : '#CBD5E1',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Star color={isStarred ? '#CA8A04' : '#64748B'} fill={isStarred ? '#CA8A04' : 'none'} size={24} />
                  </Pressable>

                  {/* Next Button / Finished flag */}
                  <Pressable
                    onPress={handleNext}
                    style={{
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#7C3AED',
                      paddingHorizontal: 24,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      shadowColor: '#7C3AED',
                      shadowOpacity: 0.25,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 4,
                      flex: 1,
                      maxWidth: 180,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                      {currentIndex === cards.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
                    </Text>
                    {currentIndex < cards.length - 1 && <ChevronRight color='#FFFFFF' size={18} />}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 2. MULTIPLE CHOICE LEARN MODE */}
        {activeMode === 'quiz' && (
          <View>
            {!quizStarted ? (
              /* Quiz Configuration UI */
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  shadowColor: '#7C3AED',
                  shadowOpacity: 0.05,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: '#F1EEFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <BookOpen color='#7C3AED' size={28} />
                </View>

                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                  Cấu hình học tập
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 20, paddingHorizontal: 10, lineHeight: 18 }}>
                  Luyện tập trả lời các câu hỏi trắc nghiệm để ghi nhớ kiến thức vững vàng hơn.
                </Text>

                {/* Method selector tabs: Ngẫu nhiên vs Tự chọn câu hỏi */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, width: '100%', marginBottom: 20 }}>
                  <Pressable
                    onPress={() => setQuizMethod('random')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: quizMethod === 'random' ? '#FFFFFF' : 'transparent',
                      alignItems: 'center',
                      shadowColor: quizMethod === 'random' ? '#0F172A' : 'transparent',
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: quizMethod === 'random' ? 1 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: quizMethod === 'random' ? '#0F172A' : '#64748B' }}>
                      Ngẫu nhiên
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setQuizMethod('manual')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: quizMethod === 'manual' ? '#FFFFFF' : 'transparent',
                      alignItems: 'center',
                      shadowColor: quizMethod === 'manual' ? '#0F172A' : 'transparent',
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: quizMethod === 'manual' ? 1 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: quizMethod === 'manual' ? '#0F172A' : '#64748B' }}>
                      Tự chọn câu hỏi
                    </Text>
                  </Pressable>
                </View>

                {quizMethod === 'random' ? (
                  <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 20 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      Chọn nhanh số lượng câu hỏi
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {[5, 10, 15, 20, 50].filter(p => p < cards.length).map((preset) => (
                        <Pressable
                          key={preset}
                          onPress={() => setQuizLimit(preset)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: quizLimit === preset ? '#7C3AED' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: quizLimit === preset ? '#7C3AED' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: quizLimit === preset ? '#FFFFFF' : '#475569' }}>
                            {preset} câu
                          </Text>
                        </Pressable>
                      ))}
                      <Pressable
                        onPress={() => setQuizLimit(cards.length)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: quizLimit === cards.length ? '#7C3AED' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: quizLimit === cards.length ? '#7C3AED' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: quizLimit === cards.length ? '#FFFFFF' : '#475569' }}>
                          Tất cả ({cards.length})
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      Hoặc nhập số lượng tùy ý
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                      <TextInput
                        keyboardType="number-pad"
                        value={quizLimit ? String(quizLimit) : ''}
                        onChangeText={(text) => {
                          const num = parseInt(text.replace(/[^0-9]/g, ''), 10)
                          if (isNaN(num)) {
                            setQuizLimit(0)
                          } else {
                            setQuizLimit(Math.min(num, cards.length))
                          }
                        }}
                        placeholder={`1 - ${cards.length}`}
                        placeholderTextColor="#94A3B8"
                        style={{
                          flex: 1,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          height: 44,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          color: '#0F172A',
                          fontSize: 14,
                          fontWeight: '700',
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                      Nhập từ 1 đến {cards.length} câu hỏi.
                    </Text>
                  </View>
                ) : (
                  <View style={{ width: '100%', marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Danh sách câu hỏi
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable onPress={() => setSelectedQuizCardIds(new Set(cards.map(c => c._id)))}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#7C3AED' }}>Chọn tất cả</Text>
                        </Pressable>
                        <Text style={{ fontSize: 11, color: '#CBD5E1' }}>|</Text>
                        <Pressable onPress={() => setSelectedQuizCardIds(new Set())}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B' }}>Bỏ chọn</Text>
                        </Pressable>
                      </View>
                    </View>

                    <ScrollView
                      nestedScrollEnabled
                      style={{
                        maxHeight: 220,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 16,
                        backgroundColor: '#F8FAFC',
                        padding: 8,
                      }}
                    >
                      {cards.map((card, idx) => {
                        const isChecked = selectedQuizCardIds.has(card._id)
                        return (
                          <Pressable
                            key={card._id}
                            onPress={() => {
                              setSelectedQuizCardIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(card._id)) {
                                  next.delete(card._id)
                                } else {
                                  next.add(card._id)
                                }
                                return next
                              })
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 12,
                              borderRadius: 12,
                              backgroundColor: isChecked ? '#FFFFFF' : '#F8FAFC',
                              borderWidth: 1,
                              borderColor: isChecked ? '#DDD6FE' : '#E2E8F0',
                              marginBottom: 6,
                              gap: 10,
                            }}
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                backgroundColor: isChecked ? '#7C3AED' : '#FFFFFF',
                                borderWidth: isChecked ? 0 : 1.5,
                                borderColor: '#CBD5E1',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isChecked && <Check color="#FFFFFF" size={13} strokeWidth={3} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: isChecked ? '#7C3AED' : '#0F172A' }}>
                                Câu {idx + 1}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                                {card.term}
                              </Text>
                            </View>
                          </Pressable>
                        )
                      })}
                    </ScrollView>

                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 8 }}>
                      Đã chọn: {selectedQuizCardIds.size} / {cards.length} câu hỏi
                    </Text>
                  </View>
                )}

                <Pressable
                  disabled={
                    quizMethod === 'random'
                      ? quizLimit < 1 || quizLimit > cards.length
                      : selectedQuizCardIds.size < 1
                  }
                  onPress={() => {
                    let selected: CardItem[] = []
                    if (quizMethod === 'random') {
                      const shuffled = [...cards]
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                      }
                      selected = shuffled.slice(0, quizLimit)
                    } else {
                      selected = cards.filter((c) => selectedQuizCardIds.has(c._id))
                    }

                    if (selected.length === 0) {
                      toast.error('Vui lòng chọn ít nhất 1 câu hỏi để học')
                      return
                    }

                    setQuizCards(selected)
                    setQuizIndex(0)
                    setQuizScore(0)
                    setQuizFinished(false)
                    setQuizStarted(true)
                  }}
                  style={{
                    width: '100%',
                    backgroundColor:
                      (quizMethod === 'random'
                        ? quizLimit < 1 || quizLimit > cards.length
                        : selectedQuizCardIds.size < 1)
                        ? '#E2E8F0'
                        : '#7C3AED',
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#7C3AED',
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      color:
                        (quizMethod === 'random'
                          ? quizLimit < 1 || quizLimit > cards.length
                          : selectedQuizCardIds.size < 1)
                          ? '#94A3B8'
                          : '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '800',
                    }}
                  >
                    Bắt đầu học
                  </Text>
                </Pressable>
              </View>
            ) : quizFinished ? (
              /* Quiz Finished View */
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 32,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  shadowColor: '#7C3AED',
                  shadowOpacity: 0.08,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 3,
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                    borderWidth: 4,
                    borderColor: '#F0FDF4',
                  }}
                >
                  <Check color='#15803D' size={32} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                  Kết quả học trắc nghiệm!
                </Text>
                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                  Bạn đã trả lời đúng {quizScore} / {quizCards.length} câu hỏi.
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 28, width: '100%' }}>
                  <Pressable
                    onPress={() => {
                      const shuffled = [...cards]
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                      }
                      const sliced = shuffled.slice(0, quizLimit)
                      setQuizCards(sliced)
                      setQuizIndex(0)
                      setQuizScore(0)
                      setQuizFinished(false)
                      setSelectedAnswer(null)
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#7C3AED',
                      paddingVertical: 14,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Làm lại</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setQuizStarted(false)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      paddingVertical: 14,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '800' }}>Tạo lượt mới</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* Active Quiz Question */
              <View>
                {/* Progress bar */}
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B' }}>
                      Trắc nghiệm: Câu {quizIndex + 1} / {quizCards.length}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED' }}>
                      Đúng: {quizScore}
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${((quizIndex + 1) / quizCards.length) * 100}%`, height: '100%', backgroundColor: '#7C3AED', borderRadius: 3 }} />
                  </View>
                </View>

                {/* Question Box (Term) */}
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 24,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    minHeight: 120,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 20,
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.02,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Thuật ngữ / Câu hỏi
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', textAlign: 'center', lineHeight: 30 }}>
                    {quizCards[quizIndex]?.term}
                  </Text>
                </View>

                {/* Multiple Choice Options */}
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 12, marginLeft: 4 }}>
                  Chọn đáp án đúng:
                </Text>

                <View style={{ gap: 10 }}>
                  {shuffledOptions.map((opt, oIdx) => {
                    const isSelected = selectedAnswer === opt
                    const isCorrectOption = opt === quizCards[quizIndex]?.definition
                    const hasSelected = selectedAnswer !== null

                    let btnBg = '#FFFFFF'
                    let btnBorder = '#E2E8F0'
                    let btnText = '#334155'

                    if (hasSelected) {
                      if (isCorrectOption) {
                        btnBg = '#DCFCE7'
                        btnBorder = '#16A34A'
                        btnText = '#15803D'
                      } else if (isSelected) {
                        btnBg = '#FEE2E2'
                        btnBorder = '#EF4444'
                        btnText = '#B91C1C'
                      }
                    }

                    return (
                      <Pressable
                        key={oIdx}
                        disabled={hasSelected}
                        onPress={() => {
                          setSelectedAnswer(opt)
                          if (opt === quizCards[quizIndex]?.definition) {
                            setQuizScore((prev) => prev + 1)
                          }
                        }}
                        style={{
                          backgroundColor: btnBg,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: btnBorder,
                          padding: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        {hasSelected && isCorrectOption ? (
                          <Check color='#16A34A' size={18} />
                        ) : hasSelected && isSelected ? (
                          <X color='#EF4444' size={18} />
                        ) : (
                          <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8' }}>{String.fromCharCode(65 + oIdx)}</Text>
                          </View>
                        )}
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: btnText }}>{opt}</Text>
                      </Pressable>
                    )
                  })}
                </View>

                {/* Continue Action */}
                {selectedAnswer !== null && (
                  <Pressable
                    onPress={() => {
                      if (quizIndex < quizCards.length - 1) {
                        setQuizIndex((prev) => prev + 1)
                      } else {
                        setQuizFinished(true)
                      }
                    }}
                    style={{
                      marginTop: 24,
                      backgroundColor: '#7C3AED',
                      paddingVertical: 14,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#7C3AED',
                      shadowOpacity: 0.25,
                      shadowRadius: 10,
                      elevation: 4,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                      {quizIndex === quizCards.length - 1 ? 'Xem kết quả' : 'Tiếp tục'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* 3. TEST / EXAM MODE */}
        {activeMode === 'test' && (
          <View>
            {!testStarted ? (
              /* Test Configuration UI */
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  shadowColor: '#7C3AED',
                  shadowOpacity: 0.05,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: '#F1EEFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <BookOpen color='#7C3AED' size={28} />
                </View>

                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                  Cấu hình kiểm tra
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 20, paddingHorizontal: 10, lineHeight: 18 }}>
                  Đánh giá năng lực ghi nhớ của bạn thông qua bài kiểm tra trắc nghiệm.
                </Text>

                <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Chọn nhanh số lượng câu hỏi
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {[5, 10, 15, 20, 50].filter(p => p < cards.length).map((preset) => (
                      <Pressable
                        key={preset}
                        onPress={() => setTestLimit(preset)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: testLimit === preset ? '#7C3AED' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: testLimit === preset ? '#7C3AED' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: testLimit === preset ? '#FFFFFF' : '#475569' }}>
                          {preset} câu
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setTestLimit(cards.length)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: testLimit === cards.length ? '#7C3AED' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: testLimit === cards.length ? '#7C3AED' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: testLimit === cards.length ? '#FFFFFF' : '#475569' }}>
                        Tất cả ({cards.length})
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Hoặc nhập số lượng tùy ý
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                    <TextInput
                      keyboardType="number-pad"
                      value={testLimit ? String(testLimit) : ''}
                      onChangeText={(text) => {
                        const num = parseInt(text.replace(/[^0-9]/g, ''), 10)
                        if (isNaN(num)) {
                          setTestLimit(0)
                        } else {
                          setTestLimit(Math.min(num, cards.length))
                        }
                      }}
                      placeholder={`1 - ${cards.length}`}
                      placeholderTextColor="#94A3B8"
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        height: 44,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        color: '#0F172A',
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                    Nhập từ 1 đến {cards.length} câu hỏi.
                  </Text>
                </View>

                <Pressable
                  disabled={testLimit < 1 || testLimit > cards.length}
                  onPress={() => {
                    const shuffled = [...cards]
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                    }
                    const sliced = shuffled.slice(0, testLimit)
                    testStartTimeRef.current = Date.now()
                    setTestQuestions(generateTestQuestions(sliced))
                    setTestSubmitted(false)
                    setTestScore(0)
                    setTestStarted(true)
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: (testLimit < 1 || testLimit > cards.length) ? '#E2E8F0' : '#7C3AED',
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#7C3AED',
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text style={{ color: (testLimit < 1 || testLimit > cards.length) ? '#94A3B8' : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                    Bắt đầu kiểm tra
                  </Text>
                </Pressable>
              </View>
            ) : testSubmitted ? (
              /* Test Results View */
              <View>
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 32,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    shadowColor: '#7C3AED',
                    shadowOpacity: 0.08,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 3,
                    marginBottom: 24,
                  }}
                >
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: '#DCFCE7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                      borderWidth: 4,
                      borderColor: '#F0FDF4',
                    }}
                  >
                    <BookOpen color='#15803D' size={32} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                    Kết quả Kiểm tra
                  </Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: '#7C3AED', marginTop: 12 }}>
                    {Math.round((testScore / testQuestions.length) * 100)}%
                  </Text>
                  <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 6, fontWeight: '700' }}>
                    Đúng {testScore} / {testQuestions.length} câu
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' }}>
                    <Pressable
                      onPress={() => {
                        const shuffled = [...cards]
                        for (let i = shuffled.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                        }
                        const sliced = shuffled.slice(0, testLimit)
                        setTestQuestions(generateTestQuestions(sliced))
                        setTestSubmitted(false)
                        setTestScore(0)
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#7C3AED',
                        paddingVertical: 14,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Thi lại</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setTestStarted(false)}
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: '#E2E8F0',
                        paddingVertical: 14,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '800' }}>Tạo đề mới</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Correct/Incorrect List */}
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 14, marginLeft: 4 }}>
                  Chi tiết kết quả bài làm:
                </Text>

                <View style={{ gap: 14 }}>
                  {testQuestions.map((q, idx) => {
                    const isCorrect = q.userAnswer === q.expectedAnswer
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 20,
                          padding: 16,
                          borderWidth: 1.5,
                          borderColor: isCorrect ? '#DCFCE7' : '#FEE2E2',
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>Câu {idx + 1}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isCorrect ? (
                              <>
                                <Check color='#16A34A' size={16} />
                                <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '700' }}>Đúng</Text>
                              </>
                            ) : (
                              <>
                                <X color='#EF4444' size={16} />
                                <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '700' }}>Sai</Text>
                              </>
                            )}
                          </View>
                        </View>

                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>
                          {q.term}
                        </Text>

                        {q.type === 'multiple-choice' ? (
                          <View style={{ gap: 4, marginTop: 4 }}>
                            <Text style={{ fontSize: 13, color: '#64748B' }}>
                              Đáp án của bạn: <Text style={{ fontWeight: '700', color: isCorrect ? '#16A34A' : '#EF4444' }}>{q.userAnswer}</Text>
                            </Text>
                            {!isCorrect && (
                              <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>
                                Đáp án đúng: {q.expectedAnswer}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <View style={{ gap: 4, marginTop: 4 }}>
                            <Text style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', marginBottom: 4 }}>
                              {q.questionText}
                            </Text>
                            <Text style={{ fontSize: 13, color: '#64748B' }}>
                              Bài làm: <Text style={{ fontWeight: '700', color: isCorrect ? '#16A34A' : '#EF4444' }}>{q.userAnswer === 'True' ? 'Đúng' : 'Sai'}</Text>
                            </Text>
                            {!isCorrect && (
                              <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>
                                Đáp án đúng: {q.expectedAnswer === 'True' ? 'Đúng' : 'Sai'}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )
                  })}
                </View>
              </View>
            ) : (
              /* Active Test Questions List */
              <View>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 18 }}>
                    Đề thi trắc nghiệm khách quan gồm câu hỏi trắc nghiệm và câu hỏi Đúng/Sai. Hãy hoàn thành tất cả các câu hỏi dưới đây trước khi nộp bài.
                  </Text>
                </View>

                <View style={{ gap: 16 }}>
                  {testQuestions.map((q, idx) => {
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 20,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED', marginBottom: 6 }}>
                          Câu {idx + 1}
                        </Text>
                        
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
                          {q.term}
                        </Text>

                        {q.type === 'multiple-choice' ? (
                          <View style={{ gap: 8 }}>
                            {q.options?.map((opt, oIdx) => {
                              const isSelected = q.userAnswer === opt
                              return (
                                <Pressable
                                  key={oIdx}
                                  onPress={() => {
                                    setTestQuestions((prev) =>
                                      prev.map((item, pIdx) =>
                                        pIdx === idx ? { ...item, userAnswer: opt } : item
                                      )
                                    )
                                  }}
                                  style={{
                                    backgroundColor: isSelected ? '#F0EEFF' : '#FFFFFF',
                                    borderWidth: 1.5,
                                    borderColor: isSelected ? '#7C3AED' : '#E2E8F0',
                                    borderRadius: 12,
                                    padding: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                  }}
                                >
                                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: isSelected ? '#7C3AED' : '#CBD5E1', backgroundColor: isSelected ? '#7C3AED' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                                    {isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />}
                                  </View>
                                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: isSelected ? '#7C3AED' : '#334155' }}>
                                    {opt}
                                  </Text>
                                </Pressable>
                              )
                            })}
                          </View>
                        ) : (
                          <View style={{ gap: 8 }}>
                            <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', marginBottom: 6 }}>
                              {q.questionText}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                              {['True', 'False'].map((tfVal) => {
                                const isSelected = q.userAnswer === tfVal
                                const tfLabel = tfVal === 'True' ? 'Đúng' : 'Sai'
                                return (
                                  <Pressable
                                    key={tfVal}
                                    onPress={() => {
                                      setTestQuestions((prev) =>
                                        prev.map((item, pIdx) =>
                                          pIdx === idx ? { ...item, userAnswer: tfVal } : item
                                        )
                                      )
                                    }}
                                    style={{
                                      flex: 1,
                                      backgroundColor: isSelected ? '#F0EEFF' : '#FFFFFF',
                                      borderWidth: 1.5,
                                      borderColor: isSelected ? '#7C3AED' : '#E2E8F0',
                                      borderRadius: 12,
                                      paddingVertical: 12,
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#7C3AED' : '#64748B' }}>
                                      {tfLabel}
                                    </Text>
                                  </Pressable>
                                )
                              })}
                            </View>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </View>

                {/* Submit button */}
                <Pressable
                  disabled={!testQuestions.every((q) => q.userAnswer !== undefined)}
                  onPress={() => {
                    let score = 0
                    const incorrectCardIds: string[] = []
                    testQuestions.forEach((q) => {
                      if (q.userAnswer === q.expectedAnswer) {
                        score++
                      } else {
                        incorrectCardIds.push(q.id)
                      }
                    })
                    const total = testQuestions.length
                    const rawPercentage = total > 0 ? Math.round((score / total) * 100) : 0
                    const percentage = isNaN(rawPercentage) ? 0 : rawPercentage
                    const durationSeconds = Math.max(1, Math.round((Date.now() - testStartTimeRef.current) / 1000))

                    setTestScore(score)
                    setTestSubmitted(true)

                    learningHistoryApi.recordResult({
                      flashcardId: collectionId,
                      mode: 'TEST',
                      score: percentage,
                      totalQuestions: total,
                      correctAnswers: score,
                      durationSeconds,
                      incorrectTerms: incorrectCardIds,
                    })
                    .then(() => {
                      loadHistories()
                    })
                    .catch((err) => console.error('Save test result error:', err))
                  }}
                  style={{
                    marginTop: 24,
                    backgroundColor: testQuestions.every((q) => q.userAnswer !== undefined) ? '#7C3AED' : '#E2E8F0',
                    paddingVertical: 14,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#7C3AED',
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text style={{ color: testQuestions.every((q) => q.userAnswer !== undefined) ? '#FFFFFF' : '#94A3B8', fontSize: 15, fontWeight: '800' }}>
                    Nộp bài
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* 4. HISTORY TAB MODE */}
        {activeMode === 'history' && (
          <View>
            {/* Header card with icon, count, and full-width sort pills */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1EEFF', alignItems: 'center', justifyContent: 'center' }}>
                  <History color="#7C3AED" size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>Lịch sử kiểm tra</Text>
                    {!loadingHistories && (
                      <View style={{ backgroundColor: '#F1EEFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#7C3AED' }}>
                          {histories.length === 0 ? 'Chưa có lượt thi' : `${histories.length} lần thi`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Theo dõi chi tiết kết quả qua từng đợt làm bài thi
                  </Text>
                </View>
              </View>

              {/* Full-width balanced sort pills */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 4, width: '100%', gap: 4 }}>
                {[
                  { key: 'createdAt', label: 'Ngày thi' },
                  { key: 'score', label: 'Điểm số' },
                  { key: 'durationSeconds', label: 'Thời gian' },
                ].map((opt) => {
                  const isActive = historySortBy === opt.key
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => {
                        if (historySortBy === opt.key) {
                          setHistorySortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                        } else {
                          setHistorySortBy(opt.key as any)
                          setHistorySortOrder('desc')
                        }
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 10,
                        backgroundColor: isActive ? '#7C3AED' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isActive ? '#FFFFFF' : '#64748B' }}>
                        {opt.label} {isActive ? (historySortOrder === 'desc' ? '↓' : '↑') : ''}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* Content Table / Card Container */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
              {/* Header row */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1.2 }}>NGÀY THI</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, flex: 0.8, textAlign: 'center' }}>ĐIỂM SỐ</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, flex: 0.8, textAlign: 'center' }}>THỜI GIAN</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, flex: 0.8, textAlign: 'right' }}>TỈ LỆ ĐÚNG</Text>
              </View>

              {loadingHistories ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 10 }}>Đang tải lịch sử...</Text>
                </View>
              ) : histories.length === 0 ? (
                /* Empty state matching user screenshot */
                <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1EEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <History color="#A78BFA" size={32} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>Chưa có lịch sử nào</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                    Hãy hoàn thành một bài Kiểm tra để ghi lại kết quả tại đây.
                  </Text>
                </View>
              ) : (
                histories.map((h, idx) => {
                  const score = h.score
                  const badgeBg = score >= 80 ? '#DCFCE7' : score >= 50 ? '#FEF3C7' : '#FEE2E2'
                  const badgeText = score >= 80 ? '#15803D' : score >= 50 ? '#B45309' : '#B91C1C'
                  const formattedDate = new Date(h.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const durationStr = h.durationSeconds < 60 ? `${h.durationSeconds}s` : `${Math.floor(h.durationSeconds / 60)}m ${h.durationSeconds % 60}s`

                  return (
                    <Pressable
                      key={h._id}
                      onPress={() => setSelectedHistory(h)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: idx < histories.length - 1 ? 1 : 0,
                        borderBottomColor: '#F1F5F9',
                      }}
                    >
                      <View style={{ flex: 1.2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{formattedDate}</Text>
                      </View>
                      <View style={{ flex: 0.8, alignItems: 'center' }}>
                        <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: badgeText }}>{score}%</Text>
                        </View>
                      </View>
                      <View style={{ flex: 0.8, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>{durationStr}</Text>
                      </View>
                      <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                          {h.correctAnswers} / {h.totalQuestions}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* HISTORY DETAIL MODAL */}
      <Modal visible={selectedHistory !== null} animationType="fade" transparent={true} onRequestClose={() => setSelectedHistory(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, width: '92%', maxWidth: 400, maxHeight: '85%', padding: 20 }}>
            {selectedHistory && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Chi tiết kết quả thi</Text>
                  <Pressable onPress={() => setSelectedHistory(null)} style={{ padding: 4 }}>
                    <X color="#64748B" size={20} />
                  </Pressable>
                </View>

                {/* Score badge header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 16, gap: 16 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: selectedHistory.score >= 50 ? '#DCFCE7' : '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: selectedHistory.score >= 50 ? '#15803D' : '#B91C1C' }}>
                      {selectedHistory.score}%
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                      {selectedHistory.correctAnswers} / {selectedHistory.totalQuestions} câu đúng
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      Thời gian: {selectedHistory.durationSeconds < 60 ? `${selectedHistory.durationSeconds}s` : `${Math.floor(selectedHistory.durationSeconds / 60)}m ${selectedHistory.durationSeconds % 60}s`}
                    </Text>
                  </View>
                </View>

                {/* Question breakdown list */}
                {selectedHistory.incorrectTerms && selectedHistory.incorrectTerms.length > 0 ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 8 }}>
                      Các câu làm sai ({selectedHistory.incorrectTerms.length} câu):
                    </Text>
                    <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                      {selectedHistory.incorrectTerms.map((termIdOrText, i) => {
                        const matchedCard = cards.find(c => c._id === termIdOrText || c.term === termIdOrText)
                        return (
                          <View
                            key={i}
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              backgroundColor: '#FEF2F2',
                              borderWidth: 1,
                              borderColor: '#FEE2E2',
                              marginBottom: 8,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <AlertCircle color="#EF4444" size={16} />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', flex: 1 }}>
                                {matchedCard ? matchedCard.term : termIdOrText}
                              </Text>
                            </View>
                            {matchedCard && (
                              <Text style={{ fontSize: 12, color: '#475569', marginLeft: 22 }}>
                                Định nghĩa: <Text style={{ fontWeight: '700' }}>{matchedCard.definition}</Text>
                              </Text>
                            )}
                          </View>
                        )
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <CheckCircle color="#16A34A" size={36} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#16A34A', marginTop: 8 }}>
                      Xuất sắc! Bạn làm đúng tất cả các câu.
                    </Text>
                  </View>
                )}

                {/* Option to study weak cards */}
                {selectedHistory.incorrectTerms && selectedHistory.incorrectTerms.length > 0 && (
                  <Pressable
                    onPress={() => {
                      const wrongIds = selectedHistory.incorrectTerms || []
                      const foundIds = cards.filter(c => wrongIds.includes(c._id) || wrongIds.includes(c.term)).map(c => c._id)
                      if (foundIds.length > 0) {
                        setSelectedQuizCardIds(new Set(foundIds))
                      }
                      setQuizMethod('manual')
                      setSelectedHistory(null)
                      setActiveMode('quiz')
                    }}
                    style={{
                      marginTop: 12,
                      backgroundColor: '#7C3AED',
                      paddingVertical: 14,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                      Học lại các câu làm sai ({selectedHistory.incorrectTerms.length} câu)
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. DISTRACTION-FREE FULLSCREEN MODAL */}
      <Modal visible={isFullscreen} animationType="slide" transparent={false} onRequestClose={() => setIsFullscreen(false)}>
        <ScreenShell style={{ backgroundColor: '#090D16' }} topPadding={0}>
          <View style={{ flex: 1, paddingBottom: 20, justifyContent: 'space-between' }}>
            
            {/* Fullscreen Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: Platform.OS === 'ios' ? 60 : 24,
                paddingBottom: 14,
                backgroundColor: '#090D16',
                borderBottomWidth: 1,
                borderBottomColor: '#1E293B',
              }}
            >
              <Pressable
                onPress={() => setIsFullscreen(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: '#1E293B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <X color='#E2E8F0' size={18} />
              </Pressable>

              <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF', flex: 1, textAlign: 'center', marginHorizontal: 12 }} numberOfLines={1}>
                {collection?.title || 'Đang học'}
              </Text>

              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: '#1E293B',
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>
                  {currentIndex + 1} / {cards.length}
                </Text>
              </View>
            </View>

            {/* Immersive Progress Bar */}
            <View style={{ height: 4, backgroundColor: '#1E293B', width: '100%' }}>
              <View
                style={{
                  height: '100%',
                  width: `${((currentIndex + 1) / (cards.length || 1)) * 100}%`,
                  backgroundColor: '#7C3AED',
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Huge Immersive Flashcard */}
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, marginVertical: 20 }}>
              <Pressable onPress={handleCardPress} style={{ width: '100%', height: 400, position: 'relative' }}>
                {/* Front Side */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.cardStyle,
                    styles.cardFront,
                    {
                      transform: [{ rotateY: frontInterpolate }],
                      opacity: frontOpacity,
                      backgroundColor: '#111827',
                      borderColor: '#374151',
                      zIndex: isFlipped ? 1 : 2,
                    },
                  ]}
                >
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', lineHeight: 42 }}>
                      {activeCard?.term}
                    </Text>
                  </View>
                  <View style={{ borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                    <RotateCcw color='#7C3AED' size={14} />
                    <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Chạm để lật xem định nghĩa
                    </Text>
                  </View>
                </Animated.View>

                {/* Back Side */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.cardStyle,
                    styles.cardBack,
                    {
                      transform: [{ rotateY: backInterpolate }],
                      opacity: backOpacity,
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      zIndex: isFlipped ? 2 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#F3F4F6', textAlign: 'center', lineHeight: 36 }}>
                      {activeCard?.definition}
                    </Text>
                  </View>
                  <View style={{ borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                    <RotateCcw color='#7C3AED' size={14} />
                    <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Chạm để lật xem thuật ngữ
                    </Text>
                  </View>
                </Animated.View>
              </Pressable>
            </View>

            {/* Immersive Controls */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                {/* Prev Button */}
                {currentIndex > 0 ? (
                  <Pressable
                    onPress={handlePrev}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#1E293B',
                      borderWidth: 1,
                      borderColor: '#334155',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChevronLeft color='#F8FAFC' size={24} />
                  </Pressable>
                ) : (
                  <View style={{ width: 56 }} />
                )}

                {/* Star Button */}
                <Pressable
                  onPress={() => handleToggleMark(activeCard._id)}
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 31,
                    backgroundColor: isStarred ? '#FEF08A' : '#1E293B',
                    borderWidth: 1.5,
                    borderColor: isStarred ? '#FACC15' : '#334155',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: isStarred ? '#FACC15' : 'transparent',
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: isStarred ? 4 : 0,
                  }}
                >
                  <Star color={isStarred ? '#CA8A04' : '#94A3B8'} fill={isStarred ? '#CA8A04' : 'none'} size={26} />
                </Pressable>

                {/* Next Button */}
                {currentIndex < cards.length - 1 ? (
                  <Pressable
                    onPress={handleNext}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#7C3AED',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#7C3AED',
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                      elevation: 4,
                    }}
                  >
                    <ChevronRight color='#FFFFFF' size={24} />
                  </Pressable>
                ) : (
                  <View style={{ width: 56 }} />
                )}
              </View>
              
              <Text style={{ textAlign: 'center', color: '#4B5563', fontSize: 11, fontWeight: '600' }}>
                Vuốt sang ngang hoặc chạm vào thẻ để tương tác.
              </Text>
            </View>
            
          </View>
        </ScreenShell>
      </Modal>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  cardStyle: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    backfaceVisibility: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
  },
  cardFront: {
    zIndex: 2,
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
})
