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
    optional: string
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
  
  // 회원가입 페이지
  signup: {
    title: string
    subtitle: string
    name: string
    email: string
    password: string
    confirmPassword: string
    phone: string
    birthday: string
    namePlaceholder: string
    emailPlaceholder: string
    passwordPlaceholder: string
    confirmPasswordPlaceholder: string
    phonePlaceholder: string
    signupButton: string
    signupLoading: string
    haveAccount: string
    loginLink: string
    termsText: string
    termsLink: string
    and: string
    privacyLink: string
    agreeText: string
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
  
  // 사진첩
  album: {
    title: string
    add: string
    select: string
    cancel: string
    selectAll: string
    clearSelection: string
    download: string
    downloading: string
    delete: string
    deleteConfirm: string
    deleted: string
    deleteFailed: string
    viewPhotos: string
    manageFolders: string
    allPhotos: string
    totalPhotos: string
    folderEmpty: string
    albumEmpty: string
    folderEmptyMessage: string
    albumEmptyMessage: string
    newFolder: string
    folderNamePlaceholder: string
    folderCreated: string
    folderCreateFailed: string
    folderDeleted: string
    folderDeleteFailed: string
    loadFailed: string
    uploadSuccess: string
    uploadFailed: string
    downloadSuccess: string
    downloadFailed: string
    downloadProgress: string
  }
  
  // 일정
  schedule: {
    title: string
    create: string
    edit: string
    empty: string
    emptyMessage: string
    titlePlaceholder: string
    memoPlaceholder: string
    startDate: string
    endDate: string
    startDateTime: string
    endDateTime: string
    allDay: string
    scheduleCount: string
    participants: string
    createdBy: string
    loadFailed: string
    fillRequired: string
    titleRequired: string
    titleTooShort: string
    titleTooLong: string
    startDateRequired: string
    invalidStartDate: string
    invalidEndDate: string
    endDateBeforeStart: string
    created: string
    createFailed: string
    updated: string
    updateFailed: string
    deleted: string
    deleteFailed: string
    deleteConfirm: string
    notificationSettings: string
    notification: string
    notificationDateTime: string
    eventTime: string
    before5min: string
    before10min: string
    before15min: string
    before30min: string
    before1hour: string
    before2hour: string
    before1day: string
    repeatInterval: string
    repeatCount: string
    repeatCountPlaceholder: string
    interval5min: string
    interval10min: string
    interval15min: string
    interval30min: string
    interval1hour: string
    interval2hour: string
    unknown: string
  }
}

export interface I18nContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  availableLanguages: Language[]
}
