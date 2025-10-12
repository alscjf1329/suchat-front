# 프로덕션 배포 가이드

## 🚀 푸시 알림이 작동하는 프로덕션 배포

### 1. 환경 변수 설정

#### 프론트엔드 (.env.production)

```env
# API 서버 URL (실제 배포된 백엔드 도메인)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=https://api.yourdomain.com

# Push Notifications (VAPID)
# 백엔드의 VAPID_PUBLIC_KEY와 동일한 값
NEXT_PUBLIC_VAPID_KEY=BKxxx...xxx
```

#### 백엔드 (.env)

```env
# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=BKxxx...xxx
VAPID_PRIVATE_KEY=xxx...xxx
VAPID_SUBJECT=mailto:admin@yourdomain.com

# CORS 설정
FRONTEND_URL=https://yourdomain.com
```

---

### 2. 프론트엔드 빌드

```bash
cd suchat-front

# 환경 변수가 포함된 프로덕션 빌드
npm run build

# 빌드 확인
npm run start
```

---

### 3. 배포 전 체크리스트

#### 필수 요구사항
- [ ] **HTTPS 적용** (푸시 알림 필수 요구사항)
- [ ] 유효한 SSL 인증서 설치
- [ ] 도메인 설정 완료

#### 환경 변수
- [ ] 프론트엔드 `.env.production` 파일 생성
- [ ] `NEXT_PUBLIC_API_URL` 설정 (백엔드 도메인)
- [ ] `NEXT_PUBLIC_WS_URL` 설정 (WebSocket 도메인)
- [ ] `NEXT_PUBLIC_VAPID_KEY` 설정 (백엔드와 동일한 공개키)
- [ ] 백엔드 `.env` 파일에 VAPID 키 설정

#### Service Worker
- [ ] `public/sw.js` 파일 존재 확인
- [ ] `public/manifest.json` 파일 존재 확인
- [ ] `public/icons/` 아이콘 파일 존재 확인

#### CORS 설정
- [ ] 백엔드에서 프론트엔드 도메인 허용

---

### 4. 배포 후 확인

#### Service Worker 등록 확인

브라우저 개발자 도구 → Application 탭:
1. **Service Workers** 섹션에서 `/sw.js` 확인
2. 상태가 `activated and is running`인지 확인
3. Scope가 `/`인지 확인

#### 환경 변수 확인

브라우저 콘솔에서:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('VAPID Key:', process.env.NEXT_PUBLIC_VAPID_KEY?.substring(0, 10) + '...');
```

#### 푸시 알림 테스트

1. 로그인
2. 브라우저에서 알림 권한 허용
3. 설정 페이지 → 푸시 알림 토글 활성화
4. "테스트 알림 보내기" 클릭
5. 알림이 표시되는지 확인

---

### 5. Vercel 배포 (권장)

#### Vercel 환경 변수 설정

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | Production |
| `NEXT_PUBLIC_WS_URL` | `https://api.yourdomain.com` | Production |
| `NEXT_PUBLIC_VAPID_KEY` | `BKxxx...xxx` | Production |

#### 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

---

### 6. Docker 배포

#### Dockerfile 예제

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# 빌드 시 환경 변수 주입
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_VAPID_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_VAPID_KEY=$NEXT_PUBLIC_VAPID_KEY

RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_URL: https://api.yourdomain.com
        NEXT_PUBLIC_WS_URL: https://api.yourdomain.com
        NEXT_PUBLIC_VAPID_KEY: ${VAPID_PUBLIC_KEY}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

---

### 7. Nginx 설정 (Service Worker용)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Service Worker - 캐싱 방지
    location /sw.js {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=0, must-revalidate";
        add_header Service-Worker-Allowed "/";
    }

    # Manifest
    location /manifest.json {
        proxy_pass http://localhost:3000;
        add_header Content-Type "application/manifest+json";
    }
}
```

---

### 8. 문제 해결

#### "Push subscription failed" 에러

**원인:**
- HTTPS가 적용되지 않음
- 환경 변수가 빌드에 포함되지 않음
- Service Worker가 등록되지 않음

**해결:**
```bash
# 1. 환경 변수 확인
cat .env.production

# 2. 클린 빌드
rm -rf .next
npm run build

# 3. 브라우저에서 Service Worker 재등록
# Application → Service Workers → Unregister
# 페이지 새로고침
```

#### Service Worker가 등록되지 않음

**원인:**
- `public/sw.js` 파일이 빌드에 포함되지 않음
- HTTPS가 적용되지 않음

**해결:**
```bash
# sw.js 파일 확인
ls -la public/sw.js

# 파일이 없으면 복원
git checkout public/sw.js
```

#### 환경 변수가 undefined

**원인:**
- `.env.production` 파일이 없거나 잘못된 위치
- 환경 변수가 빌드 타임에 포함되지 않음

**해결:**
```bash
# 빌드 시 환경 변수 직접 전달
NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
NEXT_PUBLIC_WS_URL=https://api.yourdomain.com \
NEXT_PUBLIC_VAPID_KEY=BKxxx...xxx \
npm run build
```

---

### 9. 모니터링

#### 로그 확인

프론트엔드 (브라우저 콘솔):
```javascript
// Service Worker 상태
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Status:', reg?.active?.state);
});

// Push 구독 상태
navigator.serviceWorker.getRegistration().then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', !!sub);
  });
});
```

백엔드 (서버 로그):
```bash
# 푸시 알림 로그
tail -f logs/app.log | grep "push"
```

---

### 10. 성능 최적화

#### Service Worker 캐싱 전략

`sw.js`에서 캐시 전략 조정:
```javascript
// 정적 리소스는 캐시 우선
const CACHE_FIRST = ['/icons/', '/fonts/', '/_next/static/'];

// API 요청은 네트워크 우선
const NETWORK_FIRST = ['/api/'];
```

#### 푸시 알림 배치 처리

백엔드에서 여러 알림을 한 번에 처리:
```typescript
// 1분마다 배치 처리
@Cron('*/1 * * * *')
async processPushQueue() {
  // 큐에 쌓인 알림들을 한 번에 처리
}
```

---

## ✅ 배포 완료 체크리스트

- [ ] HTTPS 적용 확인
- [ ] 환경 변수 설정 확인
- [ ] 프론트엔드 빌드 완료
- [ ] 백엔드 배포 완료
- [ ] Service Worker 등록 확인
- [ ] 푸시 알림 권한 요청 확인
- [ ] 테스트 알림 전송 성공
- [ ] 실제 메시지 푸시 알림 확인
- [ ] CORS 설정 확인
- [ ] SSL 인증서 유효성 확인

---

## 🎉 완료!

프로덕션 환경에서 푸시 알림이 정상적으로 작동합니다!

문제가 발생하면 위의 [문제 해결](#8-문제-해결) 섹션을 참고하세요.

