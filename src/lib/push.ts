/**
 * PWA 푸시 알림 유틸리티
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';

/**
 * 푸시 알림 초기화 결과 타입
 */
export type PushInitResult = 
  | { success: true; subscription: PushSubscription }
  | { success: false; reason: 'permission_denied' }
  | { success: false; error: unknown };

/**
 * Service Worker가 active 상태가 될 때까지 대기
 */
async function waitForServiceWorkerActivation(registration: ServiceWorkerRegistration): Promise<void> {
  // 이미 active 상태면 즉시 반환
  if (registration.active) {
    console.log('✅ Service Worker already active');
    return;
  }

  // installing 또는 waiting 상태의 worker를 찾음
  const worker = registration.installing || registration.waiting;
  
  if (!worker) {
    // active는 없지만 installing/waiting도 없으면 잠시 대기
    console.log('⏳ Waiting for Service Worker to appear...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 재확인
    if (registration.active) {
      console.log('✅ Service Worker activated');
      return;
    }
    
    throw new Error('No service worker found');
  }

  // worker가 activated 상태가 될 때까지 대기
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      // 타임아웃 시 registration.active가 있으면 성공으로 처리
      if (registration.active) {
        console.log('✅ Service Worker active (timeout fallback)');
        resolve();
      } else {
        reject(new Error('Service Worker activation timeout'));
      }
    }, 10000); // 10초 타임아웃

    if (worker.state === 'activated') {
      clearTimeout(timeout);
      resolve();
      return;
    }

    worker.addEventListener('statechange', function handler() {
      console.log('🔄 Service Worker state:', worker.state);
      
      if (worker.state === 'activated') {
        clearTimeout(timeout);
        worker.removeEventListener('statechange', handler);
        resolve();
      } else if (worker.state === 'redundant') {
        clearTimeout(timeout);
        worker.removeEventListener('statechange', handler);
        // redundant가 되면 registration.active 확인
        if (registration.active) {
          console.log('✅ Service Worker active (redundant fallback)');
          resolve();
        } else {
          reject(new Error('Service Worker became redundant'));
        }
      }
    });
  });
}

/**
 * Service Worker 등록
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    // 기존 등록 확인
    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    
    if (existingRegistration) {
      console.log('✅ Using existing Service Worker registration');
      
      // active 상태가 아니면 대기
      if (!existingRegistration.active) {
        console.log('⏳ Waiting for Service Worker to activate...');
        await waitForServiceWorkerActivation(existingRegistration);
      }
      
      return existingRegistration;
    }

    // 새로 등록
    console.log('📝 Registering new Service Worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none', // 항상 최신 버전 확인
    });

    console.log('✅ Service Worker registered:', registration.scope);

    // Service Worker가 active 상태가 될 때까지 대기
    if (!registration.active) {
      console.log('⏳ Waiting for Service Worker to activate...');
      await waitForServiceWorkerActivation(registration);
    }
    console.log('✅ Service Worker is now active');

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
      applicationServerKey: applicationServerKey as BufferSource,
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
    
    // 기기 정보 가져오기
    const { getDeviceInfo } = await import('./device');
    const deviceInfo = getDeviceInfo();
    
    // localStorage에서 기기 이름 확인 (사용자가 설정한 이름이 있으면 사용)
    const savedDeviceName = typeof window !== 'undefined' 
      ? localStorage.getItem(`device_name_${deviceInfo.deviceId}`)
      : null;
    
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
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.platform,
        deviceName: savedDeviceName || deviceInfo.deviceName,
        userAgent: deviceInfo.userAgent,
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
    // 기기 정보 가져오기
    const { getDeviceInfo } = await import('./device');
    const deviceInfo = getDeviceInfo();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
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
export async function initializePushNotifications(token: string): Promise<PushInitResult> {
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

/**
 * 특정 채팅방의 모든 푸시 알림 제거
 */
export async function clearChatNotifications(roomId: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      console.warn('No service worker registration found');
      return false;
    }

    // 현재 표시된 모든 알림 가져오기
    const notifications = await registration.getNotifications();
    
    console.log('📬 총 알림 개수:', notifications.length);
    
    // 해당 채팅방의 알림만 필터링하여 제거
    let clearedCount = 0;
    for (const notification of notifications) {
      // tag가 roomId와 일치하거나, data.roomId가 일치하는 경우 제거
      if (notification.tag === roomId || notification.data?.roomId === roomId) {
        notification.close();
        clearedCount++;
      }
    }
    
    console.log(`🗑️  ${clearedCount}개의 알림 제거됨 (채팅방: ${roomId})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to clear notifications:', error);
    return false;
  }
}

/**
 * 모든 푸시 알림 제거
 */
export async function clearAllNotifications(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      console.warn('No service worker registration found');
      return false;
    }

    // 현재 표시된 모든 알림 가져오기
    const notifications = await registration.getNotifications();
    
    console.log('📬 총 알림 개수:', notifications.length);
    
    // 모든 알림 제거
    for (const notification of notifications) {
      notification.close();
    }
    
    console.log(`🗑️  ${notifications.length}개의 알림 모두 제거됨`);
    return true;
  } catch (error) {
    console.error('❌ Failed to clear all notifications:', error);
    return false;
  }
}

/**
 * 기기 목록 조회
 */
export async function getDeviceList(token: string): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/subscriptions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get device list');
    }

    const data = await response.json();
    return data.subscriptions || [];
  } catch (error) {
    console.error('❌ Failed to get device list:', error);
    return [];
  }
}

/**
 * 기기 이름 업데이트
 */
export async function updateDeviceName(
  token: string,
  deviceId: string,
  deviceName: string
): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/subscriptions/${deviceId}/name`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceName }),
    });

    if (!response.ok) {
      throw new Error('Failed to update device name');
    }

    console.log('✅ Device name updated');
    return true;
  } catch (error) {
    console.error('❌ Failed to update device name:', error);
    return false;
  }
}

/**
 * 특정 기기 로그아웃 (구독 해제)
 */
export async function logoutDevice(token: string, deviceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/subscriptions/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to logout device');
    }

    console.log('✅ Device logged out');
    return true;
  } catch (error) {
    console.error('❌ Failed to logout device:', error);
    return false;
  }
}

