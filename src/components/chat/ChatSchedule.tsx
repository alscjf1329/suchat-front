'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from '@/contexts/I18nContext'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import Toast, { ToastType } from '@/components/ui/Toast'
import { Input, Button } from '@/components/ui'

interface Schedule {
  id: string
  roomId: string
  createdBy: string
  title: string
  memo?: string
  startDate: string
  endDate?: string
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    name: string
    email: string
  }
  participants?: Array<{
    id: string
    userId: string
    user?: {
      id: string
      name: string
      email: string
    }
  }>
}

interface ChatScheduleProps {
  chatId: string
  isOpen: boolean
  onClose: () => void
  showToast: (message: string, type: ToastType) => void
  roomParticipants?: Array<{ id: string; name: string; email: string }>
}

export default function ChatSchedule({ 
  chatId, 
  isOpen, 
  onClose, 
  showToast,
  roomParticipants = []
}: ChatScheduleProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  
  // 일정 상태
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [actualRoomParticipants, setActualRoomParticipants] = useState<Array<{ id: string; name: string; email: string }>>([])
  
  // 일정 생성/수정 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    memo: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    participantIds: [] as string[],
    // 알림 설정
    notificationBeforeEvent: '0', // 이벤트 시간 기준 몇 분 전 (0 = 이벤트 시간)
    notificationInterval: '30', // 분 단위
    notificationRepeatCount: '1', // 반복 횟수
  })
  
  // 알림 설정 확장 여부
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  

  // showToast와 t를 ref로 저장하여 안정적인 참조 유지
  const showToastRef = useRef(showToast)
  const tRef = useRef(t)
  
  useEffect(() => {
    showToastRef.current = showToast
    tRef.current = t
  }, [showToast, t])

  // 참여자 목록 불러오기 (REST API)
  const loadRoomParticipants = useCallback(async () => {
    if (!chatId) return
    
    try {
      const response = await apiClient.get(`/chat/schedule/${chatId}/participants`)
      const participants = response.data?.data || response.data || []
      setActualRoomParticipants(participants)
    } catch (error) {
      console.error('❌ 참여자 목록 로드 실패:', error)
      // 실패 시 prop으로 받은 roomParticipants 사용
      setActualRoomParticipants(roomParticipants)
    }
  }, [chatId, roomParticipants])

  // 일정 목록 불러오기
  const loadSchedules = useCallback(async () => {
    if (!chatId || !currentUser) return
    
    try {
      setIsLoading(true)
      const response = await apiClient.get(`/chat/schedule/${chatId}`)
      // 백엔드 응답 형식: { success: true, data: schedules } 또는 직접 배열
      let schedulesArray: Schedule[] = []
      if (response.data && response.data.data) {
        // 백엔드가 { success: true, data: schedules } 형식으로 반환
        schedulesArray = Array.isArray(response.data.data) ? response.data.data : []
      } else if (Array.isArray(response.data)) {
        // 직접 배열로 반환되는 경우
        schedulesArray = response.data
      } else if (Array.isArray(response)) {
        schedulesArray = response
      }
      
      setSchedules(schedulesArray)
    } catch (error) {
      console.error('❌ 일정 로드 실패:', error)
      showToastRef.current(tRef.current('schedule.loadFailed'), 'error')
      setSchedules([])
    } finally {
      setIsLoading(false)
    }
  }, [chatId, currentUser])

  // 일정 생성
  const handleCreateSchedule = useCallback(async () => {
    // 기본 필수 항목 확인
    if (!chatId || !currentUser) {
      showToast(t('schedule.fillRequired'), 'error')
      return
    }

    // 제목 유효성 검사
    const trimmedTitle = formData.title.trim()
    if (!trimmedTitle) {
      showToast(t('schedule.titleRequired') || '일정 제목을 입력해주세요.', 'error')
      return
    }
    
    if (trimmedTitle.length < 2) {
      showToast(t('schedule.titleTooShort') || '제목은 최소 2자 이상이어야 합니다.', 'error')
      return
    }
    
    if (trimmedTitle.length > 100) {
      showToast(t('schedule.titleTooLong') || '제목은 100자 이하여야 합니다.', 'error')
      return
    }

    // 시작 날짜 유효성 검사
    if (!formData.startDate) {
      showToast(t('schedule.startDateRequired') || '시작 날짜를 선택해주세요.', 'error')
      return
    }

    // 날짜와 시간을 조합
    const startDateTime = formData.allDay 
      ? `${formData.startDate}T00:00:00`
      : formData.startTime 
        ? `${formData.startDate}T${formData.startTime}:00`
        : `${formData.startDate}T00:00:00`
    
    const startDate = new Date(startDateTime)
    if (isNaN(startDate.getTime())) {
      showToast(t('schedule.invalidStartDate') || '유효하지 않은 시작 날짜입니다.', 'error')
      return
    }

    // 종료 날짜 유효성 검사
    let endDate: Date | undefined
    if (formData.endDate) {
      const endDateTime = formData.allDay
        ? `${formData.endDate}T23:59:59`
        : formData.endTime
          ? `${formData.endDate}T${formData.endTime}:00`
          : `${formData.endDate}T23:59:59`
      
      endDate = new Date(endDateTime)
      if (isNaN(endDate.getTime())) {
        showToast(t('schedule.invalidEndDate') || '유효하지 않은 종료 날짜입니다.', 'error')
        return
      }

      // 종료 날짜가 시작 날짜보다 이전인지 확인
      if (endDate < startDate) {
        showToast(t('schedule.endDateBeforeStart') || '종료 날짜는 시작 날짜보다 이후여야 합니다.', 'error')
        return
      }
    }

    // 알림 일시 계산 (시작 일시에서 notificationBeforeEvent 분을 뺀 시간)
    let notificationDateTime: string | undefined
    if (formData.notificationBeforeEvent && formData.notificationBeforeEvent !== '0') {
      const beforeMinutes = parseInt(formData.notificationBeforeEvent, 10)
      const notificationDate = new Date(startDate)
      notificationDate.setMinutes(notificationDate.getMinutes() - beforeMinutes)
      notificationDateTime = notificationDate.toISOString()
    } else if (formData.notificationBeforeEvent === '0') {
      // 이벤트 시간 = 시작 일시
      notificationDateTime = startDate.toISOString()
    }

    try {
      const response = await apiClient.post(`/chat/schedule/${chatId}`, {
        title: trimmedTitle,
        memo: formData.memo.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        notificationDateTime: notificationDateTime,
        participantIds: formData.participantIds,
      })

      showToast(t('schedule.created'), 'success')
      setIsCreating(false)
      setShowNotificationSettings(false)
      setFormData({
        title: '',
        memo: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        allDay: false,
        participantIds: [],
        notificationBeforeEvent: '0',
        notificationInterval: '30',
        notificationRepeatCount: '1',
      })
      await loadSchedules()
    } catch (error) {
      console.error('❌ 일정 생성 실패:', error)
      showToast(t('schedule.createFailed'), 'error')
    }
  }, [chatId, currentUser, formData, showToast, t, loadSchedules])

  // 일정 수정
  const handleUpdateSchedule = useCallback(async () => {
    if (!editingSchedule) {
      showToast(t('schedule.fillRequired'), 'error')
      return
    }

    // 제목 유효성 검사
    const trimmedTitle = formData.title.trim()
    if (!trimmedTitle) {
      showToast(t('schedule.titleRequired') || '일정 제목을 입력해주세요.', 'error')
      return
    }
    
    if (trimmedTitle.length < 2) {
      showToast(t('schedule.titleTooShort') || '제목은 최소 2자 이상이어야 합니다.', 'error')
      return
    }
    
    if (trimmedTitle.length > 100) {
      showToast(t('schedule.titleTooLong') || '제목은 100자 이하여야 합니다.', 'error')
      return
    }

    // 시작 날짜 유효성 검사
    if (!formData.startDate) {
      showToast(t('schedule.startDateRequired') || '시작 날짜를 선택해주세요.', 'error')
      return
    }

    // 날짜와 시간을 조합
    const startDateTime = formData.allDay 
      ? `${formData.startDate}T00:00:00`
      : formData.startTime 
        ? `${formData.startDate}T${formData.startTime}:00`
        : `${formData.startDate}T00:00:00`
    
    const startDate = new Date(startDateTime)
    if (isNaN(startDate.getTime())) {
      showToast(t('schedule.invalidStartDate') || '유효하지 않은 시작 날짜입니다.', 'error')
      return
    }

    // 종료 날짜 유효성 검사
    let endDate: Date | undefined
    if (formData.endDate) {
      const endDateTime = formData.allDay
        ? `${formData.endDate}T23:59:59`
        : formData.endTime
          ? `${formData.endDate}T${formData.endTime}:00`
          : `${formData.endDate}T23:59:59`
      
      endDate = new Date(endDateTime)
      if (isNaN(endDate.getTime())) {
        showToast(t('schedule.invalidEndDate') || '유효하지 않은 종료 날짜입니다.', 'error')
        return
      }

      // 종료 날짜가 시작 날짜보다 이전인지 확인
      if (endDate < startDate) {
        showToast(t('schedule.endDateBeforeStart') || '종료 날짜는 시작 날짜보다 이후여야 합니다.', 'error')
        return
      }
    }

    // 알림 일시 계산 (시작 일시에서 notificationBeforeEvent 분을 뺀 시간)
    let notificationDateTime: string | undefined
    if (formData.notificationBeforeEvent && formData.notificationBeforeEvent !== '0') {
      const beforeMinutes = parseInt(formData.notificationBeforeEvent, 10)
      const notificationDate = new Date(startDate)
      notificationDate.setMinutes(notificationDate.getMinutes() - beforeMinutes)
      notificationDateTime = notificationDate.toISOString()
    } else if (formData.notificationBeforeEvent === '0') {
      // 이벤트 시간 = 시작 일시
      notificationDateTime = startDate.toISOString()
    }

    try {
      await apiClient.put(`/chat/schedule/${editingSchedule.id}`, {
        title: trimmedTitle,
        memo: formData.memo.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        notificationDateTime: notificationDateTime,
        participantIds: formData.participantIds,
      })

      showToast(t('schedule.updated'), 'success')
      setEditingSchedule(null)
    setFormData({
      title: '',
      memo: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      allDay: false,
      participantIds: [],
      notificationBeforeEvent: '0',
      notificationInterval: '30',
      notificationRepeatCount: '1',
    })
    setShowNotificationSettings(false)
    setIsCreating(false)
      await loadSchedules()
    } catch (error) {
      console.error('❌ 일정 수정 실패:', error)
      showToast(t('schedule.updateFailed'), 'error')
    }
  }, [editingSchedule, formData, showToast, t, loadSchedules])

  // 일정 삭제
  const handleDeleteSchedule = useCallback(async (scheduleId: string) => {
    if (!confirm(t('schedule.deleteConfirm'))) return

    try {
      await apiClient.delete(`/chat/schedule/${scheduleId}`)
      showToast(t('schedule.deleted'), 'success')
      await loadSchedules()
    } catch (error) {
      console.error('❌ 일정 삭제 실패:', error)
      showToast(t('schedule.deleteFailed'), 'error')
    }
  }, [showToast, t, loadSchedules])

  // 일정 편집 시작
  const handleEditSchedule = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule)
    const startDate = schedule.startDate ? new Date(schedule.startDate) : new Date()
    const endDate = schedule.endDate ? new Date(schedule.endDate) : null
    
    setFormData({
      title: schedule.title,
      memo: schedule.memo || '',
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate ? endDate.toISOString().split('T')[0] : '',
      endTime: endDate ? endDate.toTimeString().slice(0, 5) : '',
      allDay: false, // TODO: 전체일정 여부 판단 로직 추가 가능
      participantIds: schedule.participants?.map(p => p.userId) || [],
      notificationBeforeEvent: '0',
      notificationInterval: '30',
      notificationRepeatCount: '1',
    })
    setShowNotificationSettings(false)
    setIsCreating(true)
  }, [])

  // 참여자 토글
  const toggleParticipant = useCallback((userId: string) => {
    setFormData(prev => ({
      ...prev,
      participantIds: prev.participantIds.includes(userId)
        ? prev.participantIds.filter(id => id !== userId)
        : [...prev.participantIds, userId],
    }))
  }, [])

  // 날짜 포맷팅
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  // 날짜만 포맷팅 (시간 제외)
  const formatDateOnly = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [])

  // 시간만 포맷팅
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  // 모달 열릴 때 초기화
  const prevIsOpenRef = useRef(false)
  useEffect(() => {
    // 모달이 닫혔다가 다시 열릴 때만 초기화
    if (isOpen && !prevIsOpenRef.current) {
      setIsCreating(false)
      setEditingSchedule(null)
      setShowNotificationSettings(false)
      setFormData({
        title: '',
        memo: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        allDay: false,
        participantIds: [],
        notificationBeforeEvent: '0',
        notificationInterval: '30',
        notificationRepeatCount: '1',
      })
      loadRoomParticipants()
      loadSchedules()
    }
    prevIsOpenRef.current = isOpen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chatId])

  // 일정 생성 폼이 열릴 때 모든 참가자 자동 선택
  useEffect(() => {
    if (isCreating && !editingSchedule && actualRoomParticipants.length > 0) {
      // 새 일정을 만들 때만 모든 참가자를 자동 선택
      const allParticipantIds = actualRoomParticipants.map(p => p.id)
      setFormData(prev => ({
        ...prev,
        participantIds: allParticipantIds,
      }))
    }
  }, [isCreating, editingSchedule, actualRoomParticipants])

  // 모달이 열릴 때 배경 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      // 현재 스크롤 위치 저장
      const scrollY = window.scrollY
      // body 스크롤 막기
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // 모달이 닫힐 때 원래 상태로 복원
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
        <div 
          className="bg-primary rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-200/30 dark:border-gray-700/30 overflow-hidden transition-all duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex flex-col border-b border-gray-200/30 dark:border-gray-700/30 bg-gradient-to-r from-primary via-primary to-secondary/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary tracking-tight">
                    {isCreating ? t('schedule.create') : t('schedule.title')}
                  </h2>
                  {!isCreating ? (
                    <p className="text-sm text-secondary mt-1 font-medium">
                      {t('schedule.scheduleCount', { count: schedules.length })}
                    </p>
                  ) : (
                    <p className="text-sm text-secondary mt-1 font-medium">
                      {t('schedule.create')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isCreating && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsCreating(true)
                    }}
                    className="p-2.5 md:px-4 md:py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center md:justify-start md:space-x-2 bg-[var(--icon-active)] text-white hover:opacity-90 font-semibold shadow-lg"
                    title={t('schedule.create')}
                  >
                    <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden md:inline text-sm md:text-base font-semibold">{t('schedule.create')}</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2.5 md:px-4 md:py-2.5 hover:bg-secondary rounded-xl transition-all duration-200 text-secondary hover:text-primary border border-divider flex items-center justify-center md:justify-start md:space-x-2"
                  title={t('common.close')}
                >
                  <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden md:inline text-sm font-semibold">{t('common.close')}</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* 본문 */}
          <div className="flex-1 overflow-hidden p-4 md:p-5 relative min-h-0 flex flex-col">
            {/* 일정 생성/수정 폼 */}
            {isCreating && (
              <div className="h-full flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0" style={{ paddingBottom: '70px' }}>
                  {/* 제목 입력 */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder={t('schedule.titlePlaceholder')}
                      value={formData.title}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.length <= 100) {
                          setFormData(prev => ({ ...prev, title: value }))
                        }
                      }}
                      maxLength={100}
                      className="w-full text-2xl md:text-3xl font-semibold bg-transparent border-none outline-none text-primary placeholder-secondary focus:ring-0 px-0 py-1.5"
                      autoFocus
                    />
                  </div>
                  
                  {/* 날짜 및 시간 설정 */}
                  <div className="mb-4 space-y-3">
                    {/* 시작일시 */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1.5">
                        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-2">
                          {t('schedule.startDateTime')}
                        </label>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex-1 min-w-[140px]">
                            <Input
                              type="date"
                              value={formData.startDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full"
                            />
                          </div>
                          {!formData.allDay && (
                            <div className="flex-1 min-w-[120px]">
                              <Input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 종료일시 */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1.5">
                        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-2">
                          {t('schedule.endDateTime')}
                        </label>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex-1 min-w-[140px]">
                            <Input
                              type="date"
                              value={formData.endDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                              className="w-full"
                            />
                          </div>
                          {!formData.allDay && (
                            <div className="flex-1 min-w-[120px]">
                              <Input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 전체일정 체크박스 */}
                    <div className="flex justify-end">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="allDay"
                          checked={formData.allDay}
                          onChange={(e) => setFormData(prev => ({ ...prev, allDay: e.target.checked }))}
                          className="w-4 h-4 rounded border-divider text-[var(--icon-active)] focus:ring-[var(--icon-active)] cursor-pointer transition-all"
                        />
                        <label htmlFor="allDay" className="text-sm font-medium text-primary cursor-pointer whitespace-nowrap">
                          {t('schedule.allDay')}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 메모 */}
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-2">
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <textarea
                          placeholder={t('schedule.memoPlaceholder')}
                          value={formData.memo}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value.length <= 500) {
                              setFormData(prev => ({ ...prev, memo: value }))
                            }
                          }}
                          maxLength={500}
                          className="w-full px-3 py-2 bg-primary border border-divider rounded-lg text-sm text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-[var(--icon-active)] resize-none min-h-[80px] transition-all"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 참여자 선택 */}
                  {actualRoomParticipants.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 pt-2">
                          <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2">
                            {actualRoomParticipants.map((participant) => (
                              <button
                                key={participant.id}
                                onClick={() => toggleParticipant(participant.id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                  formData.participantIds.includes(participant.id)
                                    ? 'bg-[var(--icon-active)] text-white shadow-md hover:opacity-90'
                                    : 'bg-secondary text-primary hover:bg-divider border border-divider hover:border-[var(--icon-active)]/50'
                                }`}
                              >
                                {formData.participantIds.includes(participant.id) && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {participant.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 알림 설정 - 접을 수 있는 섹션 */}
                  <div className="mb-4 border-t border-divider pt-4">
                    <button
                      onClick={() => setShowNotificationSettings(!showNotificationSettings)}
                      className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity py-1"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="text-sm font-semibold text-primary">{t('schedule.notificationSettings')}</span>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-secondary transition-transform duration-200 ${showNotificationSettings ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showNotificationSettings && (
                      <div className="mt-3">
                        {/* 알림 시간 */}
                        <div className="flex items-center justify-end gap-2.5">
                          <label className="text-sm font-medium text-primary whitespace-nowrap flex-shrink-0">
                            {t('schedule.notification')}
                          </label>
                          <select
                            value={formData.notificationBeforeEvent}
                            onChange={(e) => setFormData(prev => ({ ...prev, notificationBeforeEvent: e.target.value }))}
                            className="px-3 py-2 text-sm bg-primary border border-divider rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-[var(--icon-active)] transition-all max-w-[180px]"
                          >
                            <option value="0">{t('schedule.eventTime')}</option>
                            <option value="5">{t('schedule.before5min')}</option>
                            <option value="10">{t('schedule.before10min')}</option>
                            <option value="15">{t('schedule.before15min')}</option>
                            <option value="30">{t('schedule.before30min')}</option>
                            <option value="60">{t('schedule.before1hour')}</option>
                            <option value="120">{t('schedule.before2hour')}</option>
                            <option value="1440">{t('schedule.before1day')}</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 하단 고정 버튼 바 */}
                <div className="absolute bottom-0 left-0 right-0 border-t border-divider bg-primary p-3 md:p-4 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsCreating(false)
                      setEditingSchedule(null)
                      setShowNotificationSettings(false)
                      setFormData({
                        title: '',
                        memo: '',
                        startDate: '',
                        startTime: '',
                        endDate: '',
                        endTime: '',
                        allDay: false,
                        participantIds: [],
                        notificationBeforeEvent: '0',
                        notificationInterval: '30',
                        notificationRepeatCount: '1',
                      })
                    }}
                    className="px-6 py-2.5"
                  >
                    <span className="text-sm font-semibold">{t('common.cancel')}</span>
                  </Button>
                  <Button
                    onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                    className="px-6 py-2.5 bg-[var(--icon-active)] hover:opacity-90 text-white"
                  >
                    <span className="text-sm font-semibold">{editingSchedule ? t('common.save') : t('schedule.create')}</span>
                  </Button>
                </div>
              </div>
            )}
            
            {/* 일정 목록 (타임라인 스타일) */}
            {!isCreating && (
              <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 border-4 border-[var(--icon-active)] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-secondary">{t('common.loading')}</p>
                    </div>
                  </div>
                ) : (schedules.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--icon-active)]/20 to-[var(--icon-active)]/10 flex items-center justify-center mb-6">
                      <span className="text-5xl">📅</span>
                    </div>
                    <p className="text-primary font-bold text-lg mb-2">{t('schedule.empty')}</p>
                    <p className="text-secondary text-sm text-center max-w-sm">{t('schedule.emptyMessage')}</p>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsCreating(true)
                      }}
                      className="mt-6 px-6 py-3 bg-[var(--icon-active)] hover:opacity-90 font-semibold shadow-lg"
                    >
                      {t('schedule.create')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                {schedules.map((schedule, index) => {
                  const startDate = new Date(schedule.startDate)
                  const endDate = schedule.endDate ? new Date(schedule.endDate) : null
                  const isSameDay = endDate && startDate.toDateString() === endDate.toDateString()
                  
                  // 이전 일정과 같은 날짜인지 확인
                  const prevSchedule = index > 0 ? schedules[index - 1] : null
                  const prevStartDate = prevSchedule ? new Date(prevSchedule.startDate) : null
                  const isSameDateAsPrev = prevStartDate && 
                    startDate.getFullYear() === prevStartDate.getFullYear() &&
                    startDate.getMonth() === prevStartDate.getMonth() &&
                    startDate.getDate() === prevStartDate.getDate()
                  
                  // 다음 일정과 같은 날짜인지 확인
                  const nextSchedule = index < schedules.length - 1 ? schedules[index + 1] : null
                  const nextStartDate = nextSchedule ? new Date(nextSchedule.startDate) : null
                  const isSameDateAsNext = nextStartDate && 
                    startDate.getFullYear() === nextStartDate.getFullYear() &&
                    startDate.getMonth() === nextStartDate.getMonth() &&
                    startDate.getDate() === nextStartDate.getDate()
                  
                  return (
                    <div
                      key={schedule.id}
                      className={`relative pl-10 md:pl-12 ${isSameDateAsPrev ? 'pb-4' : 'pb-8'} last:pb-0`}
                    >
                      {/* 타임라인 라인 */}
                      {index < schedules.length - 1 && (
                        <div className={`absolute left-5 md:left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-[var(--icon-active)] ${isSameDateAsNext ? 'to-[var(--icon-active)]/30' : 'to-divider'}`} />
                      )}
                      
                      {/* 타임라인 점 - 같은 날짜면 작게 표시 */}
                      {isSameDateAsPrev ? (
                        <div className="absolute left-2 md:left-3 top-4 w-6 h-6 md:w-8 md:h-8 bg-[var(--icon-active)]/30 rounded-full flex items-center justify-center border-2 border-[var(--icon-active)]/50 z-10" />
                      ) : (
                        <div className="absolute left-0 top-2 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[var(--icon-active)] to-[var(--icon-active)]/80 rounded-full flex items-center justify-center shadow-lg border-4 border-primary z-10">
                          <span className="text-white text-lg md:text-xl font-bold">
                            {startDate.getDate()}
                          </span>
                        </div>
                      )}
                      
                      {/* 일정 카드 */}
                      <div className="bg-gradient-to-br from-secondary/50 via-secondary/30 to-secondary/50 rounded-2xl p-5 md:p-6 border border-divider hover:border-[var(--icon-active)]/50 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl md:text-2xl font-bold text-primary mb-2 group-hover:text-[var(--icon-active)] transition-colors">
                              {schedule.title}
                            </h3>
                            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-1 md:space-y-0">
                              <div className="flex items-center space-x-2 text-sm text-secondary">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">
                                  {isSameDay && schedule.endDate
                                    ? `${formatDateOnly(schedule.startDate)} ${formatTime(schedule.startDate)} ~ ${formatTime(schedule.endDate)}`
                                    : `${formatDate(schedule.startDate)}${schedule.endDate ? ` ~ ${formatDate(schedule.endDate)}` : ''}`
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 액션 버튼 */}
                          {schedule.createdBy === currentUser?.id && (
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="p-2 hover:bg-[var(--icon-active)]/20 rounded-xl transition-all duration-200 group/btn"
                                title={t('common.edit')}
                              >
                                <svg className="w-5 h-5 text-secondary group-hover/btn:text-[var(--icon-active)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="p-2 hover:bg-red-500/20 rounded-xl transition-all duration-200 group/btn"
                                title={t('common.delete')}
                              >
                                <svg className="w-5 h-5 text-secondary group-hover/btn:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {schedule.memo && (
                          <div className="mb-4 p-4 bg-primary/50 rounded-xl border border-divider">
                            <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">
                              {schedule.memo}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-divider">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2 text-sm text-secondary">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="font-medium">{t('schedule.createdBy')}:</span>
                              <span className="px-2 py-1 bg-[var(--icon-active)]/20 text-[var(--icon-active)] rounded-lg font-semibold">
                                {schedule.creator?.name || 
                                 actualRoomParticipants.find(rp => rp.id === schedule.createdBy)?.name || 
                                 schedule.createdBy || 
                                 t('schedule.unknown')}
                              </span>
                            </div>
                          </div>
                          {schedule.participants && schedule.participants.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-secondary font-medium">{t('schedule.participants')}:</span>
                              <div className="flex items-center space-x-1.5 flex-wrap gap-1.5">
                                {schedule.participants.slice(0, 5).map((p) => {
                                  // 참여자 이름 찾기: user 객체가 있으면 사용, 없으면 actualRoomParticipants에서 찾기
                                  const participantName = p.user?.name || 
                                    actualRoomParticipants.find(rp => rp.id === p.userId)?.name || 
                                    p.userId || 
                                    t('schedule.unknown')
                                  return (
                                    <span 
                                      key={p.id} 
                                      className="px-2.5 py-1 bg-secondary text-primary rounded-lg text-sm font-medium border border-divider"
                                    >
                                      {participantName}
                                    </span>
                                  )
                                })}
                                {schedule.participants.length > 5 && (
                                  <span className="px-2.5 py-1 bg-secondary text-secondary rounded-lg text-sm font-medium border border-divider">
                                    +{schedule.participants.length - 5}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
