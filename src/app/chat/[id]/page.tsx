'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { Input, Button } from '@/components/ui'
import { getCurrentUser } from '@/lib/api'
import socketClient, { Message as SocketMessage, ChatRoom } from '@/lib/socket'

export default function ChatRoomPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [roomInfo, setRoomInfo] = useState<ChatRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const currentUser = getCurrentUser()

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

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  // 메시지 렌더링
  const renderMessage = (msg: SocketMessage) => {
    const isMyMessage = msg.userId === currentUser?.id
    
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
          <p className="text-sm">{msg.content}</p>
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
    <div className="h-screen w-full bg-primary flex flex-col">
      {/* 헤더 */}
      <header className="bg-primary border-b border-divider px-4 h-16 flex items-center justify-between">
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
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
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
      <div className="bg-primary border-t border-divider px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" className="p-2">
            <span className="text-secondary text-lg">📎</span>
          </Button>
          <div className="flex-1 relative">
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat.messagePlaceholder')}
              className="pr-12"
            />
            <Button
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
            >
              <span className="text-secondary text-lg">😊</span>
            </Button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`p-3 rounded-full ${
              message.trim()
                ? 'bg-[#0064FF] text-white'
                : 'bg-secondary text-secondary'
            }`}
          >
            <span className="text-lg">↑</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
