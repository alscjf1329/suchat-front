import { TranslationKeys } from '@/types/i18n'

const en: TranslationKeys = {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success'
  },
  
  login: {
    title: 'SuChat',
    subtitle: 'Sign in to start chatting',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Sign In',
    loginLoading: 'Signing in...',
    forgotPassword: 'Forgot your password?',
    noAccount: "Don't have an account?",
    signUp: 'Sign Up'
  },
  
  chat: {
    title: 'SuChat',
    searchPlaceholder: 'Search chats',
    newChat: 'New Chat',
    lastMessage: 'Last message',
    time: 'Time',
    unread: 'Unread',
    friends: 'Friends',
    chats: 'Chats',
    settings: 'Settings'
  },
  
  sidebar: {
    title: 'Menu',
    profile: 'Profile',
    settings: 'Settings',
    notifications: 'Notifications',
    help: 'Help',
    info: 'Info',
    user: 'User',
    userEmail: 'user@example.com'
  },
  
  theme: {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    current: 'Current'
  },
  
  errors: {
    networkError: 'Network error occurred.',
    invalidCredentials: 'Invalid login credentials.',
    required: 'This field is required.',
    invalidEmail: 'Please enter a valid email address.',
    passwordTooShort: 'Password must be at least 6 characters.'
  }
}

export default en
