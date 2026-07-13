// API 클라이언트
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  birthday?: string;
}

export interface SignInData {
  email: string;
  password: string;
  deviceType?: 'mobile' | 'desktop';
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
}

export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthday?: Date;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// 유틸리티: 현재 사용자 정보 가져오기
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // 기본 헤더 + 사용자 지정 헤더 병합
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const headers = {
      ...defaultHeaders,
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      // 401 Unauthorized - 토큰 만료
      if (response.status === 401 && endpoint !== '/auth/signin' && endpoint !== '/auth/refresh') {
        console.log('🔄 Access Token 만료 - Refresh 시도');
        
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // 토큰 갱신 성공 - 원래 요청 재시도
          console.log('✅ Token 갱신 성공 - 요청 재시도');
          return this.request(endpoint, options);
        } else {
          // 토큰 갱신 실패 - 로그인 페이지로
          console.log('❌ Token 갱신 실패 - 로그인 페이지로 이동');
          this.handleAuthError();
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API 요청에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('❌ API 요청 에러:', error);
      throw error;
    }
  }

  // Access Token 갱신
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      const deviceType = typeof window !== 'undefined' ? localStorage.getItem('deviceType') : null;
      
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          refreshToken,
          deviceType: deviceType || 'desktop' 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        console.log(`✅ Token 갱신 완료 (${deviceType || 'desktop'})`);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // 인증 에러 처리
  private handleAuthError(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('deviceType');
      
      // 현재 경로가 로그인 페이지가 아니면 리다이렉트
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  // 회원가입 (이메일 검증 필수)
  async signUp(userData: SignUpData): Promise<ApiResponse<any>> {
    return this.request<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // 이메일 인증
  async verifyEmail(token: string): Promise<ApiResponse<any>> {
    return this.request<any>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // 인증 이메일 재발송
  async resendVerificationEmail(email: string): Promise<ApiResponse<any>> {
    return this.request<any>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // 로그인
  async signIn(credentials: SignInData): Promise<ApiResponse<SignInResponse>> {
    return this.request<SignInResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // 현재 사용자 프로필 조회 (JWT 토큰으로)
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile', {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  // 사용자 정보 조회
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/auth/user/${id}`, {
      method: 'GET',
    });
  }

  // 사용자 정보 수정
  async updateUser(id: string, userData: Partial<SignUpData>): Promise<ApiResponse<User>> {
    return this.request<User>(`/auth/user/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // 사용자 삭제
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/auth/user/${id}`, {
      method: 'DELETE',
    });
  }

  // 이메일 중복 확인
  async checkEmailExists(email: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.request<{ exists: boolean }>('/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // 모든 사용자 목록 조회 (친구 목록용)
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users', {
      method: 'GET',
    });
  }

  // 사용자 검색 (페이지네이션 지원)
  async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<{ users: User[]; total: number }>> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    console.log('🔑 검색 요청 토큰:', token ? '있음' : '없음');
    console.log('🔍 검색 쿼리:', query);
    
    return this.request<{ users: User[]; total: number }>(
      `/users/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }
    );
  }

  // 인증이 필요한 요청을 위한 헬퍼 메서드
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // 친구 요청 보내기
  async sendFriendRequest(addresseeId: string): Promise<ApiResponse<any>> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    console.log('📤 친구 요청 전송:', { requesterId: currentUser.id, addresseeId });
    
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ 
        requesterId: currentUser.id,
        addresseeId: addresseeId 
      }),
    });
  }

  // 친구 요청 수락
  async acceptFriendRequest(friendId: string): Promise<ApiResponse<any>> {
    return this.request(`/friends/${friendId}/accept`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });
  }

  // 친구 요청 거절
  async rejectFriendRequest(friendId: string): Promise<ApiResponse<any>> {
    return this.request(`/friends/${friendId}/reject`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });
  }

  // 받은 친구 요청 목록
  async getPendingRequests(): Promise<ApiResponse<any[]>> {
    return this.request('/friends/requests/received', {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  // 보낸 친구 요청 목록
  async getSentRequests(): Promise<ApiResponse<any[]>> {
    return this.request('/friends/requests/sent', {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  // 친구 목록
  async getFriends(): Promise<ApiResponse<any[]>> {
    return this.request('/friends', {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  // 링크 미리보기 (OG 태그)
  async getLinkPreview(url: string): Promise<ApiResponse<{ url: string; title?: string; description?: string; image?: string; siteName?: string } | null>> {
    return this.request(`/chat/link-preview?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  // 친구 요청 삭제 (취소)
  async deleteFriendRequest(friendId: string): Promise<ApiResponse<void>> {
    return this.request(`/friends/${friendId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  // 로그아웃
  async logout(): Promise<ApiResponse<void>> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    
    if (refreshToken) {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }

    // 로컬 스토리지 정리
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('deviceType');
    }

    return { success: true, message: 'Logged out' };
  }

  // 범용 GET 요청
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }

  // 범용 POST 요청
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const authHeaders = this.getAuthHeaders();
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: authHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // 범용 PUT 요청
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const authHeaders = this.getAuthHeaders();
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: authHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // 범용 DELETE 요청
  async delete<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // 파일 업로드
  async uploadFile(file: File, userId: string, roomId: string): Promise<any> {
    console.log('📤 [API] 파일 업로드 시작:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      userId,
      roomId,
      baseURL: this.baseURL
    });

    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('roomId', roomId);

      const url = `${this.baseURL}/file/upload`;
      
      console.log('🌐 [API] 요청 URL:', url);
      console.log('📋 [API] FormData 내용:', {
        file: file.name,
        userId,
        roomId
      });
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // FormData 사용 시 Content-Type 헤더를 설정하지 않음
        // 브라우저가 자동으로 multipart/form-data와 boundary 설정
      });

      console.log('📡 [API] 응답 수신:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // 에러 응답 처리
      if (!response.ok) {
        let errorMessage = '파일 업로드에 실패했습니다.';
        
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
          console.error('❌ [API] 백엔드 에러:', error);
        } catch (jsonError) {
          // JSON 파싱 실패 시 텍스트로 읽기
          try {
            const errorText = await response.text();
            console.error('❌ [API] 에러 응답 (텍스트):', errorText);
            errorMessage = errorText.substring(0, 200);
          } catch (textError) {
            console.error('❌ [API] 에러 응답 읽기 실패');
          }
        }
        
        throw new Error(errorMessage);
      }

      // 성공 응답 처리
      const result = await response.json();
      console.log('✅ [API] 파일 업로드 완료:', result);
      return result;
      
    } catch (error) {
      console.error('❌ [API] 파일 업로드 예외:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
