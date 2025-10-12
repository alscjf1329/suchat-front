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

#### ⚠️ Workbox 충돌 오류 (중요!)

**오류 메시지:**
```
workbox-*.js: bad-precaching-response
Service Worker became redundant
```

**원인:**
- 이전에 `next-pwa` 패키지를 사용했고, 오래된 Workbox Service Worker가 서버/브라우저에 남아있음
- 커스텀 `sw.js`와 Workbox가 충돌
- 프로덕션 서버에 오래된 빌드 파일이 배포되어 있음

**해결 방법:**

##### 1. 서버 측 정리 (배포 전 필수)

```bash
# 로컬에서 클린 빌드
rm -rf .next node_modules/.cache
npm run build

# 서버에 SSH 접속 후
cd /path/to/your/app

# ⚠️ 삭제할 파일 목록:
# 1. Workbox 관련 JS 파일
rm -f public/workbox-*.js
rm -f public/sw.js.map  # 오래된 source map
rm -f .next/static/workbox-*.js

# 2. 오래된 빌드 폴더 완전 삭제
rm -rf .next

# 3. package-lock.json에서 next-pwa 흔적 제거
rm -f package-lock.json
npm install

# 4. 새 빌드로 교체 (로컬에서 업로드)
# .next/ 폴더 전체 업로드
# public/ 폴더 전체 업로드

# 5. 서버 재시작
pm2 restart all
# 또는
npm start
```

##### 2. 브라우저 캐시 정리 (사용자용)

**방법 A: 자동 정리 페이지 사용 (권장)**

1. 브라우저에서 접속:
   ```
   https://yourdomain.com/cleanup.html
   ```

2. "Service Worker 정리 시작" 버튼 클릭

3. 자동으로 다음 항목들이 삭제됩니다:
   - ✅ 모든 Service Worker 등록 해제
   - ✅ Workbox 관련 캐시 삭제 (`workbox-precache-*`, `workbox-runtime` 등)
   - ✅ 애플리케이션 캐시 삭제
   - ✅ localStorage의 `workbox-*` 항목 삭제

**방법 B: 수동 정리 (개발자 도구)**

Chrome/Edge 개발자 도구(F12):

1. **Application** 탭 → **Service Workers**
   ```
   삭제할 항목:
   - workbox로 시작하는 모든 Service Worker
   - 상태가 redundant인 Service Worker
   ```
   → **Unregister** 클릭

2. **Application** 탭 → **Cache Storage**
   ```
   삭제할 캐시:
   - workbox-precache-v2-*
   - workbox-runtime-*
   - workbox-precache
   - precache-v2-*
   ```
   → 우클릭 → **Delete**

3. **Application** 탭 → **Local Storage**
   ```
   삭제할 항목:
   - workbox:* (모든 workbox 관련 키)
   - sw-* (오래된 Service Worker 데이터)
   ```
   → 우클릭 → **Delete**

4. **Hard Refresh**
   ```
   Windows: Ctrl + Shift + R
   Mac: Cmd + Shift + R
   ```

##### 3. 정리 완료 확인

개발자 도구(F12) → Console에서 확인:

```javascript
// ✅ 정상 상태
[SW Custom] Install event - v2.0.0
[SW Custom] Service Worker loaded

// ❌ 문제 있는 상태 (아래가 보이면 정리 필요)
workbox-*.js: bad-precaching-response
Service Worker became redundant
```

##### 4. 삭제 항목 체크리스트

**서버에서 삭제:**
- [ ] `public/workbox-*.js`
- [ ] `public/sw.js.map` (오래된 것)
- [ ] `.next/static/workbox-*.js`
- [ ] `.next/server/app-build-manifest.json` (오래된 것)
- [ ] 전체 `.next/` 폴더 (클린 빌드로 교체)
- [ ] `node_modules/next-pwa/` (의존성 제거)

**브라우저에서 삭제:**
- [ ] Service Workers: `workbox-*` 등록
- [ ] Cache Storage: `workbox-precache-*`
- [ ] Cache Storage: `workbox-runtime-*`
- [ ] Cache Storage: `precache-v2-*`
- [ ] Local Storage: `workbox:*` 키
- [ ] Local Storage: `sw-*` 키

##### 5. 예방 조치

`.gitignore`에 추가:
```gitignore
# Service Worker 빌드 파일
public/workbox-*.js
public/sw.js.map
.next/
```

`package.json`에서 확인:
```json
{
  "dependencies": {
    // ❌ next-pwa가 없어야 함
    // "next-pwa": "^5.6.0"
  }
}
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

