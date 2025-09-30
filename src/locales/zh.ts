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
    settings: '设置'
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
