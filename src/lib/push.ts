/**
 * PWA 푸시 알림 유틸리티
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';

/**
 * Service Worker 등록
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('✅ Service Worker registered:', registration.scope);

    // Service Worker 업데이트 확인
    registration.addEventListener('updatefound', () => {
      console.log('🔄 Service Worker update found');
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✨ New Service Worker available');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

/**
 * 푸시 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * VAPID Key를 Uint8Array로 변환
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 푸시 알림 구독
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key not configured');
    }

    // 기존 구독 확인
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('✅ Using existing push subscription');
      return existingSubscription;
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    console.log('✅ New push subscription created');
    return subscription;
  } catch (error) {
    console.error('❌ Push subscription failed:', error);
    return null;
  }
}

/**
 * 푸시 알림 구독 해제
 */
export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const success = await subscription.unsubscribe();
      console.log('🔕 Push unsubscribed:', success);
      return success;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Push unsubscription failed:', error);
    return false;
  }
}

/**
 * 현재 푸시 구독 상태 확인
 */
export async function getPushSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('❌ Get push subscription failed:', error);
    return null;
  }
}

/**
 * 서버에 구독 정보 전송
 */
export async function sendSubscriptionToServer(
  subscription: PushSubscription,
  token: string
): Promise<boolean> {
  try {
    const subscriptionJSON = subscription.toJSON();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscriptionJSON.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh,
        auth: subscriptionJSON.keys?.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      
      // 401 Unauthorized - 토큰 만료, 로그인 필요
      if (response.status === 401) {
        // 로컬 스토리지 정리
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('deviceType');
          
          // 로그인 페이지로 리다이렉트
          window.location.href = '/login';
        }
        
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      throw new Error(`Server error (${response.status}): ${errorData.message || response.statusText}`);
    }

    await response.json();
    console.log('✅ Push subscription registered');
    return true;
  } catch (error) {
    console.error('❌ Failed to send subscription to server:', error);
    return false;
  }
}

/**
 * 서버에서 구독 해제
 */
export async function removeSubscriptionFromServer(
  subscription: PushSubscription,
  token: string
): Promise<boolean> {
  try {
    const subscriptionJSON = subscription.toJSON();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscriptionJSON.endpoint,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }

    console.log('✅ Subscription removed from server');
    return true;
  } catch (error) {
    console.error('❌ Failed to remove subscription from server:', error);
    return false;
  }
}

/**
 * 전체 푸시 알림 설정 초기화
 */
export async function initializePushNotifications(token: string) {
  try {
    // 1. Service Worker 등록
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Service Worker registration failed');
    }

    // 2. 알림 권한 요청
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('⚠️  Notification permission denied');
      return { success: false, reason: 'permission_denied' };
    }

    // 3. 푸시 구독
    const subscription = await subscribeToPush(registration);
    if (!subscription) {
      throw new Error('Push subscription failed');
    }

    // 4. 서버에 구독 정보 전송
    const sent = await sendSubscriptionToServer(subscription, token);
    if (!sent) {
      throw new Error('Failed to send subscription to server');
    }

    console.log('🎉 Push notifications initialized successfully');
    return { success: true, subscription };
  } catch (error) {
    console.error('❌ Push notification initialization failed:', error);
    return { success: false, error };
  }
}

/**
 * 테스트 푸시 알림 요청
 */
export async function sendTestPush(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to send test push');
    }

    console.log('✅ Test push sent');
    return true;
  } catch (error) {
    console.error('❌ Test push failed:', error);
    return false;
  }
}

