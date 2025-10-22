'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/contexts/I18nContext'
import { useAuth } from '@/contexts/AuthContext'
import { Input, Button } from '@/components/ui'
import Toast, { ToastType } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import socketClient, { Message as SocketMessage, ChatRoom } from '@/lib/socket'
import { clearChatNotifications } from '@/lib/push'

export default function ChatRoomPage() {
  const { t } = useTranslation()
  const { user: currentUser, isLoading: authLoading } = useAuth()
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
  
  // 무한 스크롤 상태
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }, [])

  // URL에서 채팅방 ID 가져오기
  const chatId = params?.id as string

  // 채팅방 참여 함수 (useCallback으로 최적화)
  const joinChatRoom = useCallback(async () => {
    if (!currentUser || !chatId) return

    try {
      await socketClient.joinRoom(chatId, currentUser.id)
    } catch (error) {
      console.error('채팅방 참여 실패:', error)
      router.push('/chat')
    }
  }, [currentUser, chatId, router])

  useEffect(() => {
    console.log('🔍 [ChatRoom] useEffect 실행 - authLoading:', authLoading, 'currentUser:', currentUser?.email || 'null', 'chatId:', chatId)
    
    // 인증 로딩 중이면 대기
    if (authLoading) {
      console.log('⏳ [ChatRoom] 인증 로딩 중... 소켓 연결 대기')
      return
    }
    
    if (!currentUser) {
      console.log('🔒 [ChatRoom] 사용자 없음 - 로그인 페이지로 이동')
      router.push('/login')
      return
    }

    console.log('✅ [ChatRoom] 인증 완료 - 소켓 연결 시작')

    // Socket 연결 (AuthContext가 완전히 로드된 후)
    const socket = socketClient.connect()

    // 채팅방의 푸시 알림 모두 제거
    if (chatId) {
      console.log('🗑️  채팅방 푸시 알림 제거 시작:', chatId)
      clearChatNotifications(chatId)
        .then((success) => {
          if (success) {
            console.log('✅ 채팅방 푸시 알림 제거 완료')
          }
        })
        .catch((err) => {
          console.error('❌ 푸시 알림 제거 실패:', err)
        })
    }

    // 채팅방 참여
    joinChatRoom()

    // 새 메시지 수신 시 자동 읽음 처리
    const handleNewMessageWithRead = (newMessage: SocketMessage) => {
      setMessages(prev => {
        // 이미 낙관적으로 추가한 메시지인지 확인 (본인이 보낸 메시지)
        const existingIndex = prev.findIndex(msg => 
          msg.isPending && 
          msg.userId === newMessage.userId && 
          msg.content === newMessage.content &&
          msg.type === newMessage.type
        )
        
        // 낙관적 메시지가 있으면 교체, 없으면 추가
        if (existingIndex !== -1) {
          const updated = [...prev]
          updated[existingIndex] = { ...newMessage, isPending: false }
          return updated
        }
        
        return [...prev, newMessage]
      })
      
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
      
      // 초기 메시지가 50개(limit)면 더 있을 가능성 있음
      setHasMoreMessages(orderedMessages.length >= 50)
      
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

    // 포그라운드 복귀 처리 (중복 호출 방지용 타이머)
    let foregroundTimer: NodeJS.Timeout | null = null
    
    const handleForeground = (source: string) => {
      console.log(`📱 [${source}] 포그라운드 이벤트`)
      
      // 짧은 시간 내 중복 호출 방지 (debounce)
      if (foregroundTimer) {
        clearTimeout(foregroundTimer)
      }
      
      foregroundTimer = setTimeout(() => {
        console.log('✅ 포그라운드 복귀 처리 실행')
        
        // 채팅방의 푸시 알림 제거
        if (chatId) {
          clearChatNotifications(chatId)
            .then(() => console.log('✅ 알림 제거 완료'))
            .catch((err) => console.error('❌ 알림 제거 실패:', err))
        }
        
        // 소켓 재연결 확인
        const socket = socketClient.getSocket()
        if (socket && !socket.connected) {
          console.log('🔄 소켓 재연결 시도...')
          socketClient.connect()
          if (currentUser && chatId) {
            setTimeout(() => joinChatRoom(), 500)
          }
        } else if (socket) {
          socketClient.setVisibility(true)
        }
        
        foregroundTimer = null
      }, 100) // 100ms 디바운스
    }

    // 백그라운드 처리
    const handleBackground = (source: string) => {
      console.log(`📴 [${source}] 백그라운드 이벤트`)
      socketClient.setVisibility(false)
    }

    // 소켓 연결 상태 확인 및 재연결 (가볍게!)
    const checkAndReconnectSocket = () => {
      const socket = socketClient.getSocket()
      
      if (!socket || !socket.connected) {
        console.log('⚠️ 소켓 끊김 - 재연결')
        socketClient.connect()
        
        if (currentUser && chatId) {
          setTimeout(() => joinChatRoom(), 500)
        }
      } else {
        console.log('✅ 소켓 연결됨')
        socketClient.setVisibility(true)
      }
    }

    // Visibility API 처리
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      console.log(`👁️ [visibilitychange] ${isVisible ? '보임' : '숨김'}`)
      
      if (isVisible) {
        handleForeground('visibilitychange')
        checkAndReconnectSocket() // 소켓 확인
      } else {
        handleBackground('visibilitychange')
      }
    }

    // iOS Safari/PWA를 위한 pageshow/pagehide 이벤트
    const handlePageShow = (event: PageTransitionEvent) => {
      console.log(`📄 [pageshow] persisted: ${event.persisted}`)
      handleForeground('pageshow')
      // iOS에서 가장 확실한 이벤트 - 소켓 상태 확인
      checkAndReconnectSocket()
    }

    const handlePageHide = () => {
      console.log(`📄 [pagehide]`)
      handleBackground('pagehide')
    }

    // iOS를 위한 focus 이벤트 (보험)
    const handleFocus = () => {
      console.log(`🎯 [focus]`)
      handleForeground('focus')
      // focus 시에도 소켓 확인
      checkAndReconnectSocket()
    }

    // iOS를 위한 앱 생명주기 이벤트 (최후의 보루)
    const handleResume = () => {
      console.log(`🔄 [resume] 앱 재개`)
      handleForeground('resume')
    }

    const handlePause = () => {
      console.log(`⏸️  [pause] 앱 일시정지`)
      handleBackground('pause')
    }

    // 푸시 알림 클릭 처리 함수 (공통)
    const handleNotificationClick = async (data: any) => {
      console.log('🔔 푸시 알림 클릭 처리 시작')
      
      const clickedRoomId = data.roomId
      const urlToOpen = data.urlToOpen
      
      console.log('📍 클릭한 채팅방:', clickedRoomId)
      console.log('📍 현재 채팅방:', chatId)
      console.log('📍 이동할 URL:', urlToOpen)
      
      // 다른 채팅방의 알림을 클릭한 경우 해당 채팅방으로 이동
      if (clickedRoomId && clickedRoomId !== chatId && urlToOpen) {
        console.log('🔄 다른 채팅방으로 이동:', urlToOpen)
        
        // 소켓 이벤트 리스너만 제거 (채팅방에서 나가지는 않음!)
        console.log('🧹 소켓 이벤트 리스너 제거 (채팅방은 유지)')
        socketClient.removeAllChatListeners()
        
        // 페이지 이동
        router.push(urlToOpen)
        return
      }
      
      // 푸시 클릭 = 무조건 포그라운드 상태!
      // debounce 없이 즉시 처리
      console.log('✅ 푸시 클릭 - 소켓 및 알림 즉시 처리')
      
      // 알림 제거 (클릭한 채팅방이든 아니든 모두 제거)
      if (chatId) {
        clearChatNotifications(chatId)
          .then(() => console.log('✅ 알림 제거 완료'))
          .catch((err) => console.error('❌ 알림 제거 실패:', err))
      }
      
      // 소켓 상태 확인 및 재연결
      const socket = socketClient.getSocket()
      if (!socket || !socket.connected) {
        console.log('🔄 소켓 끊김 - 즉시 재연결')
        socketClient.connect()
        
        // 소켓 재연결 후 채팅방 재참여
        if (currentUser && chatId) {
          setTimeout(() => {
            joinChatRoom()
            console.log('✅ 채팅방 재참여 완료')
          }, 500)
        }
      } else {
        // 소켓이 연결되어 있으면 visibility만 업데이트
        console.log('✅ 소켓 연결됨 - visibility 업데이트')
        socketClient.setVisibility(true)
      }
    }

    // Service Worker 메시지 리스너 (푸시 알림 클릭 감지)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        console.log('🔔 [postMessage] 푸시 알림 클릭 감지')
        handleNotificationClick(event.data)
      }
    }

    // BroadcastChannel 리스너 (백그라운드 → 포그라운드 전환 시)
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        console.log('🔔 [BroadcastChannel] 푸시 알림 클릭 감지')
        handleNotificationClick(event.data)
      }
    }

    // 이벤트 리스너 등록
    console.log('🎯 이벤트 리스너 등록 (iOS 대응)')
    console.log('📊 환경 정보:', {
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      visibilitySupported: typeof document.visibilityState !== 'undefined',
      serviceWorkerSupported: 'serviceWorker' in navigator
    })
    
    // 표준 Visibility API (Desktop, Android)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // iOS Safari/PWA 대응 (bfcache)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', handlePageHide)
    
    // iOS 추가 대응 (보험)
    window.addEventListener('focus', handleFocus)
    
    // iOS 앱 생명주기 이벤트 (Cordova/Capacitor 스타일)
    document.addEventListener('resume', handleResume)
    document.addEventListener('pause', handlePause)
    
    // Service Worker 메시지
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }
    
    // BroadcastChannel (백그라운드 → 포그라운드 전환 시 알림 클릭 처리)
    let broadcastChannel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('notification-click-channel')
        broadcastChannel.addEventListener('message', handleBroadcastMessage)
        console.log('✅ BroadcastChannel 등록 완료')
      } catch (e) {
        console.log('⚠️ BroadcastChannel 사용 불가')
      }
    }
    
    console.log('✅ 이벤트 리스너 등록 완료')

    // iOS 대비: 가벼운 주기적 체크 (포그라운드일 때만)
    const intervalId = setInterval(() => {
      // 페이지가 보이는 상태일 때만 체크
      if (document.visibilityState === 'visible') {
        const socket = socketClient.getSocket()
        
        // 소켓이 끊어진 경우에만 로그 & 재연결
        if (!socket || !socket.connected) {
          console.log('⏰ [interval] 소켓 끊김 감지 - 재연결')
          socketClient.connect()
          
          if (currentUser && chatId) {
            setTimeout(() => joinChatRoom(), 500)
          }
        }
        // 연결된 경우는 조용히 넘어감 (로그 스팸 방지)
      }
    }, 3000) // 3초마다 체크 (가볍게)

    console.log('⏰ 포그라운드 체크 인터벌 시작 (3초)')

    return () => {
      console.log('🧹 [ChatRoom] Cleanup 시작 - chatId:', chatId)
      
      // Socket 이벤트 리스너만 제거 (채팅방에서 나가지는 않음!)
      console.log('🧹 소켓 이벤트 리스너 제거 (채팅방은 유지)')
      socketClient.removeAllChatListeners()
      
      // 이벤트 리스너 제거
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('resume', handleResume)
      document.removeEventListener('pause', handlePause)
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
      
      // BroadcastChannel 정리
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage)
        broadcastChannel.close()
        console.log('✅ BroadcastChannel 해제')
      }
      
      // 타이머 정리
      if (foregroundTimer) {
        clearTimeout(foregroundTimer)
      }
      
      // 인터벌 정리
      clearInterval(intervalId)
      console.log('⏰ 포그라운드 체크 인터벌 중지')
      console.log('✅ [ChatRoom] Cleanup 완료')
    }
  }, [authLoading, currentUser, chatId, router, joinChatRoom])

  // 뒤로가기 버튼 (채팅 목록으로 이동)
  const handleBackToList = () => {
    console.log('🔙 채팅 목록으로 돌아가기')
    
    // 소켓 이벤트 리스너만 제거 (채팅방은 유지)
    socketClient.removeAllChatListeners()
    
    // 채팅 목록으로 이동
    router.push('/chat')
  }

  // 메시지 전송
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !currentUser || !chatId) return

    const messageContent = message.trim()
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    // 즉시 메시지를 UI에 추가 (낙관적 업데이트)
    const optimisticMessage: SocketMessage = {
      id: tempId,
      tempId,
      roomId: chatId,
      userId: currentUser.id,
      content: messageContent,
      type: 'text',
      timestamp: new Date(),
      isPending: true,  // 전송 중 표시
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setMessage('')
    setShouldAutoScroll(true)

    try {
      // 실제 전송
      const sentMessage = await socketClient.sendMessage({
        roomId: chatId,
        userId: currentUser.id,
        content: messageContent,
        type: 'text',
      })

      // 임시 메시지를 실제 메시지로 교체
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...sentMessage, isPending: false } : msg
        )
      )
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error)
      
      // 실패한 메시지 표시
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...msg, isPending: false, isFailed: true } : msg
        )
      )
      
      showToast('메시지 전송에 실패했습니다.', 'error')
    }
  }, [message, currentUser, chatId, showToast])

  // Enter 키로 메시지 전송
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  // 파일 선택 트리거
  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // 파일 선택 처리
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser || !chatId) return

    console.log('📤 파일 선택됨:', {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    // 파일 타입 검증 (더 안전하게)
    const fileExtension = file.name.toLowerCase().split('.').pop() || ''
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif']
    const videoExtensions = ['mp4', 'webm', 'mov', 'm4v']
    
    const isImage = file.type.startsWith('image/') || imageExtensions.includes(fileExtension)
    const isVideo = file.type.startsWith('video/') || videoExtensions.includes(fileExtension)
    
    console.log('🔍 파일 타입 검증:', {
      extension: fileExtension,
      mimeType: file.type,
      isImage,
      isVideo
    })
    
    if (!isImage && !isVideo) {
      console.log('❌ 허용되지 않은 파일 타입')
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

      console.log('📤 파일 업로드 시작:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`)

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
      setShouldAutoScroll(true)

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
    
    return distance < threshold
  }

  // 사용자가 맨 위에 있는지 확인
  const isAtTop = () => {
    if (!messagesContainerRef.current) return false
    
    const container = messagesContainerRef.current
    const threshold = 100 // 맨 위로부터 100px 이내면 "맨 위"로 간주
    
    return container.scrollTop < threshold
  }

  // 과거 메시지 로드
  const loadMoreMessages = useCallback(async () => {
    // 초기 로딩 중이거나, 이미 로딩 중이거나, 더 이상 메시지가 없거나, 메시지가 없으면 중단
    if (!currentUser || !chatId || isLoading || isLoadingMore || !hasMoreMessages || messages.length === 0) {
      return
    }

    // 가장 오래된 메시지 (첫 번째 메시지)를 cursor로 사용
    const oldestMessage = messages[0]

    setIsLoadingMore(true)

    try {
      // 현재 스크롤 위치 저장 (메시지 로드 후 위치 유지용)
      const container = messagesContainerRef.current
      const previousScrollHeight = container?.scrollHeight || 0
      const previousScrollTop = container?.scrollTop || 0

      // 과거 메시지 로드
      const result = await socketClient.loadMoreMessages(chatId, {
        timestamp: oldestMessage.timestamp,
        id: oldestMessage.id
      }, 50)

      if (result.messages.length > 0) {
        // 메시지를 최신순으로 정렬 (백엔드에서 DESC로 오므로 reverse)
        const newMessages = result.messages.reverse()
        
        // 기존 메시지 앞에 추가
        setMessages(prev => [...newMessages, ...prev])

        // 스크롤 위치 유지 (jumping 방지)
        requestAnimationFrame(() => {
          if (container) {
            const scrollHeightDiff = container.scrollHeight - previousScrollHeight
            container.scrollTop = previousScrollTop + scrollHeightDiff
          }
        })
      }

      setHasMoreMessages(result.hasMore)
    } catch (error) {
      console.error('❌ 과거 메시지 로드 실패:', error)
      showToast('메시지를 불러오는데 실패했습니다.', 'error')
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentUser, chatId, isLoading, isLoadingMore, hasMoreMessages, messages, showToast])

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom()
    const atTop = isAtTop()
    
    setShouldAutoScroll(atBottom)

    // 초기 로딩 중에는 무한 스크롤 비활성화
    if (isLoading) return

    // 스크롤이 최상단 근처에 있고, 더 로드할 메시지가 있으면 자동 로드
    if (atTop && !isLoadingMore && hasMoreMessages && messages.length > 0) {
      loadMoreMessages()
    }
  }, [isLoading, isLoadingMore, hasMoreMessages, messages.length, loadMoreMessages])

  // 맨 아래로 스크롤
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current
        if (smooth) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          })
        } else {
          container.scrollTop = container.scrollHeight
        }
      }
    })
  }, [])

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, shouldAutoScroll, scrollToBottom])

  // 초기 로딩 완료 시 맨 아래로 스크롤 (한 번만)
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setShouldAutoScroll(true)
      scrollToBottom(false)
    }
  }, [isLoading, scrollToBottom])

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
  const renderMessage = useCallback((msg: SocketMessage) => {
    const isMyMessage = msg.userId === currentUser?.id
    const fileUrl = getFileUrl(msg.fileUrl)
    
    return (
      <div
        key={msg.tempId || msg.id}
        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
            isMyMessage
              ? msg.isFailed
                ? 'bg-red-500 text-white rounded-br-md opacity-70'
                : 'bg-[#0064FF] text-white rounded-br-md'
              : 'bg-secondary text-primary rounded-bl-md'
          } ${msg.isPending ? 'opacity-60' : ''}`}
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
          <div className={`text-xs mt-1 flex items-center gap-1 ${
            isMyMessage ? 'text-blue-100' : 'text-secondary'
          }`}>
            <span>{formatTime(msg.timestamp)}</span>
            {msg.isPending && <span className="animate-pulse">전송 중...</span>}
            {msg.isFailed && <span className="text-red-300">전송 실패</span>}
          </div>
        </div>
      </div>
    )
  }, [currentUser?.id])

  return (
    <div className="h-screen w-full bg-primary flex flex-col">
      {/* 헤더 */}
      <header className="bg-primary border-b border-divider px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={handleBackToList}
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
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide"
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
            {/* 과거 메시지 로딩 인디케이터 */}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-secondary rounded-full">
                  <span className="text-lg animate-spin">⏳</span>
                  <span className="text-sm text-secondary">과거 메시지 불러오는 중...</span>
                </div>
              </div>
            )}
            
            {/* 더 이상 메시지 없음 표시 */}
            {!hasMoreMessages && messages.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <div className="px-4 py-2 bg-secondary rounded-full">
                  <span className="text-xs text-secondary">대화의 시작입니다</span>
                </div>
              </div>
            )}
            
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <div className="bg-primary border-t border-divider px-4 py-3">
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
            accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.mp4,.webm,.mov,.m4v"
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
