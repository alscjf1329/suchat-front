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
    settings: 'Settings',
    messagePlaceholder: 'Type a message...',
    online: 'Online',
    typing: 'Typing...',
    send: 'Send',
    call: 'Call',
    video: 'Video Call',
    more: 'More',
    attach: 'Attach',
    emoji: 'Emoji'
  },
  
  friends: {
    title: 'Friends',
    searchPlaceholder: 'Search friends',
    addFriend: 'Add Friend',
    online: 'Online',
    offline: 'Offline',
    lastSeen: 'Last seen',
    noFriends: 'No friends yet',
    addFirstFriend: 'Add your first friend',
    friendRequest: 'Friend Request',
    accept: 'Accept',
    decline: 'Decline',
    remove: 'Remove',
    block: 'Block',
    unblock: 'Unblock',
    sendMessage: 'Send Message',
    profile: 'View Profile'
  },
  
  settings: {
    title: 'Settings',
    profile: 'Profile',
    account: 'Account',
    privacy: 'Privacy',
    notifications: 'Notifications',
    appearance: 'Appearance',
    language: 'Language',
    about: 'About',
    logout: 'Logout',
    deleteAccount: 'Delete Account',
    changePassword: 'Change Password',
    changeEmail: 'Change Email',
    profilePicture: 'Profile Picture',
    displayName: 'Display Name',
    status: 'Status',
    phoneNumber: 'Phone Number',
    birthday: 'Birthday',
    location: 'Location',
    bio: 'Bio',
    onlineStatus: 'Online Status',
    readReceipts: 'Read Receipts',
    lastSeen: 'Last Seen',
    profileVisibility: 'Profile Visibility',
    everyone: 'Everyone',
    friends: 'Friends Only',
    nobody: 'Nobody',
    pushNotifications: 'Push Notifications',
    messageNotifications: 'Message Notifications',
    friendRequestNotifications: 'Friend Request Notifications',
    soundNotifications: 'Sound Notifications',
    vibrationNotifications: 'Vibration Notifications',
    theme: 'Theme',
    fontSize: 'Font Size',
    compactMode: 'Compact Mode',
    showAvatars: 'Show Avatars',
    showTimestamps: 'Show Timestamps',
    appVersion: 'App Version',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    contactSupport: 'Contact Support',
    rateApp: 'Rate App',
    shareApp: 'Share App'
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
