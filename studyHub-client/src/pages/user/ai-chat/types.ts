export interface Message {
  id: string
  sender: 'user' | 'ai'
  content: string
  timestamp: string
  attachedFile?: string
  citations?: string[]
}

export interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  isPinned: boolean
  isArchived: boolean
}
