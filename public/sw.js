/**
 * SuChat Service Worker - Custom Version
 * 푸시 알림 및 오프라인 캐싱 처리
 * Version: 2.5.0 (No Workbox)
 * - 채팅방 ID를 tag로 설정하여 알림 그룹화
 * - 채팅방 입장 시 알림 자동 제거 지원
 * - 알림 클릭 시 모든 클라이언트에게 즉시 메시지 전송
 * - 푸시 클릭 시 무조건 소켓 재연결 보장
 * - API 요청과 파일 업로드는 캐시하지 않음
 * - 다른 채팅방 알림 클릭 시 정확한 채팅방으로 이동 ⭐ NEW
 */

const CACHE_NAME = 'suchat-v2.5';
const OLD_CACHE_NAMES = [
  'suchat-v1',
  'suchat-v2',
  'suchat-v2.1',
  'suchat-v2.2',
  'suchat-v2.3',
  'suchat-v2.4',
  'workbox-precache-v2',
  'workbox-runtime',
  'workbox-precache',
];

const urlsToCache = [
  '/',
  '/login',
  '/chat',
  '/friends',
  '/settings',
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[SW Custom] Install event - v2.5.0');
  event.waitUntil(
    Promise.all([
      // 1. 모든 오래된 캐시 삭제 (workbox 포함)
      caches.keys().then((cacheNames) => {
        console.log('[SW Custom] Found caches:', cacheNames);
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW Custom] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 2. 새 캐시 생성
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('[SW Custom] Creating new cache');
          // 캐싱 실패해도 설치는 계속 진행
          return cache.addAll(urlsToCache).catch((error) => {
            console.warn('[SW Custom] Cache addAll failed, but continuing:', error);
          });
        }),
    ]).then(() => {
      console.log('[SW Custom] Calling skipWaiting');
      return self.skipWaiting();
    })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    Promise.all([
      // 오래된 캐시 삭제
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 모든 클라이언트를 즉시 제어
      self.clients.claim().then(() => {
        console.log('[SW] Clients claimed');
      }),
    ])
  );
});

// Fetch 이벤트 처리
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API 요청, 파일 업로드, Socket.IO는 캐시하지 않음
  const isApiRequest = url.pathname.startsWith('/api') || 
                       url.pathname.startsWith('/auth') || 
                       url.pathname.startsWith('/file') || 
                       url.pathname.startsWith('/push') || 
                       url.pathname.startsWith('/users') || 
                       url.pathname.startsWith('/friends') || 
                       url.pathname.startsWith('/socket.io') ||
                       url.pathname.startsWith('/uploads'); // 업로드된 파일
  
  // 다른 도메인 요청 (백엔드 API)
  const isDifferentOrigin = url.origin !== self.location.origin;
  
  // API 요청이나 다른 도메인 요청은 항상 네트워크로
  if (isApiRequest || isDifferentOrigin) {
    console.log('[SW] Bypassing cache for:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 정적 파일만 캐시 사용
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('[SW] Cache hit:', event.request.url);
          return response;
        }
        
        console.log('[SW] Cache miss, fetching:', event.request.url);
        return fetch(event.request);
      })
      .catch(() => {
        // 오프라인 상태에서 기본 페이지 반환 (HTML만)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// 푸시 알림 수신 처리
self.addEventListener('push', (event) => {
  console.log('[SW] ========== Push Event Start ==========');
  console.log('[SW] Push notification received');
  console.log('[SW] Event data exists:', !!event.data);
  
  let notificationData = {
    title: '새 메시지',
    body: '새로운 메시지가 도착했습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {},
    tag: 'default',
  };

  try {
    if (event.data) {
      const rawData = event.data.text();
      console.log('[SW] Raw push data:', rawData);
      
      const payload = JSON.parse(rawData);
      console.log('[SW] Parsed payload:', payload);
      
      // roomId가 있으면 tag로 설정하여 같은 채팅방의 알림을 그룹화
      const tag = payload.data?.roomId || payload.tag || notificationData.tag;
      
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        data: payload.data || notificationData.data,
        tag: tag,
      };
      
      console.log('[SW] Final notification data:', notificationData);
    }
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    console.error('[SW] Error stack:', error.stack);
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    tag: notificationData.tag,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    renotify: true, // 같은 tag의 알림이 있으면 새로 알림 (진동 포함)
  };

  console.log('[SW] Notification options:', options);
  console.log('[SW] Calling showNotification...');

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('[SW] ✅ Notification displayed successfully');
        console.log('[SW] ========== Push Event End ==========');
      })
      .catch((error) => {
        console.error('[SW] ❌ Failed to show notification:', error);
        console.error('[SW] Error name:', error.name);
        console.error('[SW] Error message:', error.message);
        console.error('[SW] Error stack:', error.stack);
        console.log('[SW] ========== Push Event End (ERROR) ==========');
      })
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  console.log('[SW] Notification data:', event.notification.data);
  
  event.notification.close();

  const roomId = event.notification.data?.roomId;
  const urlToOpen = roomId ? `/chat/${roomId}` : '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('[SW] Found clients:', clientList.length);
        
        // 열린 창이 있으면 첫 번째 창에 메시지 전송 (페이지 이동 요청)
        if (clientList.length > 0) {
          console.log('[SW] Sending navigation request to client:', urlToOpen);
          
          // 모든 클라이언트에게 메시지 전송
          clientList.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              roomId: roomId,
              urlToOpen: urlToOpen,
              timestamp: Date.now()
            });
          });
          
          console.log('[SW] Focusing first window');
          return clientList[0].focus();
        }
        
        // 열린 창이 없으면 새 창 열기
        console.log('[SW] No clients, opening new window');
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[SW] Failed to handle notification click:', error);
      })
  );
});

console.log('[SW] Service Worker loaded');
//# sourceMappingURL=sw.js.map
