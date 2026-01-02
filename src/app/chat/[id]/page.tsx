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
import { detectDeviceType } from '@/lib/device'
import ChatAlbum from '@/components/chat/ChatAlbum'

export default function ChatRoomPage() {
  const { t } = useTranslation()
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [roomInfo, setRoomInfo] = useState<ChatRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 })
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [isPasting, setIsPasting] = useState(false)
  const pasteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 미리보기 상태
  const [previewFiles, setPreviewFiles] = useState<File[]>([])
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  
  // 드래그 앤 드롭 상태
  const [isDragOver, setIsDragOver] = useState(false)
  
  // 무한 스크롤 상태
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  
  // 메뉴 상태
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAlbumOpen, setIsAlbumOpen] = useState(false)

  // URL에서 채팅방 ID 가져오기
  const chatId = params?.id as string

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }, [])

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

  // 모바일 감지
  useEffect(() => {
    setIsMobile(detectDeviceType() === 'mobile')
  }, [])

  // 키보드 처리 (PWA 최적화)
  useEffect(() => {
    if (!isMobile) return

    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport
        const windowHeight = window.innerHeight
        const viewportHeight = viewport.height
        const heightDiff = windowHeight - viewportHeight
        
        // 키보드가 올라온 경우
        if (heightDiff > 50) {
          setKeyboardHeight(heightDiff)
        } else {
          setKeyboardHeight(0)
        }
      }
    }

    // visualViewport API 지원 여부 확인
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange)
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange)
      }
    }
  }, [isMobile])

  // 입력창 포커스 시 키보드 처리
  const handleInputFocus = useCallback(() => {
    if (!isMobile) return

    // 키보드 애니메이션 대기 후 스크롤 조정
    const adjustScroll = () => {
      if (!messagesContainerRef.current) return

      // 메시지 컨테이너만 맨 아래로 스크롤 (페이지 전체는 스크롤하지 않음)
      if (window.visualViewport) {
        // visualViewport API 사용
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            // 메시지 컨테이너를 맨 아래로 스크롤하여 입력창이 보이도록
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        })
      } else {
        // fallback: 메시지 컨테이너만 스크롤
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        }, 300)
      }
    }

    // 키보드 애니메이션 대기 (iOS는 약 300ms, Android는 더 빠름)
    setTimeout(adjustScroll, 300)
    
    // 추가 안전장치: visualViewport resize 이벤트로도 처리
    if (window.visualViewport) {
      const handleResize = () => {
        adjustScroll()
        window.visualViewport?.removeEventListener('resize', handleResize)
      }
      window.visualViewport.addEventListener('resize', handleResize)
    }
  }, [isMobile])

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
    
    // 클립보드 붙여넣기 이벤트 (모든 파일 타입 지원)
    // 메시지 입력창에만 적용하여 중복 방지
    const handlePasteEvent = (e: Event) => {
      // 입력창이 포커스되어 있을 때만 처리
      const activeElement = document.activeElement
      const messageInput = messageInputRef.current
      
      if (activeElement === messageInput || (messageInput && messageInput.contains(activeElement as Node))) {
        handleClipboardPaste(e)
      }
    }
    
    // 입력창에 이벤트 리스너 등록
    const messageInput = messageInputRef.current
    if (messageInput) {
      messageInput.addEventListener('paste', handlePasteEvent, { capture: true })
      console.log('✅ 클립보드 붙여넣기 이벤트 리스너 등록됨')
    } else {
      console.log('⚠️ 메시지 입력창이 없어서 클립보드 이벤트 리스너를 등록할 수 없음')
    }
    
    // 입력창이 나중에 생성될 수 있으므로 주기적으로 확인
    const checkInputInterval = setInterval(() => {
      const messageInput = messageInputRef.current
      if (messageInput && !messageInput.hasAttribute('data-paste-listener')) {
        messageInput.addEventListener('paste', handlePasteEvent, { capture: true })
        messageInput.setAttribute('data-paste-listener', 'true')
        console.log('✅ 클립보드 붙여넣기 이벤트 리스너 재등록됨')
      }
    }, 1000)
    
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
      
      // 클립보드 붙여넣기 이벤트 제거
      const messageInput = messageInputRef.current
      if (messageInput) {
        messageInput.removeEventListener('paste', handlePasteEvent, { capture: true })
        messageInput.removeAttribute('data-paste-listener')
      }
      
      // 체크 인터벌 제거
      if (checkInputInterval) {
        clearInterval(checkInputInterval)
      }
      
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
      
      // 클립보드 디바운스 타이머 정리
      if (pasteTimeoutRef.current) {
        clearTimeout(pasteTimeoutRef.current)
        pasteTimeoutRef.current = null
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

  // 메시지 전송 (텍스트 + 파일 통합)
  const handleSendMessage = useCallback(async () => {
    // 텍스트와 파일이 모두 없으면 전송하지 않음
    if (!message.trim() && previewFiles.length === 0) return
    if (!currentUser || !chatId) return

    const messageContent = message.trim()
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    // 미리보기 파일이 있으면 파일과 함께 전송
    if (previewFiles.length > 0) {
      try {
        setUploadingFile(true)
        setUploadProgress({ current: 0, total: previewFiles.length, success: 0, failed: 0 })

        const uploadedFiles: Array<{
          fileUrl: string;
          fileName: string;
          fileSize: number;
          thumbnailUrl?: string;
        }> = []

        // 모든 파일 순차 업로드
        for (let i = 0; i < previewFiles.length; i++) {
          const file = previewFiles[i]
          
         setUploadProgress({ current: i + 1, total: previewFiles.length, success: 0, failed: 0 })
         
         const validation = validateFile(file)
         if (!validation) continue

         try {
           // 파일 업로드 (로깅 제거로 성능 향상)
           const result = await apiClient.uploadFile(file, currentUser.id, chatId)
            
            const fileUrl = result.fileUrl || result.data?.fileUrl
            const thumbnailUrl = result.thumbnailUrl || result.data?.thumbnailUrl
            
            if (!fileUrl) {
              throw new Error('파일 URL을 받지 못했습니다.')
            }

            // 업로드된 파일 정보 저장
            uploadedFiles.push({
              fileUrl: fileUrl,
              fileName: file.name,
              fileSize: file.size,
              thumbnailUrl: thumbnailUrl,
            })
          } catch (error) {
            console.error(`❌ 파일 업로드 실패:`, error)
            // showToast(`${file.name} 업로드 실패`, 'error')
          }
        }

        // 업로드된 파일이 있으면 메시지로 전송
        if (uploadedFiles.length > 0) {
          // 이미지만 필터링
          const imageFiles = uploadedFiles.filter(file => {
            const ext = file.fileName.toLowerCase().split('.').pop() || ''
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif']
            return imageExtensions.includes(ext) || file.fileName.toLowerCase().includes('image')
          })

          if (imageFiles.length === 1) {
            // 단일 이미지 + 텍스트
            const sentMessage = await socketClient.sendMessage({
              roomId: chatId,
              userId: currentUser.id,
              content: messageContent || imageFiles[0].fileName,
              type: 'image',
              fileUrl: imageFiles[0].fileUrl,
              fileName: imageFiles[0].fileName,
              fileSize: imageFiles[0].fileSize,
            })
            console.log('✅ 단일 이미지 + 텍스트 메시지 전송 완료:', sentMessage)
          } else if (imageFiles.length > 1) {
            // 여러 이미지 묶음 + 텍스트
            const sentMessage = await socketClient.sendMessage({
              roomId: chatId,
              userId: currentUser.id,
              content: messageContent || `${imageFiles.length}장의 사진`,
              type: 'images',
              files: imageFiles,
            })
            console.log('✅ 여러 이미지 묶음 + 텍스트 메시지 전송 완료:', sentMessage)
          }

          // 비디오나 기타 파일이 있으면 개별 전송
          const otherFiles = uploadedFiles.filter(file => !imageFiles.includes(file))
          for (const file of otherFiles) {
            const ext = file.fileName.toLowerCase().split('.').pop() || ''
            const videoExtensions = ['mp4', 'webm', 'mov', 'm4v']
            const messageType = videoExtensions.includes(ext) ? 'video' : 'file'

            await socketClient.sendMessage({
              roomId: chatId,
              userId: currentUser.id,
              content: messageContent || file.fileName,
              type: messageType,
              fileUrl: file.fileUrl,
              fileName: file.fileName,
              fileSize: file.fileSize,
            })
          }

          // showToast(`${uploadedFiles.length}개 파일을 전송했습니다`, 'success')
        }

        // 미리보기 초기화 및 메시지 입력창 초기화
        setPreviewFiles([])
        setIsPreviewMode(false)
        setMessage('')
        setShouldAutoScroll(true)
        
        // 키보드 유지
        requestAnimationFrame(() => {
          messageInputRef.current?.focus()
        })
        setTimeout(() => {
          messageInputRef.current?.focus()
        }, 50)
        setTimeout(() => {
          messageInputRef.current?.focus()
        }, 100)
        
      } catch (error) {
        console.error('❌ 파일 전송 실패:', error)
        // showToast('파일 전송에 실패했습니다', 'error')
      } finally {
        setUploadingFile(false)
        setUploadProgress({ current: 0, total: 0, success: 0, failed: 0 })
      }
    } else {
      // 텍스트만 전송
    const optimisticMessage: SocketMessage = {
      id: tempId,
      tempId,
      roomId: chatId,
      userId: currentUser.id,
      content: messageContent,
      type: 'text',
      timestamp: new Date(),
        isPending: true,
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setMessage('')
    setShouldAutoScroll(true)
    
      // 키보드 유지
    requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
    setTimeout(() => {
      messageInputRef.current?.focus()
    }, 50)
    setTimeout(() => {
      messageInputRef.current?.focus()
    }, 100)

    try {
      const sentMessage = await socketClient.sendMessage({
        roomId: chatId,
        userId: currentUser.id,
        content: messageContent,
        type: 'text',
      })

      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...sentMessage, isPending: false } : msg
        )
      )
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error)
      
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...msg, isPending: false, isFailed: true } : msg
        )
      )
      
          // showToast('메시지 전송에 실패했습니다.', 'error')
    }
    }
  }, [message, previewFiles, currentUser, chatId, showToast])

  // Enter 키로 메시지 전송 (데스크톱만, 모바일은 줄바꿈)
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // 모바일에서는 Enter 키로 전송하지 않음 (줄바꿈만)
    if (isMobile) {
      return
    }
    
    // 데스크톱: Enter로 전송, Shift+Enter로 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSendMessage()
      // Enter로 전송 후에도 포커스 유지
      setTimeout(() => {
        e.currentTarget?.focus()
      }, 10)
    }
  }, [handleSendMessage, isMobile])

  // 파일 선택 트리거
  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // 이미지 압축 및 리사이징 함수 (UX 최적화)
  const compressImage = useCallback((file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 원본 비율 유지하면서 리사이징
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // 이미지 그리기
        ctx?.drawImage(img, 0, 0, width, height)

        // 압축된 이미지를 Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('이미지 압축 실패'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  // 파일 타입 검증 함수 (성능 최적화)
  const validateFile = useCallback((file: File) => {
    // 파일 크기 먼저 체크 (가장 빠른 검증)
    if (file.size > 100 * 1024 * 1024) {
      showToast(`${file.name}: 파일 크기는 100MB를 초과할 수 없습니다.`, 'error')
      return null
    }

    // MIME 타입으로 먼저 체크 (더 빠름)
    if (file.type.startsWith('image/')) {
      return { isImage: true, isVideo: false }
    }
    if (file.type.startsWith('video/')) {
      return { isImage: false, isVideo: true }
    }

    // 확장자 체크 (fallback)
      const fileExtension = file.name.toLowerCase().split('.').pop() || ''
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif']
      const videoExtensions = ['mp4', 'webm', 'mov', 'm4v']
      
    const isImage = imageExtensions.includes(fileExtension)
    const isVideo = videoExtensions.includes(fileExtension)
      
      if (!isImage && !isVideo) {
        showToast(`${file.name}: 이미지 또는 동영상 파일만 업로드할 수 있습니다.`, 'error')
        return null
      }

    return { isImage, isVideo }
  }, [showToast])

  // 미리보기에서 파일 제거 (메모리 최적화)
  const removePreviewFile = useCallback((index: number) => {
    setPreviewFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      if (newFiles.length === 0) {
        setIsPreviewMode(false)
      }
      return newFiles
    })
  }, [])

  // 미리보기에서 모든 파일 제거 (메모리 최적화)
  const clearPreview = useCallback(() => {
    setPreviewFiles([])
    setIsPreviewMode(false)
  }, [])

  // 미리보기 파일들을 실제로 전송
  const sendPreviewFiles = async () => {
    if (previewFiles.length === 0) return
    
    try {
      await handleChatFileUploadFromFiles(previewFiles)
      clearPreview()
    } catch (error) {
      console.error('❌ 미리보기 파일 전송 실패:', error)
      // showToast('파일 전송에 실패했습니다', 'error')
    }
  }

  // 파일을 미리보기에 추가 (이미지 자동 압축)
  const addToPreview = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file => validateFile(file))
    if (validFiles.length === 0) return

    const processedFiles: File[] = []
    
    for (const file of validFiles) {
      const validation = validateFile(file)
      if (!validation) continue

      if (validation.isImage) {
        try {
          // 이미지 압축 (채팅용으로 최적화)
          const compressedFile = await compressImage(file, 1920, 1080, 0.8)
          processedFiles.push(compressedFile)
          
          // 압축률 표시
          // const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1)
          // if (compressionRatio !== '0.0') {
          //   showToast(`${file.name}: ${compressionRatio}% 압축됨`, 'success')
          // }
        } catch (error) {
          console.error('이미지 압축 실패:', error)
          processedFiles.push(file) // 압축 실패 시 원본 사용
        }
      } else {
        processedFiles.push(file) // 비디오나 기타 파일은 그대로
      }
    }

    if (processedFiles.length > 0) {
      setPreviewFiles(prev => [...prev, ...processedFiles])
      setIsPreviewMode(true)
    }
  }, [validateFile, compressImage, showToast])

  // 클립보드에서 파일 붙여넣기 처리 (모든 파일 타입 지원)
  const handleClipboardPaste = async (e: Event) => {
    const clipboardEvent = e as ClipboardEvent
    
    console.log('📋 클립보드 붙여넣기 이벤트 발생')
    
    // 디바운스: 짧은 시간 내 중복 실행 방지
    if (pasteTimeoutRef.current) {
      console.log('🚫 클립보드 붙여넣기 디바운스 차단')
      return
    }

    // 중복 실행 방지
    if (!currentUser || !chatId || uploadingFile || isPasting) {
      console.log('🚫 클립보드 붙여넣기 차단:', { 
        currentUser: !!currentUser, 
        chatId: !!chatId, 
        uploadingFile, 
        isPasting 
      })
      return
    }

    const items = clipboardEvent.clipboardData?.items
    if (!items || items.length === 0) {
      console.log('📋 클립보드에 아이템 없음')
      return
    }

    console.log(`📋 클립보드 아이템 개수: ${items.length}`)
    
    // 모든 아이템 로깅
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      console.log(`📋 아이템 ${i}: kind=${item.kind}, type=${item.type}`)
    }

    const fileItems: DataTransferItem[] = []
    
    // 클립보드에서 모든 파일 타입 찾기
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemType = item.type
      const itemKind = item.kind
      
      console.log(`🔍 검사 중: kind=${itemKind}, type=${itemType}`)
      
      // 파일 타입인지 확인
      if (itemKind === 'file') {
        fileItems.push(item)
        console.log(`✅ 파일 발견: ${itemType}`)
      } else if (itemType.startsWith('image/')) {
        fileItems.push(item)
        console.log(`✅ 이미지 발견: ${itemType}`)
      } else if (itemType.startsWith('video/')) {
        fileItems.push(item)
        console.log(`✅ 비디오 발견: ${itemType}`)
      } else if (itemType.startsWith('audio/')) {
        fileItems.push(item)
        console.log(`✅ 오디오 발견: ${itemType}`)
      } else if (itemType.includes('application/') && itemType !== 'application/x-moz-file') {
        fileItems.push(item)
        console.log(`✅ 애플리케이션 파일 발견: ${itemType}`)
      }
    }

    if (fileItems.length === 0) {
      console.log('📋 클립보드에 파일 없음 (텍스트는 그대로 입력)')
      return // 텍스트는 일반 입력으로 처리
    }

    // 이벤트 전파 중단
    clipboardEvent.preventDefault()
    clipboardEvent.stopPropagation()
    clipboardEvent.stopImmediatePropagation()

    // 디바운스 타이머 설정 (500ms)
    pasteTimeoutRef.current = setTimeout(() => {
      pasteTimeoutRef.current = null
    }, 500)

    console.log(`📋 클립보드 붙여넣기 시작: ${fileItems.length}개 파일`)
    setIsPasting(true)

    try {
      const files: File[] = []
      
      // 클립보드 파일을 File 객체로 변환
      for (const item of fileItems) {
        try {
          const file = item.getAsFile()
          if (file) {
            // 파일명 생성
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const itemType = item.type
            
            // 파일 확장자 추출
            let extension = 'bin'
            if (itemType.startsWith('image/')) {
              extension = itemType.split('/')[1] || 'png'
            } else if (itemType.startsWith('video/')) {
              extension = itemType.split('/')[1] || 'mp4'
            } else if (itemType.startsWith('audio/')) {
              extension = itemType.split('/')[1] || 'mp3'
            } else if (itemType.includes('application/')) {
              // MIME 타입에서 확장자 추출 시도
              const mimeToExt: { [key: string]: string } = {
                'application/pdf': 'pdf',
                'application/zip': 'zip',
                'application/json': 'json',
                'application/xml': 'xml',
                'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                'application/vnd.ms-excel': 'xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
              }
              extension = mimeToExt[itemType] || 'bin'
            }
            
            const fileName = file.name || `clipboard-${timestamp}.${extension}`
            
            // 새로운 File 객체 생성 (이름 포함)
            const namedFile = new File([file], fileName, { type: file.type })
            files.push(namedFile)
            console.log(`✅ 파일 생성 성공: ${fileName} (${file.size} bytes, ${file.type})`)
          } else {
            console.log(`⚠️ 파일 변환 실패: ${item.type}`)
          }
        } catch (error) {
          console.error(`❌ 파일 처리 중 오류: ${item.type}`, error)
        }
      }

      if (files.length === 0) {
        console.log('❌ 변환된 파일 없음')
        setIsPasting(false)
        return
      }

      console.log(`📋 클립보드에서 ${files.length}개 파일 붙여넣기`)

      // 파일을 미리보기에 추가 (이미지는 자동 압축)
      await addToPreview(files)

    } catch (error) {
      console.error('❌ 클립보드 붙여넣기 실패:', error)
      showToast('클립보드 파일 붙여넣기에 실패했습니다', 'error')
    } finally {
      setIsPasting(false)
      console.log('✅ 클립보드 붙여넣기 완료')
    }
  }

  // 파일 배열로부터 채팅 메시지 전송 (공통 로직)
  const handleChatFileUploadFromFiles = async (files: File[]) => {
    if (!currentUser || !chatId) return

    console.log(`💬 채팅 메시지로 ${files.length}개 파일 전송`)

    try {
      setUploadingFile(true)
      setUploadProgress({ current: 0, total: files.length, success: 0, failed: 0 })

      const uploadedFiles: Array<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        thumbnailUrl?: string;
      }> = []

      // 모든 파일 순차 업로드
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
         setUploadProgress({ current: i + 1, total: files.length, success: 0, failed: 0 })
         
         const validation = validateFile(file)
         if (!validation) continue

         try {
           // 파일 업로드 (로깅 제거로 성능 향상)
           const result = await apiClient.uploadFile(file, currentUser.id, chatId)
          
          const fileUrl = result.fileUrl || result.data?.fileUrl
          const thumbnailUrl = result.thumbnailUrl || result.data?.thumbnailUrl
          
          if (!fileUrl) {
            throw new Error('파일 URL을 받지 못했습니다.')
          }

          // 업로드된 파일 정보 저장
          uploadedFiles.push({
            fileUrl: fileUrl,
            fileName: file.name,
            fileSize: file.size,
            thumbnailUrl: thumbnailUrl,
          })

         } catch (error) {
           console.error(`파일 업로드 실패:`, error)
          // showToast(`${file.name} 업로드 실패`, 'error')
        }
      }

      // 업로드된 파일이 있으면 메시지로 전송
      if (uploadedFiles.length > 0) {
        try {
          // 이미지만 필터링
          const imageFiles = uploadedFiles.filter(file => {
            const ext = file.fileName.toLowerCase().split('.').pop() || ''
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif']
            return imageExtensions.includes(ext) || file.fileName.toLowerCase().includes('image')
          })

          if (imageFiles.length === 1) {
            // 단일 이미지
            const sentMessage = await socketClient.sendMessage({
              roomId: chatId,
              userId: currentUser.id,
              content: imageFiles[0].fileName,
              type: 'image',
              fileUrl: imageFiles[0].fileUrl,
              fileName: imageFiles[0].fileName,
              fileSize: imageFiles[0].fileSize,
            })
           } else if (imageFiles.length > 1) {
             // 여러 이미지 묶음
             const sentMessage = await socketClient.sendMessage({
               roomId: chatId,
               userId: currentUser.id,
               content: `${imageFiles.length}장의 사진`,
               type: 'images',
               files: imageFiles,
             })
          }

          // 비디오나 기타 파일이 있으면 개별 전송
          const otherFiles = uploadedFiles.filter(file => !imageFiles.includes(file))
          for (const file of otherFiles) {
            const ext = file.fileName.toLowerCase().split('.').pop() || ''
            const videoExtensions = ['mp4', 'webm', 'mov', 'm4v']
            const messageType = videoExtensions.includes(ext) ? 'video' : 'file'

            await socketClient.sendMessage({
              roomId: chatId,
              userId: currentUser.id,
              content: file.fileName,
              type: messageType,
              fileUrl: file.fileUrl,
              fileName: file.fileName,
              fileSize: file.fileSize,
            })
          }

          // showToast(`${uploadedFiles.length}개 파일을 전송했습니다`, 'success')
        } catch (error) {
          console.error('❌ 메시지 전송 실패:', error)
          showToast('메시지 전송에 실패했습니다', 'error')
        }
      }
    } catch (error) {
      console.error('❌ 채팅 메시지 전송 실패:', error)
      showToast(`파일 전송에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error')
    } finally {
      setUploadingFile(false)
      setUploadProgress({ current: 0, total: 0, success: 0, failed: 0 })
    }
  }

  // 채팅 메시지로 파일 전송 (이미지 자동 압축)
  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !currentUser || !chatId) return

    const fileArray = Array.from(files)
    
    // 이미지 압축 후 미리보기에 추가
    await addToPreview(fileArray)

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
  // 텍스트 내 링크를 클릭 가능하게 만드는 함수
  const renderTextWithLinks = useCallback((text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            className="text-blue-400 hover:text-blue-300 underline break-all cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // 모바일에서는 현재 창에서, 데스크톱에서는 새 창으로 열기
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              if (isMobile) {
                window.location.href = part
              } else {
                window.open(part, '_blank')
              }
            }}
          >
            {part}
          </a>
        )
      }
      return part
    })
  }, [])

  const renderMessage = useCallback((msg: SocketMessage) => {
    const isMyMessage = msg.userId === currentUser?.id
    const fileUrl = getFileUrl(msg.fileUrl)
    
    return (
      <div
        key={msg.tempId || msg.id}
        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`${msg.type === 'image' || msg.type === 'images' || msg.type === 'video' 
            ? 'max-w-[60%] md:max-w-[400px]' 
            : 'max-w-xs lg:max-w-md'
          } px-4 py-2 rounded-2xl ${
            isMyMessage
              ? msg.isFailed
                ? 'bg-red-500 text-white rounded-br-md opacity-70'
                : 'bg-[var(--icon-active)] text-white rounded-br-md'
              : 'bg-secondary text-primary rounded-bl-md'
          } ${msg.isPending ? 'opacity-60' : ''}`}
        >
          {msg.type === 'text' ? (
            <p className="text-sm">{renderTextWithLinks(msg.content)}</p>
          ) : msg.type === 'image' ? (
            <div className="space-y-2">
              <img 
                src={fileUrl} 
                alt={msg.fileName || msg.content}
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity object-contain"
                onClick={() => window.open(fileUrl, '_blank')}
              />
              {/* 텍스트가 있을 때만 표시 (파일명은 숨김) */}
              {msg.content && msg.content !== msg.fileName && (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          ) : msg.type === 'images' ? (
            <div className="space-y-2">
              {/* 여러 이미지 동적 그리드 (3장 이하는 n열, 4장 이상은 3열) */}
              <div 
                className="grid gap-1 max-w-full"
                style={{
                  gridTemplateColumns: `repeat(${
                    (msg.files?.length || 0) <= 3 
                      ? (msg.files?.length || 1) 
                      : 3
                  }, 1fr)`
                }}
              >
                {msg.files?.map((file, index) => {
                  const imageUrl = getFileUrl(file.fileUrl)
                  const thumbnailUrl = file.thumbnailUrl ? getFileUrl(file.thumbnailUrl) : imageUrl
                  
                  return (
                    <div
                      key={index}
                      className="aspect-square bg-gray-200 rounded cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                      onClick={() => window.open(imageUrl, '_blank')}
                    >
                      <img
                        src={thumbnailUrl}
                        alt={file.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )
                })}
              </div>
              {/* 텍스트가 있을 때만 표시 (파일 개수는 숨김) */}
              {msg.content && !msg.content.includes('장의 사진') && (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          ) : msg.type === 'video' ? (
            <div className="space-y-2">
              <video 
                src={fileUrl} 
                controls
                className="rounded-lg max-w-full h-auto"
              />
              {/* 텍스트가 있을 때만 표시 (파일명은 숨김) */}
              {msg.content && msg.content !== msg.fileName && (
                <p className="text-sm">{msg.content}</p>
              )}
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
    <div className="h-screen w-full bg-primary flex flex-col overflow-hidden">
      {/* 헤더 - 고정 */}
      <header className="sticky top-0 bg-primary border-b border-divider px-4 h-16 flex items-center justify-between flex-shrink-0">
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
            <div className="w-10 h-10 bg-[var(--icon-active)] rounded-xl flex items-center justify-center">
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
        <div className="flex items-center space-x-2 relative">
          <Button variant="ghost" className="p-2">
            <span className="text-secondary text-lg">📞</span>
          </Button>
          <Button variant="ghost" className="p-2">
            <span className="text-secondary text-lg">📹</span>
          </Button>
          <div className="relative">
            <Button 
              variant="ghost" 
              className="p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="text-secondary text-lg">⋯</span>
            </Button>
            
            {/* 사이드 메뉴 */}
            {isMenuOpen && (
              <>
                {/* 배경 오버레이 */}
                <div 
                  className="fixed inset-0 bg-black/50 z-[100] animate-fadeIn"
                  onClick={() => setIsMenuOpen(false)}
                />
                
                {/* 오른쪽에서 슬라이드되는 메뉴 */}
                <div className="fixed right-0 top-0 bottom-0 h-screen w-full md:w-1/2 bg-primary z-[100] shadow-2xl animate-slideInRight flex flex-col">
                  {/* 메뉴 헤더 */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
                    <h2 className="text-lg font-semibold text-primary">메뉴</h2>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                      <span className="text-2xl text-secondary">✕</span>
                    </button>
                  </div>
                  
                  {/* 메뉴 리스트 */}
                  <div className="flex-1 overflow-y-auto">
                    <button
                      onClick={() => setIsAlbumOpen(true)}
                      className="w-full px-6 py-4 text-left hover:bg-secondary active:bg-divider transition-colors flex items-center space-x-4 border-b border-divider"
                    >
                      <span className="text-3xl">📷</span>
                      <div>
                        <p className="text-primary font-semibold text-base">{t('album.title')}</p>
                        <p className="text-xs text-secondary mt-1">채팅방 멤버들이 공유한 사진/동영상</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        showToast('준비 중인 기능입니다.', 'info')
                      }}
                      className="w-full px-6 py-4 text-left hover:bg-secondary active:bg-divider transition-colors flex items-center space-x-4 border-b border-divider"
                    >
                      <span className="text-3xl">🔍</span>
                      <div>
                        <p className="text-primary font-medium">메시지 검색</p>
                        <p className="text-xs text-secondary mt-1">대화 내용을 검색합니다</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        showToast('준비 중인 기능입니다.', 'info')
                      }}
                      className="w-full px-6 py-4 text-left hover:bg-secondary active:bg-divider transition-colors flex items-center space-x-4 border-b border-divider"
                    >
                      <span className="text-3xl">⚙️</span>
                      <div>
                        <p className="text-primary font-medium">채팅방 설정</p>
                        <p className="text-xs text-secondary mt-1">알림, 배경 등을 설정합니다</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        showToast('준비 중인 기능입니다.', 'info')
                      }}
                      className="w-full px-6 py-4 text-left hover:bg-secondary active:bg-divider transition-colors flex items-center space-x-4 border-b border-divider"
                    >
                      <span className="text-3xl">👥</span>
                      <div>
                        <p className="text-primary font-medium">참여자 보기</p>
                        <p className="text-xs text-secondary mt-1">채팅방 참여자 목록</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 메시지 목록 */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide min-h-0"
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

      {/* 미리보기 영역 */}
      {isPreviewMode && previewFiles.length > 0 && (
        <div className="bg-secondary/30 border-t border-divider px-2 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between mb-1.5 md:mb-2">
            <h3 className="text-xs md:text-sm font-medium text-primary">
              전송할 파일 ({previewFiles.length}개)
            </h3>
            <button
              onClick={clearPreview}
              className="px-2 md:px-3 py-1 md:py-1.5 bg-gray-500 text-white text-xs md:text-sm rounded-lg hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
          
          {/* 안내 메시지 */}
          {/* <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 이미지가 자동으로 최적화됩니다. 아래 전송 버튼(↑)을 눌러 메시지와 함께 전송하세요
            </p>
          </div> */}
          
           {/* 미리보기 그리드 (성능 최적화) */}
           <div className="grid grid-cols-4 gap-1.5 md:gap-2">
             {previewFiles.map((file, index) => {
               const validation = validateFile(file)
               if (!validation) return null
               
               const isImage = validation.isImage
               const fileUrl = URL.createObjectURL(file)
               
               return (
                 <div
                   key={`${file.name}-${file.size}-${index}`}
                   className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group"
                 >
                   {isImage ? (
                     <img
                       src={fileUrl}
                       alt={file.name}
                       className="w-full h-full object-cover"
                       loading="lazy"
                       decoding="async"
                       style={{ maxWidth: '100px', maxHeight: '100px' }}
                       onLoad={() => {
                         // 이미지 로드 완료 후 URL 해제 (메모리 절약)
                         setTimeout(() => URL.revokeObjectURL(fileUrl), 1000)
                       }}
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-gray-300">
                       <span className="text-2xl">🎥</span>
                     </div>
                   )}
                   
                   {/* 삭제 버튼 */}
                   <button
                     onClick={() => removePreviewFile(index)}
                     className="absolute top-0.5 md:top-1 right-0.5 md:right-1 bg-red-500 text-white rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-bold opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                   >
                     ✕
                   </button>
                   
                   {/* 파일 정보 */}
                   <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] md:text-xs p-0.5 md:p-1">
                     <div className="truncate">{file.name}</div>
                     <div className="text-[8px] md:text-xs opacity-75">
                       {(file.size / 1024 / 1024).toFixed(1)}MB
                     </div>
                   </div>
                 </div>
               )
             })}
           </div>
        </div>
      )}

      {/* 메시지 입력 - 고정 */}
      <div 
        ref={inputContainerRef}
        className={`bg-primary border-t border-divider px-2 md:px-4 py-2 md:py-3 flex-shrink-0 ${isMenuOpen ? 'hidden' : ''}`}
      >
        {(uploadingFile || isPasting) && (
          <div className="mb-1.5 md:mb-2 px-2 md:px-3 py-1.5 md:py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-1.5 md:space-x-2">
              <span className="text-base md:text-lg animate-spin">⏳</span>
              <span className="text-xs md:text-sm text-blue-600 dark:text-blue-400 flex-1">
                {isPasting 
                  ? '클립보드 이미지 붙여넣기 중...'
                  : uploadProgress.total > 1 
                  ? `파일 업로드 중... (${uploadProgress.current}/${uploadProgress.total})`
                  : '파일 업로드 중...'}
              </span>
            </div>
            {uploadingFile && uploadProgress.total > 1 && (
              <div className="mt-1.5 md:mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 md:h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-1.5 md:h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] md:text-xs text-blue-600 dark:text-blue-400">
                  <span>✅ 성공: {uploadProgress.success}</span>
                  {uploadProgress.failed > 0 && <span className="text-red-600 dark:text-red-400">❌ 실패: {uploadProgress.failed}</span>}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center space-x-1.5 md:space-x-3">
          {/* 파일 업로드 버튼 (multiple 지원) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.mp4,.webm,.mov,.m4v"
            onChange={handleChatFileUpload}
            className="hidden"
            multiple
          />
          <Button 
            variant="ghost" 
            className="p-1.5 md:p-2 flex-shrink-0"
            onClick={handleFileClick}
            disabled={uploadingFile || isPasting}
          >
            <span className={`text-base md:text-lg ${(uploadingFile || isPasting) ? 'text-gray-400' : 'text-secondary'}`}>
              {(uploadingFile || isPasting) ? '⏳' : '📎'}
            </span>
          </Button>
          <div className="flex-1 relative min-w-0">
            {isMobile ? (
              <textarea
                ref={messageInputRef as React.RefObject<HTMLTextAreaElement>}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  // 높이 자동 조절
                  const target = e.target
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
                onFocus={handleInputFocus}
                onKeyPress={handleKeyPress}
                placeholder={isPasting ? '파일 처리 중...' : t('chat.messagePlaceholder')}
                className="w-full px-2.5 md:px-4 py-2 md:py-3 pr-8 md:pr-12 bg-primary border border-divider rounded-lg text-[14px] md:text-base text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-[var(--icon-active)] resize-none overflow-y-auto"
                disabled={isPasting}
                rows={1}
                style={{
                  minHeight: '40px',
                  maxHeight: '120px',
                  height: '40px',
                }}
              />
            ) : (
              <Input
                ref={messageInputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={handleInputFocus}
                onKeyPress={handleKeyPress}
                placeholder={isPasting ? '파일 처리 중...' : t('chat.messagePlaceholder')}
                className="pr-12 text-[11px] md:text-base"
                disabled={isPasting}
              />
            )}
            <Button
              variant="ghost"
              className="absolute right-1 md:right-2 top-1/2 transform -translate-y-1/2 p-0.5 md:p-1 flex-shrink-0"
              disabled={isPasting}
            >
              <span className="text-secondary text-base md:text-lg">😊</span>
            </Button>
          </div>
          <button
            type="button"
            onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
              // 마우스/터치 다운 시 blur 방지 (키보드 유지)
              e.preventDefault()
            }}
            onTouchStart={(e: React.TouchEvent<HTMLButtonElement>) => {
              // 모바일 터치 시 blur 방지
              e.preventDefault()
            }}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault()
              handleSendMessage()
            }}
            disabled={(!message.trim() && previewFiles.length === 0) || isPasting}
            className={`p-2 md:p-3 rounded-full transition-all flex-shrink-0 ${
              (message.trim() || previewFiles.length > 0) && !isPasting
                ? 'bg-[var(--icon-active)] text-white hover:opacity-90 active:scale-95'
                : 'bg-secondary text-secondary cursor-not-allowed'
            }`}
          >
            <span className="text-base md:text-lg">↑</span>
          </button>
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

      {/* 사진첩 모달 */}
      <ChatAlbum
        chatId={chatId}
        isOpen={isAlbumOpen}
        onClose={() => setIsAlbumOpen(false)}
        showToast={showToast}
        validateFile={validateFile}
      />
    </div>
  )
}
