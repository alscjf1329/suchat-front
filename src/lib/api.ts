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
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API 요청에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('API 요청 에러:', error);
      throw error;
    }
  }

  // 회원가입
  async signUp(userData: SignUpData): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // 로그인
  async signIn(credentials: SignInData): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
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
    return this.request<User[]>('/auth/users', {
      method: 'GET',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
