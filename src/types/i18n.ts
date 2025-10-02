export type Language = 'ko' | 'en' | 'ja' | 'zh'

export interface TranslationKeys {
  // 공통
  common: {
    confirm: string
    cancel: string
    close: string
    save: string
    delete: string
    edit: string
    search: string
    loading: string
    error: string
    success: string
  }
  
  // 로그인 페이지
  login: {
    title: string
    subtitle: string
    email: string
    password: string
    emailPlaceholder: string
    passwordPlaceholder: string
    loginButton: string
    loginLoading: string
    forgotPassword: string
    noAccount: string
    signUp: string
  }
  
  // 채팅 페이지
  chat: {
    title: string
    searchPlaceholder: string
    newChat: string
    lastMessage: string
    time: string
    unread: string
    friends: string
    chats: string
    settings: string
    messagePlaceholder: string
    online: string
    typing: string
    send: string
    call: string
    video: string
    more: string
    attach: string
    emoji: string
  }
  
  // 친구 페이지
  friends: {
    title: string
    searchPlaceholder: string
    addFriend: string
    online: string
    offline: string
    lastSeen: string
    noFriends: string
    addFirstFriend: string
    friendRequest: string
    accept: string
    decline: string
    remove: string
    block: string
    unblock: string
    sendMessage: string
    profile: string
  }
  
  // 설정 페이지
  settings: {
    title: string
    profile: string
    account: string
    privacy: string
    notifications: string
    appearance: string
    language: string
    about: string
    logout: string
    deleteAccount: string
    changePassword: string
    changeEmail: string
    profilePicture: string
    displayName: string
    status: string
    phoneNumber: string
    birthday: string
    location: string
    bio: string
    onlineStatus: string
    readReceipts: string
    lastSeen: string
    profileVisibility: string
    everyone: string
    friends: string
    nobody: string
    pushNotifications: string
    messageNotifications: string
    friendRequestNotifications: string
    soundNotifications: string
    vibrationNotifications: string
    theme: string
    fontSize: string
    compactMode: string
    showAvatars: string
    showTimestamps: string
    appVersion: string
    termsOfService: string
    privacyPolicy: string
    contactSupport: string
    rateApp: string
    shareApp: string
  }
  
  // 사이드바 메뉴
  sidebar: {
    title: string
    profile: string
    settings: string
    notifications: string
    help: string
    info: string
    user: string
    userEmail: string
  }
  
  // 테마 메뉴
  theme: {
    light: string
    dark: string
    system: string
    current: string
  }
  
  // 에러 메시지
  errors: {
    networkError: string
    invalidCredentials: string
    required: string
    invalidEmail: string
    passwordTooShort: string
  }
}

export interface I18nContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
  availableLanguages: Language[]
}
