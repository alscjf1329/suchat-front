# SuChat 💬

모던 채팅 애플리케이션

## 📱 프로젝트 소개

SuChat은 Next.js 14 기반의 현대적인 채팅 애플리케이션입니다. 모바일 우선 설계와 PWA 기술을 통해 네이티브 앱과 유사한 사용자 경험을 제공합니다.

## ✨ 주요 기능

- 🌍 **다국어 지원**: 한국어, 영어, 일본어, 중국어
- 🌓 **다크/라이트 테마**: 시스템 설정 연동 자동 테마 전환
- 💬 **실시간 채팅**: WebSocket 기반 실시간 메시지 송수신
- 🔍 **채팅 검색**: 채팅방 및 친구 검색 기능
- 👤 **사용자 관리**: 프로필 설정 및 계정 관리
- 📲 **PWA 지원**: 앱처럼 설치 가능한 웹 애플리케이션
- 🔔 **푸시 알림**: PC/모바일 모두 지원하는 Web Push
- 📁 **파일 공유**: 이미지, 비디오 업로드 및 공유
- 📱 **아이폰 호환**: JPEG, HEIC/HEIF 이미지 자동 변환 지원
- 🎨 **일관된 디자인**: 토스 블루 기반의 세련된 UI
- 🍞 **Toast 알림**: 깔끔한 토스트 메시지 시스템
- ⚡ **성능 최적화**: GPU 가속, 이미지 최적화, gzip 압축

## 🛠 기술 스택

- **Frontend**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PWA**: Next-PWA
- **State Management**: React Context API
- **Internationalization**: Custom i18n System
- **Real-time**: Socket.IO Client
- **Push Notifications**: Web Push API, Service Worker
- **Performance**: SWC Minification, Image Optimization

---

## 🚀 빠른 시작

### 초기 설치

**상세한 설치 가이드는 [INSTALLATION.md](INSTALLATION.md)를 참조하세요.**

간단한 설치 절차:

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집 필요

# 3. 개발 서버 실행
pnpm run dev
```

### 프로덕션 실행 (PM2)

```bash
# 빌드
pnpm run build

# PM2로 시작
pm2 start pnpm --name "suchat-frontend" -- start
```

> 📖 **자세한 내용**: [INSTALLATION.md](INSTALLATION.md) - PM2 설정 및 프로덕션 배포 가이드 참조

---

## 🔧 환경 변수 상세 설명

### API 설정

| 변수 | 설명 | 기본값 | 필수 |
|------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API URL | `http://localhost:8000` | ✅ |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `http://localhost:8000` | ✅ |
| `NEXT_PUBLIC_VAPID_KEY` | VAPID 공개키 (푸시 알림용) | - | ⚠️ 푸시 알림 사용 시 필수 |

### 환경 변수 변경 시

> ⚠️ **중요**: `.env.local` 파일을 수정한 후에는 **반드시 개발 서버를 재시작**해야 합니다.

```bash
# 서버 중지 (Ctrl + C)
# 서버 재시작
npm run dev
```

---

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지들
│   ├── chat/              # 채팅 페이지
│   │   └── [id]/          # 개별 채팅방
│   ├── login/             # 로그인
│   ├── signup/            # 회원가입
│   ├── settings/          # 설정 페이지 (푸시 알림 포함)
│   ├── friends/           # 친구 목록
│   ├── forgot-password/   # 비밀번호 찾기
│   ├── reset-password/    # 비밀번호 재설정
│   ├── verify-email/      # 이메일 인증
│   ├── resend-verification/ # 인증 재발송
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 홈 페이지
│   └── globals.css        # 전역 스타일
├── components/ui/          # 재사용 가능한 UI 컴포넌트
│   ├── Toast.tsx          # 토스트 알림
│   ├── Button.tsx         # 버튼
│   ├── Input.tsx          # 입력 필드
│   ├── FormField.tsx      # 폼 필드
│   ├── BottomNavigation.tsx # 하단 네비게이션
│   ├── Sidebar.tsx        # 사이드바
│   ├── LanguageSwitcher.tsx # 언어 전환
│   └── ThemeMenu.tsx      # 테마 메뉴
├── contexts/              # React Context
│   ├── AuthContext.tsx    # 인증 상태 관리
│   ├── I18nContext.tsx    # 다국어 상태 관리
│   └── ThemeContext.tsx   # 테마 상태 관리
├── lib/                   # 유틸리티 함수
│   ├── api.ts             # API 클라이언트
│   ├── socket.ts          # Socket.IO 클라이언트
│   ├── push.ts            # 푸시 알림 유틸리티
│   └── device.ts          # 디바이스 감지
├── locales/               # 다국어 번역 파일들
│   ├── ko.ts              # 한국어
│   ├── en.ts              # 영어
│   ├── ja.ts              # 일본어
│   ├── zh.ts              # 중국어
│   └── index.ts           # 번역 로더
└── types/                 # TypeScript 타입 정의
    └── i18n.ts            # i18n 타입
```

---

## 📱 파일 업로드 지원

### 지원 형식

- **이미지**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG
- **아이폰 이미지**: HEIC, HEIF (자동으로 JPEG 변환)
- **비디오**: MP4, WebM, MOV (아이폰), M4V
- **최대 크기**: 100MB

### 업로드 방식 구분

#### 1. 채팅 메시지 업로드 (📎)

- **위치**: 채팅방 하단 파일 첨부 버튼
- **용도**: 실시간 채팅 메시지로 파일 전송
- **특징**: 
  - 즉시 채팅창에 표시됨
  - 다른 사용자들에게 실시간으로 전달
  - 채팅 기록에 남음

#### 2. 사진첩 업로드 (➕)

- **위치**: 사진첩 모달의 사진 추가 버튼
- **용도**: 추억 정리 및 공유 공간
- **특징**:
  - 폴더 구조로 정리 가능
  - 계층적 폴더 지원 (하위 폴더 생성)
  - 사진첩에서만 조회 가능
  - 채팅 메시지와 독립적으로 관리

### 기술적 특징

- ✅ 아이폰에서 촬영한 HEIC/HEIF 이미지 자동 변환
- ✅ Live Photo 지원
- ✅ 자동 이미지 최적화 및 썸네일 생성
- ✅ 모든 브라우저 호환성
- ✅ 채팅 메시지와 사진첩 완전 분리된 업로드 시스템

---

## 🔔 푸시 알림 설정

### 1. 환경 변수 설정

`.env.local` 파일에 VAPID 키 추가 (위의 "환경 변수 설정" 섹션 참조)

### 2. 사용자 설정에서 활성화

1. **로그인** 후 **설정(⚙️)** 페이지로 이동
2. **알림(🔔)** 섹션 열기
3. **푸시 알림** 토글을 켜기
4. 브라우저에서 알림 권한 허용

### 3. 테스트

1. 설정 페이지에서 **🧪 테스트 알림 보내기** 버튼 클릭
2. 알림이 표시되는지 확인

> 📱 **상세 가이드**: 백엔드 `PWA_PUSH_GUIDE.md` 참조

### 문제 해결

#### 알림 권한 거부됨

**해결**:
- 브라우저 설정 → 사이트 설정 → 알림 → 허용
- 또는 브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭 → 알림 허용

#### Service Worker 등록 실패

**해결**:
- HTTPS 사용 (localhost는 제외)
- 브라우저 개발자 도구 → Application → Service Workers에서 오류 확인

---

## 🌍 다국어 지원

### 지원 언어

- 한국어 (ko)
- 영어 (en)
- 일본어 (ja)
- 중국어 (zh)

### 언어 변경

1. 설정 페이지에서 **언어** 메뉴 선택
2. 원하는 언어 선택

### 번역 파일 추가

`src/locales/` 디렉토리에 새 언어 파일 추가:

```typescript
// src/locales/fr.ts
export const fr = {
  login: {
    title: 'SuChat',
    // ...
  }
};
```

`src/locales/index.ts`에 추가:

```typescript
import { fr } from './fr';

export const locales = {
  ko, en, ja, zh, fr
};
```

---

## 🎨 테마 설정

### 지원 테마

- **라이트 모드**: 밝은 배경
- **다크 모드**: 어두운 배경
- **시스템 설정**: 운영체제 설정 자동 감지

### 테마 변경

1. 설정 페이지에서 **테마** 메뉴 선택
2. 원하는 테마 선택

---

## 📝 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# ESLint 검사
npm run lint

# 빌드 캐시 정리
npm run clean

# 빌드 캐시 정리 후 빌드
npm run clean:build
```

---

## 🔍 트러블슈팅

### 포트 충돌

**문제**: `Port 3000 is already in use`

**해결**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

또는 다른 포트 사용:
```bash
PORT=3001 npm run dev
```

### API 연결 실패

**문제**: `Failed to fetch` 또는 `Network Error`

**해결**:
1. 백엔드 서버가 실행 중인지 확인 (`http://localhost:8000`)
2. `.env.local` 파일의 `NEXT_PUBLIC_API_URL` 확인
3. CORS 설정 확인 (백엔드)

### 빌드 오류

**문제**: `Module not found` 또는 타입 오류

**해결**:
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# TypeScript 타입 체크
npm run lint
```

### 푸시 알림이 작동하지 않음

**문제**: 알림이 표시되지 않음

**해결**:
1. `.env.local`에 `NEXT_PUBLIC_VAPID_KEY` 설정 확인
2. 브라우저 알림 권한 확인
3. Service Worker 등록 확인 (개발자 도구 → Application)
4. 백엔드 로그 확인 (푸시 전송 성공 여부)

### 이미지가 업로드되지 않음

**문제**: 파일 업로드 실패

**해결**:
1. 파일 크기가 100MB 이하인지 확인
2. 지원되는 파일 형식인지 확인
3. 백엔드 서버 실행 중인지 확인
4. 네트워크 탭에서 오류 메시지 확인

---

## 🚀 프로덕션 빌드

### 빌드

```bash
npm run build
```

빌드가 성공하면 `.next` 디렉토리가 생성됩니다.

### 프로덕션 서버 실행

```bash
npm start
```

### 환경 변수

프로덕션 환경에서는 환경 변수를 서버 환경에 설정하세요:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_VAPID_KEY=your_production_vapid_key
```

---

## 📚 문서

### 설치 및 배포
- 🚀 **[INSTALLATION.md](INSTALLATION.md)** - 초기 설치 가이드 (PM2 포함)
- 📝 **[README.DEV.md](README.DEV.md)** - 개발 가이드 및 베스트 프랙티스
- 🚀 **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - 프로덕션 배포 가이드

### 성능 및 최적화
- ⚡ **[PERFORMANCE.md](PERFORMANCE.md)** - 성능 최적화 가이드

---

## 📄 라이선스

MIT License

---

**SuChat** - 더 나은 채팅 경험을 제공합니다. 💬✨

**버전**: 3.0.0  
**최종 업데이트**: 2025-10-11
