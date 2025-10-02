'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { Input, Button } from '@/components/ui'

interface Message {
  id: number
  text: string
  sender: 'me' | 'other'
  time: string
  isRead?: boolean
}

export default function ChatRoomPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // URL에서 채팅방 ID 가져오기
  const chatId = params?.id as string
  
  // 채팅방 이름 매핑
  const chatRoomNames: { [key: string]: string } = {
    '1': '김철수',
    '2': '이영희', 
    '3': '박민수',
    '4': '정수진',
    '5': '최동현',
    '6': '한지영'
  }
  
  const chatName = chatRoomNames[chatId] || `채팅방 ${chatId}`

  // 샘플 메시지 데이터
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: '안녕하세요!', sender: 'other', time: '10:30', isRead: true },
    { id: 2, text: '안녕하세요! 반갑습니다 😊', sender: 'me', time: '10:31', isRead: true },
    { id: 3, text: '오늘 날씨가 정말 좋네요', sender: 'other', time: '10:32', isRead: true },
    { id: 4, text: '네, 맞아요! 산책하기 좋은 날씨입니다', sender: 'me', time: '10:33', isRead: true },
    { id: 5, text: '혹시 오늘 시간 있으시면 커피 한 잔 어떠세요?', sender: 'other', time: '10:35', isRead: false },
  ])

  // 메시지 전송
  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: message.trim(),
        sender: 'me',
        time: new Date().toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isRead: false
      }
      
      setMessages(prev => [...prev, newMessage])
      setMessage('')
      
      // 상대방 타이핑 시뮬레이션
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const replyMessage: Message = {
          id: messages.length + 2,
          text: '네, 좋은 아이디어네요!',
          sender: 'other',
          time: new Date().toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          isRead: false
        }
        setMessages(prev => [...prev, replyMessage])
      }, 2000)
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
  }, [messages, isTyping])

  // 메시지 렌더링
  const renderMessage = (msg: Message) => (
    <div
      key={msg.id}
      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
          msg.sender === 'me'
            ? 'bg-[#0064FF] text-white rounded-br-md'
            : 'bg-secondary text-primary rounded-bl-md'
        }`}
      >
        <p className="text-sm">{msg.text}</p>
        <div className={`text-xs mt-1 ${
          msg.sender === 'me' ? 'text-blue-100' : 'text-secondary'
        }`}>
          {msg.time}
          {msg.sender === 'me' && (
            <span className="ml-1">
              {msg.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )

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
                {chatName.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">{chatName}</h1>
              <p className="text-xs text-secondary">
                {isTyping ? t('chat.typing') : t('chat.online')}
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
        <div className="space-y-2">
          {messages.map(renderMessage)}
          
          {/* 타이핑 인디케이터 */}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-secondary text-primary rounded-2xl rounded-bl-md px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
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
