'use client'

import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ChatRoom {
  id: string
  name: string
  description?: string
  participants: string[]
  lastMessageId?: string
  lastMessageAt?: Date
  dmKey?: string
  createdAt: Date
  updatedAt: Date
  unreadCount?: number  // 클라이언트 전용
}

export interface Message {
  id: string
  roomId: string
  userId: string
  content: string
  type: 'text' | 'image' | 'video' | 'file'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  timestamp: Date
}

class SocketClient {
  private socket: Socket | null = null
  private isConnected: boolean = false

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
      })

      this.socket.on('connect', () => {
        this.isConnected = true
        console.log('✅ Socket 연결됨:', this.socket?.id)
      })

      this.socket.on('disconnect', () => {
        this.isConnected = false
        console.log('❌ Socket 연결 해제됨')
      })

      this.socket.on('error', (error) => {
        console.error('❌ Socket 에러:', error)
      })
    }

    return this.socket
  }

  // Socket 연결 대기
  private async waitForConnection(): Promise<void> {
    if (this.isConnected) return

    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.isConnected) {
          resolve()
        } else {
          setTimeout(checkConnection, 100)
        }
      }
      checkConnection()
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  // 채팅방 생성
  async createRoom(name: string, description: string, userId: string, participantIds?: string[]): Promise<ChatRoom> {
    await this.waitForConnection()
    
    console.log('📡 채팅방 생성 요청:', { name, description, userId, participantIds })
    
    return new Promise((resolve, reject) => {
      this.socket?.emit('create_room', { name, description, userId, participantIds }, (response: any) => {
        console.log('📥 채팅방 생성 응답:', response)
        if (response) {
          resolve(response)
        } else {
          reject(new Error('채팅방 생성 실패'))
        }
      })
    })
  }

  // 채팅방 참여
  async joinRoom(roomId: string, userId: string, roomName?: string): Promise<{ success: boolean; roomId: string }> {
    await this.waitForConnection()
    
    console.log('📡 채팅방 참여 요청:', { roomId, userId, roomName })
    
    return new Promise((resolve, reject) => {
      this.socket?.emit('join_room', { roomId, userId, roomName }, (response: any) => {
        console.log('📥 채팅방 참여 응답:', response)
        if (response) {
          resolve(response)
        } else {
          reject(new Error('채팅방 참여 실패'))
        }
      })
    })
  }

  // 채팅방 퇴장
  async leaveRoom(roomId: string, userId: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('leave_room', { roomId, userId }, (response: any) => {
        if (response) {
          resolve(response)
        } else {
          reject(new Error('채팅방 퇴장 실패'))
        }
      })
    })
  }

  // 메시지 전송
  async sendMessage(data: {
    roomId: string
    userId: string
    content: string
    type?: 'text' | 'image' | 'video' | 'file'
    fileUrl?: string
    fileName?: string
    fileSize?: number
  }): Promise<Message> {
    await this.waitForConnection()
    
    console.log('📡 메시지 전송:', data)
    
    return new Promise((resolve, reject) => {
      this.socket?.emit('send_message', { ...data, type: data.type || 'text' }, (response: any) => {
        console.log('📥 메시지 전송 응답:', response)
        if (response) {
          resolve(response)
        } else {
          reject(new Error('메시지 전송 실패'))
        }
      })
    })
  }

  // 사용자의 채팅방 목록 가져오기
  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    await this.waitForConnection()
    
    console.log('📡 채팅방 목록 요청:', userId)
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('채팅방 목록 조회 시간 초과'))
      }, 5000)

      this.socket?.emit('get_user_rooms', { userId }, (response: any) => {
        clearTimeout(timeout)
        console.log('📥 채팅방 목록 응답:', response)
        
        if (response) {
          resolve(response)
        } else {
          reject(new Error('채팅방 목록 조회 실패'))
        }
      })
    })
  }

  // 읽음 처리
  async markAsRead(roomId: string, userId: string, messageId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('mark_as_read', { roomId, userId, messageId }, (response: any) => {
        if (response?.success) {
          resolve(true)
        } else {
          reject(new Error('읽음 처리 실패'))
        }
      })
    })
  }

  // 이벤트 리스너 등록
  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new_message', callback)
  }

  onRoomMessages(callback: (messages: Message[]) => void) {
    this.socket?.on('room_messages', callback)
  }

  onRoomInfo(callback: (room: ChatRoom) => void) {
    this.socket?.on('room_info', callback)
  }

  onUnreadCount(callback: (data: { roomId: string; count: number }) => void) {
    this.socket?.on('unread_count', callback)
  }

  onUserJoined(callback: (data: { userId: string; roomId: string; timestamp: Date }) => void) {
    this.socket?.on('user_joined', callback)
  }

  onUserLeft(callback: (data: { userId: string; roomId: string; timestamp: Date }) => void) {
    this.socket?.on('user_left', callback)
  }

  // 이벤트 리스너 제거
  offNewMessage(callback?: (message: Message) => void) {
    this.socket?.off('new_message', callback)
  }

  offRoomMessages(callback?: (messages: Message[]) => void) {
    this.socket?.off('room_messages', callback)
  }

  offRoomInfo(callback?: (room: ChatRoom) => void) {
    this.socket?.off('room_info', callback)
  }

  offUnreadCount(callback?: (data: any) => void) {
    this.socket?.off('unread_count', callback)
  }

  offUserJoined(callback?: (data: any) => void) {
    this.socket?.off('user_joined', callback)
  }

  offUserLeft(callback?: (data: any) => void) {
    this.socket?.off('user_left', callback)
  }
}

export const socketClient = new SocketClient()
export default socketClient

