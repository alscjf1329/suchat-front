import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { I18nProvider } from '@/contexts/I18nContext'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

export const metadata: Metadata = {
  title: {
    default: 'SuChat - 새로운 대화의 시작',
    template: '%s | SuChat'
  },
  description: '모바일 최적화 채팅 애플리케이션. 직관적이고 아름다운 UI로 새로운 대화 경험을 시작하세요.',
  keywords: ['채팅', '메신저', '모바일', '대화', '소통', 'SuChat'],
  authors: [{ name: 'SuChat Team' }],
  creator: 'SuChat Team',
  publisher: 'SuChat',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://suchat.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://suchat.app',
    title: 'SuChat - 새로운 대화의 시작',
    description: '모바일 최적화 채팅 애플리케이션. 직관적이고 아름다운 UI로 새로운 대화 경험을 시작하세요.',
    siteName: 'SuChat',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SuChat - 새로운 대화의 시작',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SuChat - 새로운 대화의 시작',
    description: '모바일 최적화 채팅 애플리케이션. 직관적이고 아름다운 UI로 새로운 대화 경험을 시작하세요.',
    images: ['/og-image.png'],
    creator: '@suchat',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SuChat',
    startupImage: [
      {
        url: '/icons/icon-192x192.svg',
        media: '(device-width: 768px) and (device-height: 1024px)',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* Pretendard 폰트 */}
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/variable/pretendardvariable.css" />
        
        {/* iOS Safari 메타 태그 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SuChat" />
        
        {/* Android Chrome 메타 태그 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SuChat" />
        
        {/* PWA 관련 */}
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* 보안 관련 */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* 성능 최적화 */}
        <link rel="preload" href="/favicon.svg" as="image" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <div id="root" className="min-h-screen w-full">
                {children}
              </div>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
