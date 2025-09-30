import { TranslationKeys } from '@/types/i18n'

const ko: TranslationKeys = {
  common: {
    confirm: '확인',
    cancel: '취소',
    close: '닫기',
    save: '저장',
    delete: '삭제',
    edit: '편집',
    search: '검색',
    loading: '로딩 중...',
    error: '오류',
    success: '성공'
  },
  
  login: {
    title: 'SuChat',
    subtitle: '로그인하여 대화를 시작하세요',
    email: '이메일',
    password: '비밀번호',
    emailPlaceholder: '이메일을 입력하세요',
    passwordPlaceholder: '비밀번호를 입력하세요',
    loginButton: '로그인',
    loginLoading: '로그인 중...',
    forgotPassword: '비밀번호를 잊으셨나요?',
    noAccount: '계정이 없으신가요?',
    signUp: '회원가입'
  },
  
  chat: {
    title: 'SuChat',
    searchPlaceholder: '채팅방 검색',
    newChat: '새 채팅',
    lastMessage: '마지막 메시지',
    time: '시간',
    unread: '읽지 않음',
    friends: '친구',
    chats: '채팅',
    settings: '설정'
  },
  
  sidebar: {
    title: '메뉴',
    profile: '프로필',
    settings: '설정',
    notifications: '알림',
    help: '도움말',
    info: '정보',
    user: '사용자',
    userEmail: 'user@example.com'
  },
  
  theme: {
    light: '라이트',
    dark: '다크',
    system: '시스템',
    current: '현재'
  },
  
  errors: {
    networkError: '네트워크 오류가 발생했습니다.',
    invalidCredentials: '잘못된 로그인 정보입니다.',
    required: '필수 입력 항목입니다.',
    invalidEmail: '올바른 이메일 주소를 입력하세요.',
    passwordTooShort: '비밀번호는 최소 6자 이상이어야 합니다.'
  }
}

export default ko
