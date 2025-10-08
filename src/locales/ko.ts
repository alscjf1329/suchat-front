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
  
  signup: {
    title: 'SuChat',
    subtitle: '새 계정을 만들어 대화를 시작하세요',
    name: '이름',
    email: '이메일',
    password: '비밀번호',
    confirmPassword: '비밀번호 확인',
    phone: '전화번호',
    birthday: '생년월일',
    namePlaceholder: '이름을 입력하세요',
    emailPlaceholder: '이메일을 입력하세요',
    passwordPlaceholder: '비밀번호를 입력하세요',
    confirmPasswordPlaceholder: '비밀번호를 다시 입력하세요',
    phonePlaceholder: '전화번호를 입력하세요 (선택사항)',
    signupButton: '회원가입',
    signupLoading: '회원가입 중...',
    haveAccount: '이미 계정이 있으신가요?',
    loginLink: '로그인',
    termsText: '회원가입 시',
    termsLink: '서비스 약관',
    and: '및',
    privacyLink: '개인정보 처리방침',
    agreeText: '에 동의하게 됩니다.'
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
    settings: '설정',
    messagePlaceholder: '메시지를 입력하세요...',
    online: '온라인',
    typing: '입력 중...',
    send: '전송',
    call: '통화',
    video: '영상통화',
    more: '더보기',
    attach: '첨부',
    emoji: '이모지'
  },
  
  friends: {
    title: '친구',
    searchPlaceholder: '친구 검색',
    addFriend: '친구 추가',
    online: '온라인',
    offline: '오프라인',
    lastSeen: '마지막 접속',
    noFriends: '친구가 없습니다',
    addFirstFriend: '첫 번째 친구를 추가해보세요',
    friendRequest: '친구 요청',
    accept: '수락',
    decline: '거절',
    remove: '삭제',
    block: '차단',
    unblock: '차단 해제',
    sendMessage: '메시지 보내기',
    profile: '프로필 보기'
  },
  
  settings: {
    title: '설정',
    profile: '프로필',
    account: '계정',
    privacy: '개인정보 보호',
    notifications: '알림',
    appearance: '외관',
    language: '언어',
    about: '정보',
    logout: '로그아웃',
    deleteAccount: '계정 삭제',
    changePassword: '비밀번호 변경',
    changeEmail: '이메일 변경',
    profilePicture: '프로필 사진',
    displayName: '표시 이름',
    status: '상태 메시지',
    phoneNumber: '전화번호',
    birthday: '생년월일',
    location: '위치',
    bio: '자기소개',
    onlineStatus: '온라인 상태',
    readReceipts: '읽음 확인',
    lastSeen: '마지막 접속 시간',
    profileVisibility: '프로필 공개 범위',
    everyone: '모든 사람',
    friends: '친구만',
    nobody: '아무도',
    pushNotifications: '푸시 알림',
    messageNotifications: '메시지 알림',
    friendRequestNotifications: '친구 요청 알림',
    soundNotifications: '소리 알림',
    vibrationNotifications: '진동 알림',
    theme: '테마',
    fontSize: '글자 크기',
    compactMode: '컴팩트 모드',
    showAvatars: '아바타 표시',
    showTimestamps: '시간 표시',
    appVersion: '앱 버전',
    termsOfService: '서비스 약관',
    privacyPolicy: '개인정보 처리방침',
    contactSupport: '고객 지원',
    rateApp: '앱 평가하기',
    shareApp: '앱 공유하기'
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
