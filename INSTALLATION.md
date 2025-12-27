# 🚀 SuChat Frontend 초기 설치 가이드

이 문서는 SuChat Frontend를 처음 설치하고 실행하기 위한 상세 가이드입니다.

## 📋 목차

1. [사전 요구사항](#1-사전-요구사항)
2. [프로젝트 클론 및 의존성 설치](#2-프로젝트-클론-및-의존성-설치)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [VAPID 키 설정](#4-vapid-키-설정)
5. [백엔드 서버 확인](#5-백엔드-서버-확인)
6. [개발 서버 실행](#6-개발-서버-실행)
7. [PM2를 사용한 프로덕션 실행](#7-pm2를-사용한-프로덕션-실행)
8. [설치 확인](#8-설치-확인)

---

## 1️⃣ 사전 요구사항

다음 도구들이 설치되어 있어야 합니다:

### 필수 도구

- **Node.js 18 이상** ([다운로드](https://nodejs.org/))
- **pnpm** ([설치 방법](https://pnpm.io/installation))
- **Git** ([다운로드](https://git-scm.com/))

### 선택 도구 (프로덕션)

- **PM2** (프로세스 관리)
- **Nginx** (리버스 프록시, SSL)

### 설치 확인

```bash
node --version    # v18.0.0 이상
pnpm --version    # 8.0.0 이상
```

### pnpm 설치

pnpm이 설치되어 있지 않다면:

```bash
# npm을 사용한 설치
npm install -g pnpm

# 또는 공식 설치 스크립트 (권장)
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

---

## 2️⃣ 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 디렉토리로 이동
cd suchat-front

# 의존성 설치
pnpm install
```

설치가 완료되면 `node_modules` 폴더가 생성됩니다.

---

## 3️⃣ 환경 변수 설정

### 3.1 환경 변수 파일 생성

```bash
# 환경 변수 예시 파일 복사
cp .env.example .env.local
```

### 3.2 환경 변수 편집

`.env.local` 파일을 열어서 다음 항목들을 실제 값으로 변경하세요:

**필수 설정 항목:**

1. **NEXT_PUBLIC_API_URL**: 백엔드 API URL (기본값: `http://localhost:8000`)
2. **NEXT_PUBLIC_WS_URL**: WebSocket URL (기본값: `http://localhost:8000`)
3. **NEXT_PUBLIC_VAPID_KEY**: 푸시 알림 사용 시 (백엔드와 동일한 값)

> ⚠️ **중요**: 
> - 백엔드 포트는 `8000`입니다 (프로젝트 기본값은 3000이지만 SuChat은 8000 사용)
> - `NEXT_PUBLIC_VAPID_KEY`는 백엔드 `.env` 파일의 `VAPID_PUBLIC_KEY`와 동일해야 합니다
> - `.env.local` 파일은 Git에 커밋하지 마세요 (자동으로 `.gitignore`에 포함됨)

> 📝 **참고**: `.env.example` 파일에 모든 환경 변수의 예시가 포함되어 있습니다.

### 3.3 환경 변수 변경 시

> ⚠️ **중요**: `.env.local` 파일을 수정한 후에는 **반드시 개발 서버를 재시작**해야 합니다.

```bash
# 서버 중지 (Ctrl + C)
# 서버 재시작
pnpm run dev
```

---

## 4️⃣ VAPID 키 설정

푸시 알림 기능을 사용하려면 VAPID 키가 필요합니다.

### 4.1 백엔드에서 키 생성

```bash
# 백엔드 디렉토리로 이동
cd ../suchat-back

# VAPID 키 생성
pnpm exec web-push generate-vapid-keys
```

출력 예시:
```
Public Key: BKxxx...xxx
Private Key: xxx...xxx
```

### 4.2 프론트엔드 설정

생성된 **Public Key**를 프론트엔드 `.env.local` 파일에 추가하세요:

```env
NEXT_PUBLIC_VAPID_KEY=BKxxx...xxx
```

> ⚠️ **보안 주의**: Public Key만 프론트엔드에 설정하세요. Private Key는 절대 노출하면 안 됩니다.

---

## 5️⃣ 백엔드 서버 확인

프론트엔드를 실행하기 전에 백엔드 서버가 실행 중이어야 합니다:

```bash
# 백엔드 디렉토리로 이동
cd ../suchat-back

# 개발 서버 실행
pnpm run start:dev
```

백엔드 서버가 `http://localhost:8000`에서 실행 중인지 확인하세요.

---

## 6️⃣ 개발 서버 실행

```bash
# 프론트엔드 디렉토리로 이동
cd suchat-front

# 개발 서버 실행
pnpm run dev
```

서버가 성공적으로 시작되면 다음 메시지가 표시됩니다:

```
✓ Ready in 2.5s
○ Local:        http://localhost:3000
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

> 💡 **개발 모드**: 코드 변경 시 자동으로 페이지가 새로고침됩니다.

---

## 7️⃣ PM2를 사용한 프로덕션 실행

### 7.1 PM2 설치

```bash
# 전역 설치 (pnpm 사용)
pnpm add -g pm2

# 또는 npm 사용
npm install -g pm2
```

### 7.2 프로덕션 빌드

```bash
# 빌드 실행
pnpm run build
```

빌드가 완료되면 `.next` 폴더가 생성됩니다.

### 7.3 PM2로 애플리케이션 시작

```bash
# PM2로 시작
pm2 start pnpm --name "suchat-frontend" -- start

# 또는 ecosystem 파일 사용 (권장)
pm2 start ecosystem.config.js
```

### 7.4 PM2 ecosystem 파일 생성

`ecosystem.config.js` 파일 생성:

```javascript
module.exports = {
  apps: [
    {
      name: 'suchat-frontend',
      script: 'pnpm',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
```

### 7.5 PM2 명령어

```bash
# 애플리케이션 시작
pm2 start ecosystem.config.js

# 애플리케이션 중지
pm2 stop suchat-frontend

# 애플리케이션 재시작
pm2 restart suchat-frontend

# 애플리케이션 삭제
pm2 delete suchat-frontend

# 상태 확인
pm2 status

# 로그 확인
pm2 logs suchat-frontend

# 실시간 로그 모니터링
pm2 logs suchat-frontend --lines 50

# 모니터링 대시보드
pm2 monit

# 메모리/CPU 사용량 확인
pm2 list
```

### 7.6 시스템 재시작 시 자동 시작 설정

```bash
# PM2 startup 스크립트 생성
pm2 startup

# 현재 실행 중인 프로세스 저장
pm2 save
```

시스템 재시작 시 PM2가 자동으로 애플리케이션을 시작합니다.

### 7.7 PM2 로그 관리

```bash
# 로그 파일 위치 확인
pm2 logs suchat-frontend --lines 0 --nostream

# 로그 정리 (최근 100줄만 유지)
pm2 flush suchat-frontend

# 로그 로테이션 설정 (pm2-logrotate 모듈)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 8️⃣ 설치 확인

### 8.1 브라우저 접속

1. 브라우저에서 `http://localhost:3000` 접속
2. 로그인 페이지가 표시되어야 함

### 8.2 API 연결 확인

1. 브라우저 개발자 도구 (F12) → Network 탭
2. 로그인 시도 시 `http://localhost:8000`으로 요청이 전송되는지 확인

### 8.3 Service Worker 확인

1. 개발자 도구 → Application 탭 → Service Workers
2. `/sw.js`가 등록되어 있어야 함
3. 상태가 "activated and is running"이어야 함

### 8.4 푸시 알림 테스트

1. 로그인 후 설정 페이지 이동
2. 알림 섹션에서 푸시 알림 토글 ON
3. 브라우저에서 알림 권한 허용
4. "테스트 알림 보내기" 버튼 클릭
5. 알림이 표시되는지 확인

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
rm -rf node_modules pnpm-lock.yaml
pnpm install

# TypeScript 타입 체크
pnpm run lint
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

### PM2 프로세스가 시작되지 않음

**문제**: `pm2 start` 후 프로세스가 즉시 종료됨

**해결**:
```bash
# 에러 로그 확인
pm2 logs suchat-frontend --err

# 빌드 확인
ls -la .next

# 수동 실행하여 에러 확인
pnpm start
```

---

## 📚 관련 문서

- **[README.md](README.md)** - 프로젝트 개요 및 사용법
- **[PERFORMANCE.md](PERFORMANCE.md)** - 성능 최적화 가이드
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - 프로덕션 배포 가이드

---

**설치 완료!** 🎉 이제 SuChat Frontend를 사용할 수 있습니다.

