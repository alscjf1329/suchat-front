# SuChat 💬

모던 채팅 애플리케이션

## 📱 프로젝트 소개

SuChat은 Next.js 14 기반의 현대적인 채팅 애플리케이션입니다. 모바일 우선 설계와 PWA 기술을 통해 네이티브 앱과 유사한 사용자 경험을 제공합니다.

## ✨ 주요 기능

- 🌍 **다국어 지원**: 한국어, 영어, 일본어, 중국어
- 🌓 **다크/라이트 테마**: 시스템 설정 연동 자동 테마 전환
- 💬 **실시간 채팅**: 실시간 메시지 송수신 (예정)
- 🔍 **채팅 검색**: 채팅방 검색 기능
- 👤 **사용자 관리**: 프로필 설정 및 계정 관리
- 📲 **PWA 지원**: 앱처럼 설치 가능한 웹 애플리케이션
- 🎨 **일관된 디자인**: 토스 블루 기반의 세련된 UI

## 🛠 기술 스택

- **Frontend**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PWA**: Next-PWA
- **State Management**: React Context API
- **Internationalization**: Custom i18n System

## 🚀 시작하기

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 프로젝트 구조
```
src/
├── app/                    # Next.js App Router 페이지들
├── components/ui/          # 재사용 가능한 UI 컴포넌트
├── contexts/              # React Context (테마, 다국어)
├── locales/               # 다국어 번역 파일들
└── types/                 # TypeScript 타입 정의
```

## 📚 추가 문서

- **[개발 가이드](README.DEV.md)**: 상세한 개발 팁과 베스트 프랙티스
- **[기여 가이드](CONTRIBUTING.md)**: 코드 기여 방법 (예정)

## 📄 라이선스

MIT License

---

**SuChat** - 더 나은 채팅 경험을 제공합니다. 💬✨
