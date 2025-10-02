import { TranslationKeys } from '@/types/i18n'

const zh: TranslationKeys = {
  common: {
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    search: '搜索',
    loading: '加载中...',
    error: '错误',
    success: '成功'
  },
  
  login: {
    title: 'SuChat',
    subtitle: '登录开始聊天',
    email: '邮箱',
    password: '密码',
    emailPlaceholder: '请输入邮箱',
    passwordPlaceholder: '请输入密码',
    loginButton: '登录',
    loginLoading: '登录中...',
    forgotPassword: '忘记密码？',
    noAccount: '没有账户？',
    signUp: '注册'
  },
  
  chat: {
    title: 'SuChat',
    searchPlaceholder: '搜索聊天',
    newChat: '新聊天',
    lastMessage: '最后消息',
    time: '时间',
    unread: '未读',
    friends: '朋友',
    chats: '聊天',
    settings: '设置',
    messagePlaceholder: '输入消息...',
    online: '在线',
    typing: '正在输入...',
    send: '发送',
    call: '通话',
    video: '视频通话',
    more: '更多',
    attach: '附件',
    emoji: '表情'
  },
  
  friends: {
    title: '朋友',
    searchPlaceholder: '搜索朋友',
    addFriend: '添加朋友',
    online: '在线',
    offline: '离线',
    lastSeen: '最后上线',
    noFriends: '暂无朋友',
    addFirstFriend: '添加第一个朋友',
    friendRequest: '好友请求',
    accept: '接受',
    decline: '拒绝',
    remove: '删除',
    block: '屏蔽',
    unblock: '取消屏蔽',
    sendMessage: '发送消息',
    profile: '查看资料'
  },
  
  settings: {
    title: '设置',
    profile: '个人资料',
    account: '账户',
    privacy: '隐私',
    notifications: '通知',
    appearance: '外观',
    language: '语言',
    about: '关于',
    logout: '退出登录',
    deleteAccount: '删除账户',
    changePassword: '修改密码',
    changeEmail: '修改邮箱',
    profilePicture: '头像',
    displayName: '显示名称',
    status: '状态',
    phoneNumber: '电话号码',
    birthday: '生日',
    location: '位置',
    bio: '个人简介',
    onlineStatus: '在线状态',
    readReceipts: '已读回执',
    lastSeen: '最后上线时间',
    profileVisibility: '资料可见性',
    everyone: '所有人',
    friends: '仅朋友',
    nobody: '无人',
    pushNotifications: '推送通知',
    messageNotifications: '消息通知',
    friendRequestNotifications: '好友请求通知',
    soundNotifications: '声音通知',
    vibrationNotifications: '震动通知',
    theme: '主题',
    fontSize: '字体大小',
    compactMode: '紧凑模式',
    showAvatars: '显示头像',
    showTimestamps: '显示时间',
    appVersion: '应用版本',
    termsOfService: '服务条款',
    privacyPolicy: '隐私政策',
    contactSupport: '联系客服',
    rateApp: '评价应用',
    shareApp: '分享应用'
  },
  
  sidebar: {
    title: '菜单',
    profile: '个人资料',
    settings: '设置',
    notifications: '通知',
    help: '帮助',
    info: '信息',
    user: '用户',
    userEmail: 'user@example.com'
  },
  
  theme: {
    light: '浅色',
    dark: '深色',
    system: '系统',
    current: '当前'
  },
  
  errors: {
    networkError: '网络错误。',
    invalidCredentials: '登录凭据无效。',
    required: '此字段为必填项。',
    invalidEmail: '请输入有效的邮箱地址。',
    passwordTooShort: '密码至少需要6个字符。'
  }
}

export default zh
