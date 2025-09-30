import { TranslationKeys } from '@/types/i18n'

const ja: TranslationKeys = {
  common: {
    confirm: '確認',
    cancel: 'キャンセル',
    close: '閉じる',
    save: '保存',
    delete: '削除',
    edit: '編集',
    search: '検索',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功'
  },
  
  login: {
    title: 'SuChat',
    subtitle: 'チャットを始めるためにサインインしてください',
    email: 'メールアドレス',
    password: 'パスワード',
    emailPlaceholder: 'メールアドレスを入力してください',
    passwordPlaceholder: 'パスワードを入力してください',
    loginButton: 'サインイン',
    loginLoading: 'サインイン中...',
    forgotPassword: 'パスワードを忘れましたか？',
    noAccount: 'アカウントをお持ちでない方は',
    signUp: 'サインアップ'
  },
  
  chat: {
    title: 'SuChat',
    searchPlaceholder: 'チャットを検索',
    newChat: '新しいチャット',
    lastMessage: '最後のメッセージ',
    time: '時間',
    unread: '未読',
    friends: '友達',
    chats: 'チャット',
    settings: '設定'
  },
  
  sidebar: {
    title: 'メニュー',
    profile: 'プロフィール',
    settings: '設定',
    notifications: '通知',
    help: 'ヘルプ',
    info: '情報',
    user: 'ユーザー',
    userEmail: 'user@example.com'
  },
  
  theme: {
    light: 'ライト',
    dark: 'ダーク',
    system: 'システム',
    current: '現在'
  },
  
  errors: {
    networkError: 'ネットワークエラーが発生しました。',
    invalidCredentials: 'ログイン情報が正しくありません。',
    required: 'この項目は必須です。',
    invalidEmail: '有効なメールアドレスを入力してください。',
    passwordTooShort: 'パスワードは6文字以上である必要があります。'
  }
}

export default ja
