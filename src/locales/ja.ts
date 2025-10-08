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
  
  signup: {
    title: 'SuChat',
    subtitle: '新しいアカウントを作成してチャットを始めましょう',
    name: '名前',
    email: 'メールアドレス',
    password: 'パスワード',
    confirmPassword: 'パスワード確認',
    phone: '電話番号',
    birthday: '誕生日',
    namePlaceholder: '名前を入力してください',
    emailPlaceholder: 'メールアドレスを入力してください',
    passwordPlaceholder: 'パスワードを入力してください',
    confirmPasswordPlaceholder: 'パスワードを再入力してください',
    phonePlaceholder: '電話番号を入力してください（任意）',
    signupButton: 'サインアップ',
    signupLoading: 'アカウント作成中...',
    haveAccount: 'すでにアカウントをお持ちですか？',
    loginLink: 'サインイン',
    termsText: 'サインアップすることで、',
    termsLink: '利用規約',
    and: 'および',
    privacyLink: 'プライバシーポリシー',
    agreeText: 'に同意したことになります。'
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
    settings: '設定',
    messagePlaceholder: 'メッセージを入力...',
    online: 'オンライン',
    typing: '入力中...',
    send: '送信',
    call: '通話',
    video: 'ビデオ通話',
    more: 'その他',
    attach: '添付',
    emoji: '絵文字'
  },
  
  friends: {
    title: '友達',
    searchPlaceholder: '友達を検索',
    addFriend: '友達を追加',
    online: 'オンライン',
    offline: 'オフライン',
    lastSeen: '最後に見た時刻',
    noFriends: '友達がいません',
    addFirstFriend: '最初の友達を追加しましょう',
    friendRequest: '友達リクエスト',
    accept: '承認',
    decline: '拒否',
    remove: '削除',
    block: 'ブロック',
    unblock: 'ブロック解除',
    sendMessage: 'メッセージを送信',
    profile: 'プロフィールを見る'
  },
  
  settings: {
    title: '設定',
    profile: 'プロフィール',
    account: 'アカウント',
    privacy: 'プライバシー',
    notifications: '通知',
    appearance: '外観',
    language: '言語',
    about: '情報',
    logout: 'ログアウト',
    deleteAccount: 'アカウント削除',
    changePassword: 'パスワード変更',
    changeEmail: 'メールアドレス変更',
    profilePicture: 'プロフィール写真',
    displayName: '表示名',
    status: 'ステータス',
    phoneNumber: '電話番号',
    birthday: '誕生日',
    location: '場所',
    bio: '自己紹介',
    onlineStatus: 'オンライン状態',
    readReceipts: '既読確認',
    lastSeen: '最後に見た時刻',
    profileVisibility: 'プロフィール公開範囲',
    everyone: 'すべての人',
    friends: '友達のみ',
    nobody: '誰にも',
    pushNotifications: 'プッシュ通知',
    messageNotifications: 'メッセージ通知',
    friendRequestNotifications: '友達リクエスト通知',
    soundNotifications: '音声通知',
    vibrationNotifications: '振動通知',
    theme: 'テーマ',
    fontSize: 'フォントサイズ',
    compactMode: 'コンパクトモード',
    showAvatars: 'アバター表示',
    showTimestamps: '時刻表示',
    appVersion: 'アプリバージョン',
    termsOfService: '利用規約',
    privacyPolicy: 'プライバシーポリシー',
    contactSupport: 'サポートに連絡',
    rateApp: 'アプリを評価',
    shareApp: 'アプリを共有'
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
