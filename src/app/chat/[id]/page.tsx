'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { Input, Button } from '@/components/ui'
import Toast, { ToastType } from '@/components/ui/Toast'
import { getCurrentUser, apiClient } from '@/lib/api'
import socketClient, { Message as SocketMessage, ChatRoom } from '@/lib/socket'

export default function ChatRoomPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [roomInfo, setRoomInfo] = useState<ChatRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const currentUser = getCurrentUser()

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }

  // URL에서 채팅방 ID 가져오기
  const chatId = params?.id as string

  useEffect(() => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    // Socket 연결
    const socket = socketClient.connect()

    // 채팅방 참여
    joinChatRoom()

    // 새 메시지 수신 시 자동 읽음 처리
    const handleNewMessageWithRead = (newMessage: SocketMessage) => {
      setMessages(prev => [...prev, newMessage])
      
      // 자동 읽음 처리
      if (currentUser && chatId) {
        socketClient.markAsRead(chatId, currentUser.id, newMessage.id)
          .catch(err => console.error('읽음 처리 실패:', err))
      }
    }

    // Socket 이벤트 리스너 등록
    socketClient.onNewMessage(handleNewMessageWithRead)
    socketClient.onRoomMessages((roomMessages) => {
      // 백엔드에서 DESC로 오므로 reverse() 필요
      const orderedMessages = roomMessages.reverse()
      setMessages(orderedMessages)
      setIsLoading(false)
      
      // 채팅방 입장 시 마지막 메시지를 읽음 처리 ⭐
      if (orderedMessages.length > 0 && currentUser && chatId) {
        const lastMessage = orderedMessages[orderedMessages.length - 1]
        console.log('📖 읽음 처리 시도:', {
          roomId: chatId,
          userId: currentUser.id,
          messageId: lastMessage.id,
          content: lastMessage.content,
          timestamp: lastMessage.timestamp
        })
        socketClient.markAsRead(chatId, currentUser.id, lastMessage.id)
          .then(() => console.log('✅ 읽음 처리 성공'))
          .catch(err => console.error('❌ 입장 시 읽음 처리 실패:', err))
      }
    })
    socketClient.onRoomInfo((room) => {
      setRoomInfo(room)
    })
    socketClient.onUnreadCount((data) => {
      setUnreadCount(data.count)
    })

    return () => {
      // Socket 이벤트 리스너만 제거 (채팅방 참여는 유지)
      socketClient.offNewMessage()
      socketClient.offRoomMessages()
      socketClient.offRoomInfo()
      socketClient.offUnreadCount()
    }
  }, [chatId])

  // 명시적으로 채팅방 나가기
  const handleLeaveRoom = async () => {
    if (!currentUser || !chatId) return
    
    await socketClient.leaveRoom(chatId, currentUser.id)
    router.push('/chat')
  }

  const joinChatRoom = async () => {
    if (!currentUser || !chatId) return

    try {
      await socketClient.joinRoom(chatId, currentUser.id)
    } catch (error) {
      console.error('채팅방 참여 실패:', error)
      router.push('/chat')
    }
  }

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser || !chatId) return

    try {
      await socketClient.sendMessage({
        roomId: chatId,
        userId: currentUser.id,
        content: message.trim(),
        type: 'text',
      })

      setMessage('')
      
      // 본인이 메시지를 보낼 때는 무조건 맨 아래로 스크롤
      setShouldAutoScroll(true)
      setTimeout(() => scrollToBottom(), 100)
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error)
    }
  }

  // Enter 키로 메시지 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 파일 선택 트리거
  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  // 파일 선택 처리
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser || !chatId) return

    // 파일 타입 검증
    const isImage = file.type.startsWith('image/') || 
                    file.name.toLowerCase().endsWith('.heic') || 
                    file.name.toLowerCase().endsWith('.heif')
    const isVideo = file.type.startsWith('video/')
    
    if (!isImage && !isVideo) {
      showToast('이미지 또는 동영상 파일만 업로드할 수 있습니다.', 'error')
      return
    }

    // 파일 크기 검증 (100MB)
    if (file.size > 100 * 1024 * 1024) {
      showToast('파일 크기는 100MB를 초과할 수 없습니다.', 'error')
      return
    }

    try {
      setUploadingFile(true)

      console.log('📤 파일 업로드 시작:', file.name)

      // 파일 업로드 (서버에서 처리 완료될 때까지 대기)
      const result = await apiClient.uploadFile(file, currentUser.id, chatId)
      
      console.log('📦 파일 업로드 완료:', result)
      
      // 메시지 타입 결정
      const messageType = isImage ? 'image' : 'video'
      
      // 파일 URL 가져오기 (상대 경로만 저장)
      const fileUrl = result.fileUrl || result.data?.fileUrl
      
      if (!fileUrl) {
        throw new Error('파일 URL을 받지 못했습니다.')
      }

      console.log('🔗 파일 URL (상대 경로):', fileUrl)
      console.log('📨 메시지 전송 시작...')

      // 파일 메시지 전송 (상대 경로만 저장)
      await socketClient.sendMessage({
        roomId: chatId,
        userId: currentUser.id,
        content: file.name,
        type: messageType,
        fileUrl: fileUrl,
        fileName: file.name,
        fileSize: file.size,
      })

      console.log('✅ 메시지 전송 완료')

      // 본인이 파일을 보낼 때도 무조건 맨 아래로 스크롤
      setShouldAutoScroll(true)
      setTimeout(() => scrollToBottom(), 100)

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('❌ 파일 업로드 실패:', error)
      showToast(`파일 업로드에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error')
    } finally {
      setUploadingFile(false)
    }
  }

  // 사용자가 맨 아래에 있는지 확인
  const isAtBottom = () => {
    if (!messagesContainerRef.current) return true
    
    const container = messagesContainerRef.current
    const threshold = 150 // 맨 아래로부터 150px 이내면 "맨 아래"로 간주
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    
    console.log('📍 스크롤 위치:', { 
      distance, 
      threshold, 
      isAtBottom: distance < threshold,
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight
    })
    
    return distance < threshold
  }

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    const atBottom = isAtBottom()
    console.log('🔄 스크롤 이벤트 - atBottom:', atBottom)
    setShouldAutoScroll(atBottom)
  }

  // 맨 아래로 스크롤
  const scrollToBottom = (smooth = true) => {
    console.log('⬇️ scrollToBottom 호출 - smooth:', smooth)
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    console.log('📨 메시지 변경 감지 - shouldAutoScroll:', shouldAutoScroll, 'messages:', messages.length)
    if (shouldAutoScroll) {
      // 새 메시지가 추가되면 자동 스크롤
      setTimeout(() => {
        scrollToBottom()
      }, 50) // 약간의 딜레이를 줘서 DOM 업데이트 완료 대기
    }
  }, [messages])

  // 초기 로딩 완료 시 맨 아래로 스크롤
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      console.log('✅ 초기 로딩 완료 - 맨 아래로 스크롤')
      setShouldAutoScroll(true)
      setTimeout(() => {
        scrollToBottom(false)
      }, 100)
    }
  }, [isLoading])

  const formatTime = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // 파일 URL 생성 (렌더링 시에만 백엔드 URL 붙이기)
  const getFileUrl = (relativeUrl?: string) => {
    if (!relativeUrl) return ''
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${API_BASE_URL}${relativeUrl}`
  }

  // 메시지 렌더링
  const renderMessage = (msg: SocketMessage) => {
    const isMyMessage = msg.userId === currentUser?.id
    const fileUrl = getFileUrl(msg.fileUrl)
    
    return (
      <div
        key={msg.id}
        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
            isMyMessage
              ? 'bg-[#0064FF] text-white rounded-br-md'
              : 'bg-secondary text-primary rounded-bl-md'
          }`}
        >
          {msg.type === 'text' ? (
            <p className="text-sm">{msg.content}</p>
          ) : msg.type === 'image' ? (
            <div className="space-y-2">
              <img 
                src={fileUrl} 
                alt={msg.fileName || msg.content}
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(fileUrl, '_blank')}
              />
              <p className="text-xs opacity-75">{msg.fileName || msg.content}</p>
            </div>
          ) : msg.type === 'video' ? (
            <div className="space-y-2">
              <video 
                src={fileUrl} 
                controls
                className="rounded-lg max-w-full h-auto"
              />
              <p className="text-xs opacity-75">
                {msg.fileName || msg.content}
                {msg.fileSize && ` (${formatFileSize(msg.fileSize)})`}
              </p>
            </div>
          ) : (
            <p className="text-sm">{msg.content}</p>
          )}
          <div className={`text-xs mt-1 ${
            isMyMessage ? 'text-blue-100' : 'text-secondary'
          }`}>
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full bg-primary flex flex-col">
      {/* 헤더 */}
      <header className="bg-primary border-b border-divider px-4 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="p-2"
          >
            <span className="text-secondary text-lg">←</span>
          </Button>
          <div className="flex items-center space-x-3">
            {/* 상대방 아바타 */}
            <div className="w-10 h-10 bg-gradient-to-br from-[#0064FF] to-[#0052CC] rounded-xl flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {roomInfo?.name.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">
                {roomInfo?.name || '채팅방'}
              </h1>
              <p className="text-xs text-secondary">
                {roomInfo?.participants.length || 0}명
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" className="p-2">
            <span className="text-secondary text-lg">📞</span>
          </Button>
          <Button variant="ghost" className="p-2">
            <span className="text-secondary text-lg">📹</span>
          </Button>
          <Button variant="ghost" className="p-2">
            <span className="text-secondary text-lg">⋯</span>
          </Button>
        </div>
      </header>

      {/* 메시지 목록 */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide overscroll-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-secondary">메시지 불러오는 중...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-primary font-medium mb-2">메시지가 없습니다</p>
            <p className="text-secondary text-sm">첫 메시지를 보내보세요!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <div className="bg-primary border-t border-divider px-4 py-3 shrink-0 safe-bottom-chat">
        {uploadingFile && (
          <div className="mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center space-x-2">
            <span className="text-lg animate-spin">⏳</span>
            <span className="text-sm text-blue-600 dark:text-blue-400">파일 업로드 중...</span>
          </div>
        )}
        <div className="flex items-center space-x-3">
          {/* 파일 업로드 버튼 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.heic,.heif"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button 
            variant="ghost" 
            className="p-2"
            onClick={handleFileClick}
            disabled={uploadingFile}
          >
            <span className={`text-lg ${uploadingFile ? 'text-gray-400' : 'text-secondary'}`}>
              {uploadingFile ? '⏳' : '📎'}
            </span>
          </Button>
          <div className="flex-1 relative">
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={uploadingFile ? '파일 업로드 중...' : t('chat.messagePlaceholder')}
              className="pr-12"
              disabled={uploadingFile}
            />
            <Button
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
              disabled={uploadingFile}
            >
              <span className="text-secondary text-lg">😊</span>
            </Button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || uploadingFile}
            className={`p-3 rounded-full ${
              message.trim() && !uploadingFile
                ? 'bg-[#0064FF] text-white'
                : 'bg-secondary text-secondary'
            }`}
          >
            <span className="text-lg">↑</span>
          </Button>
        </div>
      </div>

      {/* Toast 알림 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
