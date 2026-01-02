'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from '@/contexts/I18nContext'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import Toast, { ToastType } from '@/components/ui/Toast'

interface ChatAlbumProps {
  chatId: string
  isOpen: boolean
  onClose: () => void
  showToast: (message: string, type: ToastType) => void
  validateFile: (file: File) => { isImage: boolean; isVideo: boolean } | null
}

export default function ChatAlbum({ 
  chatId, 
  isOpen, 
  onClose, 
  showToast,
  validateFile 
}: ChatAlbumProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  
  // 사진첩 상태
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([])
  const [albumFolders, setAlbumFolders] = useState<any[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [albumPage, setAlbumPage] = useState(0)
  const [albumHasMore, setAlbumHasMore] = useState(true)
  const [albumLoading, setAlbumLoading] = useState(false)
  const [albumTotal, setAlbumTotal] = useState(0)
  const albumScrollRef = useRef<HTMLDivElement>(null)
  const albumFileInputRef = useRef<HTMLInputElement>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [albumTab, setAlbumTab] = useState<'folders' | 'photos'>('photos')
  
  // 선택 모드 상태
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [isDownloading, setIsDownloading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 })

  // 폴더 목록 불러오기
  const loadFolders = useCallback(async () => {
    if (!chatId) return
    try {
      const response = await apiClient.get(`/chat/album/${chatId}/folders`)
      const folders = Array.isArray(response) ? response : (response.data || [])
      setAlbumFolders(folders)
    } catch (error) {
      console.error('❌ 폴더 로드 실패:', error)
      setAlbumFolders([])
    }
  }, [chatId])

  // 사진첩 불러오기 (페이지네이션 지원)
  const loadAlbum = useCallback(async (folderId?: string | null, page: number = 0, append: boolean = false) => {
    if (!chatId) return
    
    try {
      setAlbumLoading(true)
      const limit = 30
      const offset = page * limit
      
      let response
      if (folderId) {
        response = await apiClient.get(`/chat/album/${chatId}/folders/${folderId}?limit=${limit}&offset=${offset}`)
      } else {
        response = await apiClient.get(`/chat/album/${chatId}?limit=${limit}&offset=${offset}`)
      }
      
      const result = response.data || response
      let photos: any[] = []
      let total = 0
      
      if (result && typeof result === 'object' && 'albums' in result) {
        photos = result.albums || []
        total = result.total || 0
      } else if (Array.isArray(result)) {
        photos = result
        total = result.length
      }
      
      const filteredPhotos = folderId === null 
        ? photos.filter((p: any) => !p.folderId)
        : photos
      
      if (append) {
        setAlbumPhotos(prev => [...prev, ...filteredPhotos])
      } else {
        setAlbumPhotos(filteredPhotos)
      }
      
      const hasMore = filteredPhotos.length === limit && (offset + filteredPhotos.length) < total
      setAlbumHasMore(hasMore)
      setAlbumPage(page)
    } catch (error) {
      console.error('❌ 사진첩 로드 실패:', error)
      if (!append) {
        setAlbumPhotos([])
      }
      setAlbumHasMore(false)
      showToast(t('album.loadFailed'), 'error')
    } finally {
      setAlbumLoading(false)
    }
  }, [chatId, showToast, t])

  // 사진첩 전체 개수 조회
  const loadAlbumCount = useCallback(async (folderId?: string | null) => {
    if (!chatId) return
    
    try {
      const folderIdParam = folderId === null ? '' : (folderId || undefined)
      const url = folderIdParam !== undefined 
        ? `/chat/album/${chatId}/count?folderId=${folderIdParam === '' ? '' : folderIdParam}`
        : `/chat/album/${chatId}/count`
      
      const response = await apiClient.get(url)
      const result = response.data || response
      const count = result.count || 0
      setAlbumTotal(count)
    } catch (error) {
      console.error('❌ 사진 개수 조회 실패:', error)
    }
  }, [chatId])
  
  // 사진첩 초기 로드
  const loadAlbumInitial = useCallback(async (folderId?: string | null) => {
    setAlbumPage(0)
    setAlbumHasMore(true)
    await loadAlbumCount(folderId)
    await loadAlbum(folderId, 0, false)
  }, [loadAlbumCount, loadAlbum])
  
  // 사진첩 다음 페이지 로드
  const loadAlbumNext = useCallback(async () => {
    if (!albumHasMore || albumLoading) return
    await loadAlbum(selectedFolderId, albumPage + 1, true)
  }, [selectedFolderId, albumPage, albumHasMore, albumLoading, loadAlbum])

  // 폴더 생성
  const createFolder = useCallback(async (parentId?: string) => {
    if (!chatId || !newFolderName.trim()) return
    
    try {
      await apiClient.post(`/chat/album/${chatId}/folders`, {
        name: newFolderName.trim(),
        parentId: parentId,
      })
      
      showToast(t('album.folderCreated'), 'success')
      setNewFolderName('')
      setIsCreatingFolder(false)
      await loadFolders()
    } catch (error) {
      console.error('❌ 폴더 생성 실패:', error)
      showToast(`${t('album.folderCreateFailed')}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error')
    }
  }, [chatId, newFolderName, showToast, t, loadFolders])

  // 폴더 펼침/접힘 토글
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }, [])

  // 선택 모드 함수들
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev)
    setSelectedPhotos(new Set())
  }, [])

  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }, [])

  const selectAllPhotos = useCallback(() => {
    const selectablePhotos = selectedFolderId === null
      ? albumPhotos.filter(photo => !photo.fromMessage)
      : albumPhotos
    setSelectedPhotos(new Set(selectablePhotos.map(photo => photo.id)))
  }, [albumPhotos, selectedFolderId])

  const clearSelection = useCallback(() => {
    setSelectedPhotos(new Set())
  }, [])

  // 선택된 사진 삭제
  const deleteSelectedPhotos = useCallback(async () => {
    if (selectedPhotos.size === 0) return

    if (selectedFolderId === null) {
      showToast('채팅방 사진첩에서는 삭제할 수 없습니다', 'info')
      return
    }

    const deletablePhotos = albumPhotos.filter(photo => 
      selectedPhotos.has(photo.id) && !photo.fromMessage
    )
    
    if (deletablePhotos.length === 0) {
      showToast('메시지에서 보낸 사진은 삭제할 수 없습니다', 'info')
      return
    }

    const photoIds = deletablePhotos.map(photo => photo.id)
    const currentFolderId = selectedFolderId

    try {
      const response = await apiClient.delete('/chat/album/batch', { albumIds: photoIds })
      const result = response.data || response
      const deleted = result?.deleted ?? 0
      const failed = result?.failed ?? 0
      
      setSelectedPhotos(new Set())
      setIsSelectionMode(false)
      
      if (failed > 0) {
        showToast(`${deleted}개 삭제 완료, ${failed}개 실패 (본인이 업로드한 파일만 삭제 가능)`, 'info')
      } else {
        showToast(`${deleted}개 사진이 삭제되었습니다`, 'success')
      }
      
      // 사진첩 다시 조회
      await loadAlbumInitial(currentFolderId)
    } catch (error) {
      console.error('사진 삭제 실패:', error)
      showToast('사진 삭제에 실패했습니다', 'error')
    }
  }, [selectedPhotos, showToast, selectedFolderId, albumPhotos, loadAlbumInitial])

  // 선택된 사진 다운로드
  const downloadSelectedPhotos = useCallback(async () => {
    if (selectedPhotos.size === 0 || isDownloading) return

    setIsDownloading(true)
    const selectedPhotoData = albumPhotos.filter(photo => selectedPhotos.has(photo.id))
    const totalCount = selectedPhotoData.length
    
    if (totalCount === 1) {
      const photo = selectedPhotoData[0]
      const fileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${photo.fileUrl}`
      
      try {
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = photo.fileName || `photo_${photo.id}.jpg`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        showToast(t('album.downloadSuccess'), 'success')
      } catch (error) {
        showToast(t('album.downloadFailed'), 'error')
      } finally {
        setIsDownloading(false)
      }
      return
    }
    
    const BATCH_SIZE = 3
    const batches = []
    
    for (let i = 0; i < totalCount; i += BATCH_SIZE) {
      batches.push(selectedPhotoData.slice(i, i + BATCH_SIZE))
    }
    
    let completedCount = 0
    
    for (const batch of batches) {
      const promises = batch.map(async (photo) => {
        const fileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${photo.fileUrl}`
        
        try {
          const link = document.createElement('a')
          link.href = fileUrl
          link.download = photo.fileName || `photo_${photo.id}.jpg`
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          completedCount++
          return { success: true, photo }
        } catch (error) {
          console.error(`다운로드 실패: ${photo.fileName}`, error)
          return { success: false, photo, error }
        }
      })
      
      await Promise.allSettled(promises)
      
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    showToast(t('album.downloadProgress').replace('{completed}', String(completedCount)).replace('{total}', String(totalCount)), 'success')
    setIsDownloading(false)
  }, [selectedPhotos, albumPhotos, showToast, isDownloading, t])

  // 사진첩에 파일 추가
  const handleAlbumFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !currentUser || !chatId) return

    if (selectedFolderId === null) {
      showToast('채팅방 사진첩에는 직접 추가할 수 없습니다', 'info')
      if (albumFileInputRef.current) {
        albumFileInputRef.current.value = ''
      }
      return
    }

    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => validateFile(file) !== null)

    if (validFiles.length === 0) {
      showToast('업로드할 수 있는 파일이 없습니다.', 'error')
      return
    }

    try {
      setUploadingFile(true)
      setUploadProgress({ current: 0, total: validFiles.length, success: 0, failed: 0 })

      const CONCURRENT_UPLOADS = 5
      let completedCount = 0
      let successCount = 0
      let failCount = 0

      const updateProgress = () => {
        setUploadProgress({ 
          current: completedCount, 
          total: validFiles.length, 
          success: successCount, 
          failed: failCount 
        })
      }

      const chunks: File[][] = []
      for (let i = 0; i < validFiles.length; i += CONCURRENT_UPLOADS) {
        chunks.push(validFiles.slice(i, i + CONCURRENT_UPLOADS))
      }

      for (const chunk of chunks) {
        const uploadPromises = chunk.map(async (file) => {
          try {
            const validation = validateFile(file)
            if (!validation) {
              throw new Error('파일 검증 실패')
            }

            const result = await apiClient.uploadFile(file, currentUser.id, chatId)
            const messageType = validation.isImage ? 'image' : 'video'
            const fileUrl = result.fileUrl || result.data?.fileUrl
            const thumbnailUrl = result.thumbnailUrl || result.data?.thumbnailUrl
            
            if (!fileUrl) {
              throw new Error('파일 URL을 받지 못했습니다.')
            }

            await apiClient.post(`/chat/album/${chatId}`, {
              type: messageType,
              fileUrl: fileUrl,
              thumbnailUrl: thumbnailUrl,
              fileName: file.name,
              fileSize: file.size,
              folderId: selectedFolderId,
            })

            successCount++
          } catch (error) {
            failCount++
            console.error(`❌ ${file.name} 업로드 실패:`, error)
          } finally {
            completedCount++
            updateProgress()
          }
        })

        await Promise.allSettled(uploadPromises)
      }

      if (successCount > 0) {
        const message = failCount > 0
          ? `${successCount}개 파일 업로드 완료 (${failCount}개 실패)`
          : t('album.uploadSuccess')
        showToast(message, failCount > 0 ? 'error' : 'success')
      } else {
        showToast(t('album.uploadFailed'), 'error')
      }
      
      await loadAlbumInitial(selectedFolderId)

      if (albumFileInputRef.current) {
        albumFileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('❌ 사진첩 업로드 실패:', error)
      showToast(`${t('album.uploadFailed')}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error')
    } finally {
      setUploadingFile(false)
      setUploadProgress({ current: 0, total: 0, success: 0, failed: 0 })
    }
  }, [currentUser, chatId, selectedFolderId, validateFile, showToast, t, loadAlbumInitial])

  // 폴더 트리 렌더링 (재귀)
  const renderFolderTree = useCallback((folders: any[], parentId: string | null = null, depth: number = 0): React.ReactNode => {
    const childFolders = folders.filter(f => f.parentId === parentId)
    
    return childFolders.map((folder) => {
      const hasChildren = folders.some(f => f.parentId === folder.id)
      const isExpanded = expandedFolders.has(folder.id)
      
      return (
        <div key={folder.id}>
          <div className="group" style={{ paddingLeft: `${depth * 16}px` }}>
            <div
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                selectedFolderId === folder.id
                  ? 'bg-[var(--icon-active)] text-white'
                  : 'hover:bg-secondary text-primary border border-transparent hover:border-divider'
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasChildren) {
                    toggleFolder(folder.id)
                  }
                }}
                className={`w-6 h-6 flex items-center justify-center flex-shrink-0 rounded transition-all duration-200 ${
                  selectedFolderId === folder.id 
                    ? 'text-white hover:bg-white/20' 
                    : 'text-primary hover:bg-secondary'
                }`}
              >
                {hasChildren ? (
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <span className="w-4 h-4"></span>
                )}
              </button>
              
              <button
                onClick={async () => {
                  setSelectedFolderId(folder.id)
                  await loadAlbumCount(folder.id)
                  await loadAlbumInitial(folder.id)
                  setAlbumTab('photos')
                }}
                className="flex items-center space-x-3 flex-1 min-w-0"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  selectedFolderId === folder.id
                    ? 'bg-white/20'
                    : 'bg-secondary group-hover:bg-divider'
                }`}>
                  <svg className={`w-5 h-5 ${selectedFolderId === folder.id ? 'text-white' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <span className={`font-semibold truncate ${selectedFolderId === folder.id ? 'text-white' : 'text-primary'}`}>{folder.name}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFolderId(folder.id)
                  setIsCreatingFolder(true)
                  setExpandedFolders(prev => new Set([...prev, folder.id]))
                }}
                className={`md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg flex-shrink-0 transition-all duration-200 ${
                  selectedFolderId === folder.id 
                    ? 'bg-white/20 text-white hover:bg-white/30' 
                    : 'bg-secondary text-primary hover:bg-divider border border-divider'
                }`}
                title="하위 폴더 추가"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {folder.createdBy === currentUser?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const childCount = albumFolders.filter(f => f.parentId === folder.id).length
                    const warningMessage = childCount > 0
                      ? `⚠️ 경고: "${folder.name}" 폴더를 삭제하시겠습니까?\n\n이 폴더와 모든 하위 폴더(${childCount}개)가 영구적으로 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`
                      : `"${folder.name}" 폴더를 삭제하시겠습니까?\n\n이 폴더가 영구적으로 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`
                    
                    if (confirm(warningMessage)) {
                      apiClient.delete(`/chat/album/${chatId}/folders/${folder.id}`)
                        .then(() => {
                          showToast(t('album.folderDeleted'), 'success')
                          setSelectedFolderId(null)
                          loadFolders()
                          loadAlbumInitial(null)
                        })
                        .catch(() => showToast(t('album.folderDeleteFailed'), 'error'))
                    }
                  }}
                  className="md:opacity-0 md:group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-lg w-8 h-8 flex items-center justify-center transition-all duration-200 flex-shrink-0"
                  title="폴더 삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {isCreatingFolder && selectedFolderId === folder.id && (
            <div className="mt-1 mb-1" style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    e.preventDefault()
                    createFolder(folder.id)
                  } else if (e.key === 'Escape') {
                    setIsCreatingFolder(false)
                    setNewFolderName('')
                  }
                }}
                onBlur={() => {
                  if (newFolderName.trim()) {
                    createFolder(folder.id)
                  } else {
                    setIsCreatingFolder(false)
                    setNewFolderName('')
                  }
                }}
                placeholder={t('album.folderNamePlaceholder')}
                className="w-full px-4 py-3 bg-primary border-2 border-[var(--icon-active)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--icon-active)]/50 focus:border-[var(--icon-active)] text-primary font-medium"
                autoFocus
              />
            </div>
          )}
          
          {isExpanded && renderFolderTree(folders, folder.id, depth + 1)}
        </div>
      )
    })
  }, [expandedFolders, selectedFolderId, currentUser, chatId, isCreatingFolder, newFolderName, createFolder, toggleFolder, loadAlbumCount, loadAlbumInitial, showToast, t, albumFolders, loadFolders])

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (!isOpen) return
    
    setSelectedFolderId(null)
    loadFolders()
    loadAlbumInitial(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center space-x-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary tracking-tight">{t('album.title')}</h2>
                  <p className="text-sm text-secondary mt-1.5 font-medium">
                    {selectedFolderId 
                      ? `${albumFolders.find(f => f.id === selectedFolderId)?.name || t('album.manageFolders')} · ${albumTotal || 0}개`
                      : `${t('album.allPhotos')} · ${albumTotal || 0}개`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleSelectionMode}
                  className={`p-2.5 md:px-4 md:py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center md:justify-start md:space-x-2 ${
                    isSelectionMode 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-secondary text-primary hover:bg-divider border border-divider'
                  }`}
                  title={isSelectionMode ? t('album.cancel') : t('album.select')}
                >
                  {isSelectionMode ? (
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                  <span className="hidden md:inline text-sm font-semibold">{isSelectionMode ? t('album.cancel') : t('album.select')}</span>
                </button>
                
                <input
                  ref={albumFileInputRef}
                  type="file"
                  accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.mp4,.webm,.mov,.m4v"
                  onChange={handleAlbumFileUpload}
                  className="hidden"
                  multiple
                />
                <button
                  onClick={() => albumFileInputRef.current?.click()}
                  disabled={selectedFolderId === null}
                  className={`p-2.5 md:px-4 md:py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center md:justify-start md:space-x-2 ${
                    selectedFolderId === null
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-[var(--icon-active)] text-white hover:opacity-90'
                  }`}
                  title={selectedFolderId === null ? '채팅방 사진첩에는 직접 추가할 수 없습니다' : t('album.add')}
                >
                  <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden md:inline text-sm font-semibold">{t('album.add')}</span>
                </button>
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
            
            {/* 모바일 탭 */}
            <div className="md:hidden flex border-t border-gray-200/30 dark:border-gray-700/30 bg-secondary/30">
              <button
                onClick={() => setAlbumTab('photos')}
                className={`flex-1 py-3.5 text-center transition-all duration-200 relative ${
                  albumTab === 'photos'
                    ? 'text-[var(--icon-active)]'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {albumTab === 'photos' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--icon-active)] rounded-t-full" />
                )}
              </button>
              <button
                onClick={() => setAlbumTab('folders')}
                className={`flex-1 py-3.5 text-center transition-all duration-200 relative ${
                  albumTab === 'folders'
                    ? 'text-[var(--icon-active)]'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                {albumTab === 'folders' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--icon-active)] rounded-t-full" />
                )}
              </button>
            </div>
          </div>
          
          {/* 선택 모드 액션 바 */}
          {isSelectionMode && (
            <div className="bg-gradient-to-r from-red-50/80 via-pink-50/80 to-red-50/80 dark:from-red-950/40 dark:via-pink-950/40 dark:to-red-950/40 border-t border-red-200/50 dark:border-red-800/50 px-6 py-4 backdrop-blur-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-5">
                  <div className="flex items-center space-x-3 bg-white/60 dark:bg-gray-800/60 px-3 md:px-4 py-2 rounded-xl border border-red-200/50 dark:border-red-800/50">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs md:text-sm font-bold text-red-700 dark:text-red-300">
                      {selectedPhotos.size}개
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAllPhotos}
                      className="p-2 md:px-4 md:py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100/60 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 border border-red-200/50 dark:border-red-800/50"
                      title={t('album.selectAll')}
                    >
                      <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="hidden md:inline ml-2 text-sm font-semibold">{t('album.selectAll')}</span>
                    </button>
                    <button
                      onClick={clearSelection}
                      className="p-2 md:px-4 md:py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100/60 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 border border-red-200/50 dark:border-red-800/50"
                      title={t('album.clearSelection')}
                    >
                      <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="hidden md:inline ml-2 text-sm font-semibold">{t('album.clearSelection')}</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={downloadSelectedPhotos}
                    disabled={selectedPhotos.size === 0 || isDownloading}
                    className={`p-2.5 md:px-5 md:py-2.5 rounded-xl transition-all duration-200 flex items-center space-x-2 ${
                      selectedPhotos.size > 0 && !isDownloading
                        ? 'bg-[var(--icon-active)] text-white hover:opacity-90'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                    title={isDownloading ? t('album.downloading') : t('album.download')}
                  >
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="hidden md:inline text-sm font-semibold">{isDownloading ? t('album.downloading') : t('album.download')}</span>
                  </button>
                  <button
                    onClick={deleteSelectedPhotos}
                    disabled={selectedPhotos.size === 0 || selectedFolderId === null}
                    className={`p-2.5 md:px-5 md:py-2.5 rounded-xl transition-all duration-200 flex items-center space-x-2 ${
                      selectedPhotos.size > 0 && selectedFolderId !== null
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                    title={selectedFolderId === null ? '채팅방 사진첩에서는 삭제할 수 없습니다' : t('album.delete')}
                  >
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden md:inline text-sm font-semibold">{t('album.delete')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 본문 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 왼쪽: 폴더 리스트 */}
            <div className={`w-full md:w-72 md:border-r border-gray-200/30 dark:border-gray-700/30 overflow-y-auto bg-gradient-to-b from-secondary/20 to-transparent ${
              albumTab === 'folders' ? 'block' : 'hidden md:block'
            }`}>
              <div className="p-5 space-y-2">
                <button
                  onClick={async () => {
                    setSelectedFolderId(null)
                    await loadAlbumCount(null)
                    await loadAlbumInitial(null)
                    setAlbumTab('photos')
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl text-left transition-all duration-200 flex items-center space-x-3 group ${
                    selectedFolderId === null
                      ? 'bg-[var(--icon-active)] text-white'
                      : 'hover:bg-secondary text-primary border border-transparent hover:border-divider'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    selectedFolderId === null
                      ? 'bg-white/20'
                      : 'bg-secondary group-hover:bg-divider'
                  }`}>
                    <svg className={`w-5 h-5 ${selectedFolderId === null ? 'text-white' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <span className="font-semibold">{t('album.allPhotos')}</span>
                </button>

                {renderFolderTree(albumFolders, null, 0)}

                {isCreatingFolder && selectedFolderId === null ? (
                  <div className="px-3 py-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          e.preventDefault()
                          createFolder(undefined)
                        } else if (e.key === 'Escape') {
                          setIsCreatingFolder(false)
                          setNewFolderName('')
                        }
                      }}
                      onBlur={() => {
                        if (newFolderName.trim()) {
                          createFolder(undefined)
                        } else {
                          setIsCreatingFolder(false)
                          setNewFolderName('')
                        }
                      }}
                      placeholder={t('album.folderNamePlaceholder')}
                      className="w-full px-4 py-3 bg-primary border-2 border-[var(--icon-active)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--icon-active)]/50 focus:border-[var(--icon-active)] text-primary font-medium"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedFolderId(null)
                      setIsCreatingFolder(true)
                    }}
                    className="w-full px-4 py-3.5 rounded-xl text-left transition-all duration-200 flex items-center space-x-3 hover:bg-secondary text-secondary border-2 border-dashed border-divider hover:border-blue-400/50 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary group-hover:bg-divider flex items-center justify-center transition-all duration-200">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="font-semibold">{t('album.newFolder')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 오른쪽: 사진 그리드 */}
            <div 
              ref={albumScrollRef}
              className={`flex-1 overflow-y-auto p-5 md:p-6 ${
                albumTab === 'photos' ? 'block' : 'hidden md:block'
              }`}
              onScroll={(e) => {
                const target = e.currentTarget
                const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
                if (scrollBottom < 200 && albumHasMore && !albumLoading) {
                  loadAlbumNext()
                }
              }}
            >
              {!albumPhotos || albumPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-primary font-bold text-lg mb-2">
                    {selectedFolderId ? t('album.folderEmpty') : t('album.albumEmpty')}
                  </p>
                  <p className="text-secondary text-sm text-center max-w-sm">
                    {selectedFolderId ? t('album.folderEmptyMessage') : t('album.albumEmptyMessage')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {albumPhotos?.map((photo) => {
                      const fileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${photo.fileUrl}`
                      const thumbnailUrl = photo.thumbnailUrl 
                        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${photo.thumbnailUrl}`
                        : fileUrl
                      
                      return (
                        <div
                          key={photo.id}
                          className={`aspect-square bg-secondary rounded-2xl overflow-hidden transition-all duration-300 group relative ${
                            isSelectionMode 
                              ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]' 
                              : 'cursor-pointer hover:opacity-95'
                          } ${
                            selectedPhotos.has(photo.id) 
                              ? 'ring-4 ring-[var(--icon-active)] ring-opacity-70 scale-[1.03]' 
                              : ''
                          }`}
                          onClick={() => {
                            if (isSelectionMode) {
                              if (!photo.fromMessage) {
                                togglePhotoSelection(photo.id)
                              }
                            } else {
                              window.open(fileUrl, '_blank')
                            }
                          }}
                        >
                          {isSelectionMode && !photo.fromMessage && (
                            <div className="absolute top-3 left-3 z-10">
                              <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
                                selectedPhotos.has(photo.id)
                                  ? 'bg-[var(--icon-active)] border-[var(--icon-active)]'
                                  : 'bg-white/95 dark:bg-gray-800/95 border-gray-300 dark:border-gray-600'
                              }`}>
                                {selectedPhotos.has(photo.id) && (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {photo.type === 'image' ? (
                            <img
                              src={thumbnailUrl}
                              alt={photo.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video
                                src={fileUrl}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <span className="text-4xl">▶️</span>
                              </div>
                            </div>
                          )}
                          
                          {photo.uploadedBy === currentUser?.id && !photo.fromMessage && !isSelectionMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(t('album.deleteConfirm'))) {
                                  apiClient.delete(`/chat/album/${photo.id}`)
                                    .then(() => {
                                      showToast(t('album.deleted'), 'success')
                                      loadAlbumInitial(selectedFolderId)
                                    })
                                    .catch(() => showToast(t('album.deleteFailed'), 'error'))
                                }
                              }}
                              className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-600 text-white rounded-xl w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )
                    })} 
                  </div>
                  {albumLoading && (
                    <div className="flex justify-center py-4">
                      <div className="text-secondary text-sm">로딩 중...</div>
                    </div>
                  )}
                  {!albumHasMore && albumPhotos.length > 0 && (
                    <div className="flex justify-center py-4">
                      <div className="text-secondary text-sm">모든 사진을 불러왔습니다</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

