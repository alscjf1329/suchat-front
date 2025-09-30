# SuChat Frontend 개발 가이드

## 📋 프로젝트 개요

SuChat은 Next.js 14 기반의 모던 채팅 애플리케이션입니다. TypeScript, Tailwind CSS, 그리고 체계적인 컴포넌트 구조를 사용하여 구축되었습니다.

## 🏗️ 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지들
│   ├── login/             # 로그인 페이지
│   ├── chat/              # 채팅 목록 페이지
│   ├── layout.tsx         # 루트 레이아웃
│   └── globals.css        # 전역 스타일
├── components/            # 재사용 가능한 컴포넌트들
│   └── ui/               # UI 컴포넌트 라이브러리
├── contexts/             # React Context들
├── locales/              # 다국어 번역 파일들
└── types/                # TypeScript 타입 정의
```

## 💡 개발 팁 & 베스트 프랙티스

### 1. 컴포넌트 설계 원칙

#### ✅ 좋은 예시
```tsx
// 재사용 가능한 Input 컴포넌트
interface InputProps {
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  icon?: React.ReactNode
  required?: boolean
  disabled?: boolean
  error?: string
}

export default function Input({ type = 'text', ...props }: InputProps) {
  // 구현
}
```

#### ❌ 피해야 할 것
```tsx
// 너무 구체적이고 재사용 불가능한 컴포넌트
function LoginEmailInput({ email, setEmail }: { email: string, setEmail: (email: string) => void }) {
  // 구현
}
```

### 2. 색상 팔레트 관리

#### CSS 변수를 활용한 테마 시스템
```css
:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --accent-color: #0064FF;
}

.dark {
  --bg-primary: #111827;
  --bg-secondary: #1F2937;
  --text-primary: #FFFFFF;
  --text-secondary: #9CA3AF;
  --accent-color: #0064FF;
}
```

#### Tailwind 클래스 활용
```tsx
// 색상 변수와 Tailwind 클래스 조합
<div className="bg-primary text-primary border-divider">
  <span className="text-secondary">보조 텍스트</span>
</div>
```

### 3. 상태 관리 패턴

#### Context API 활용
```tsx
// 테마 상태 관리
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  
  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

#### 로컬 상태와 전역 상태 구분
```tsx
// 로컬 상태: 컴포넌트 내에서만 사용
const [isLoading, setIsLoading] = useState(false)
const [searchQuery, setSearchQuery] = useState('')

// 전역 상태: 여러 컴포넌트에서 공유
const { theme, setTheme } = useTheme()
const { language, setLanguage } = useI18n()
```

### 4. 다국어 지원 구현

#### 타입 안전한 번역 시스템
```tsx
// 타입 정의
interface TranslationKeys {
  login: {
    title: string
    subtitle: string
    email: string
    password: string
  }
}

// 사용법
const { t } = useTranslation()
<h1>{t('login.title')}</h1>
```

#### 번역 파일 구조화
```tsx
// src/locales/ko.ts
const ko: TranslationKeys = {
  login: {
    title: 'SuChat',
    subtitle: '로그인하여 대화를 시작하세요',
    email: '이메일',
    password: '비밀번호'
  }
}
```

### 5. 애니메이션 & UX 개선

#### CSS 트랜지션 활용
```css
.slide-in {
  transform: translateX(-100%);
  transition: transform 300ms ease-in-out;
}

.slide-in.open {
  transform: translateX(0);
}
```

#### 로딩 상태 관리
```tsx
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async () => {
  setIsLoading(true)
  try {
    await submitData()
  } finally {
    setIsLoading(false)
  }
}
```

### 6. 접근성 (Accessibility) 고려사항

#### 키보드 네비게이션
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick()
  }
}
```

#### ARIA 레이블 추가
```tsx
<button
  aria-label="메뉴 열기"
  onClick={openMenu}
>
  <span aria-hidden="true">⋮</span>
</button>
```

### 7. 성능 최적화 팁

#### 컴포넌트 메모이제이션
```tsx
const ExpensiveComponent = React.memo(({ data }: { data: any[] }) => {
  // 무거운 계산
  return <div>{/* 렌더링 */}</div>
})
```

#### 이미지 최적화
```tsx
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="로고"
  width={100}
  height={100}
  priority // 중요한 이미지에 사용
/>
```

### 8. 에러 처리 패턴

#### 에러 바운더리
```tsx
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }
  
  render() {
    if (this.state.hasError) {
      return <div>에러가 발생했습니다.</div>
    }
    return this.props.children
  }
}
```

#### 폼 검증
```tsx
const [errors, setErrors] = useState<Record<string, string>>({})

const validateForm = () => {
  const newErrors: Record<string, string> = {}
  
  if (!email) newErrors.email = '이메일을 입력하세요'
  if (!password) newErrors.password = '비밀번호를 입력하세요'
  
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

## 🛠️ 개발 도구 & 설정

### 1. ESLint & Prettier 설정
```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

### 2. TypeScript 설정
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 3. Tailwind CSS 설정
```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        accent: 'var(--accent-color)'
      }
    }
  }
}
```

## 🚀 배포 전 체크리스트

### 1. 성능 검사
- [ ] Lighthouse 점수 확인 (90점 이상 목표)
- [ ] 번들 크기 최적화
- [ ] 이미지 최적화
- [ ] 코드 스플리팅 적용

### 2. 접근성 검사
- [ ] 키보드 네비게이션 테스트
- [ ] 스크린 리더 호환성
- [ ] 색상 대비 검사
- [ ] ARIA 레이블 추가

### 3. 다국어 검사
- [ ] 모든 언어에서 텍스트 표시 확인
- [ ] RTL 언어 지원 (필요시)
- [ ] 번역 키 누락 확인

### 4. 반응형 검사
- [ ] 모바일 화면 테스트
- [ ] 태블릿 화면 테스트
- [ ] 데스크톱 화면 테스트

## 📚 추가 학습 자료

### 1. React 관련
- [React 공식 문서](https://react.dev/)
- [React Patterns](https://reactpatterns.com/)
- [useHooks](https://usehooks.com/)

### 2. Next.js 관련
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Next.js 학습 코스](https://nextjs.org/learn)

### 3. TypeScript 관련
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [React TypeScript 가이드](https://react-typescript-cheatsheet.netlify.app/)

### 4. UI/UX 관련
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Material Design](https://material.io/design)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 🤝 코드 리뷰 가이드라인

### 1. 체크 포인트
- [ ] 컴포넌트가 재사용 가능한가?
- [ ] 타입이 올바르게 정의되었는가?
- [ ] 에러 처리가 적절한가?
- [ ] 접근성을 고려했는가?
- [ ] 성능에 영향을 주는가?

### 2. 코멘트 작성법
```tsx
// ❌ 좋지 않은 코멘트
// 버튼 클릭
const handleClick = () => {}

// ✅ 좋은 코멘트
// 사용자 인증 후 대시보드로 리다이렉트
const handleLoginSuccess = () => {
  router.push('/dashboard')
}
```

## 🔄 지속적 개선

### 1. 정기적인 리팩토링
- 매주 코드 리뷰 세션
- 월간 아키텍처 검토
- 분기별 성능 최적화

### 2. 사용자 피드백 수집
- 사용자 행동 분석
- 에러 로그 모니터링
- 사용성 테스트 진행

---

이 문서는 SuChat 프로젝트의 개발 과정에서 얻은 경험과 베스트 프랙티스를 정리한 것입니다. 지속적으로 업데이트하여 팀의 개발 역량 향상에 기여하세요! 🚀
