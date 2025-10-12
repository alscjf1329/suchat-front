/**
 * SuChat Service Worker - Custom Version
 * 푸시 알림 및 오프라인 캐싱 처리
 * Version: 2.0.0 (No Workbox)
 */

const CACHE_NAME = 'suchat-v2';
const OLD_CACHE_NAMES = [
  'suchat-v1',
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
  console.log('[SW Custom] Install event - v2.0.0');
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시 반환, 없으면 네트워크 요청
        return response || fetch(event.request);
      })
      .catch(() => {
        // 오프라인 상태에서 기본 페이지 반환
        return caches.match('/');
      })
  );
});

// 푸시 알림 수신 처리
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
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
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        data: payload.data || notificationData.data,
        tag: payload.tag || notificationData.tag,
      };
    }
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    tag: notificationData.tag,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('[SW] Notification displayed');
      })
      .catch((error) => {
        console.error('[SW] Failed to show notification:', error);
      })
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.roomId 
    ? `/chat/${event.notification.data.roomId}`
    : '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 열린 창이 있으면 해당 URL로 이동
        if (clientList.length > 0) {
          return clientList[0].focus().then((client) => {
            return client.navigate(urlToOpen);
          });
        }
        
        // 열린 창이 없으면 새 창 열기
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
