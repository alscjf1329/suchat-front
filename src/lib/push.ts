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
  | { success: false; reason: 'service_worker_failed'; error: string }
  | { success: false; reason: 'subscription_failed'; error: string }
  | { success: false; reason: 'server_error'; error: string; status?: number; errorCode?: string; details?: any }
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
 * 서버에서 deviceId 기준으로 추가/업데이트 처리
 * - 등록되지 않은 deviceId → 서버에 추가
 * - 기존에 등록된 deviceId → 서버에서 업데이트
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  forceNew: boolean = false
): Promise<PushSubscription | null> {
  try {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key not configured');
    }

    // 기존 구독 확인 (Service Worker에서)
    const existingSubscription = await registration.pushManager.getSubscription();
    
    // 기존 구독이 있고 강제로 새로 만들지 않는 경우 재사용
    if (!forceNew && existingSubscription) {
      console.log('✅ Using existing push subscription');
      return existingSubscription;
    }

    // 새 구독 생성
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
      
      // localStorage 정리
      if (typeof window !== 'undefined' && success) {
        localStorage.removeItem('last_push_subscription_deviceId');
      }
      
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
 * 서버에 구독 정보 전송 결과 타입
 */
export type SendSubscriptionResult = 
  | { success: true }
  | { success: false; error: string; status?: number; errorCode?: string; details?: any };

/**
 * 서버에 구독 정보 전송
 */
export async function sendSubscriptionToServer(
  subscription: PushSubscription,
  token: string
): Promise<SendSubscriptionResult> {
  // 기기 정보 가져오기 (catch 블록에서도 사용 가능하도록 밖에서 선언)
  const { getDeviceInfo } = await import('./device');
  const deviceInfo = getDeviceInfo();
  
  try {
    const subscriptionJSON = subscription.toJSON();
    
    // localStorage에서 기기 이름 확인 (사용자가 설정한 이름이 있으면 사용)
    const savedDeviceName = typeof window !== 'undefined' 
      ? localStorage.getItem(`device_name_${deviceInfo.deviceId}`)
      : null;
    
    console.log('📤 [sendSubscriptionToServer] 서버에 구독 정보 전송:', {
      deviceId: deviceInfo.deviceId,
      deviceType: deviceInfo.platform,
      endpoint: subscriptionJSON.endpoint?.substring(0, 50) + '...',
    });
    
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
      
      console.error('❌ [sendSubscriptionToServer] 서버 응답 실패:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorCode: errorData.errorCode,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.platform,
      });
      
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
      
      // 서버에서 내려온 에러 코드와 메시지 사용
      const errorMessage = errorData.message || errorData.error || '알 수 없는 오류';
      const errorCode = errorData.errorCode || 'UNKNOWN_ERROR';
      const errorDetails = errorData.details;
      
      // 상세 사유가 있으면 메시지에 포함
      let fullErrorMessage = errorMessage;
      if (errorDetails) {
        if (typeof errorDetails === 'string') {
          fullErrorMessage = `${errorMessage}\n상세: ${errorDetails}`;
        } else if (typeof errorDetails === 'object') {
          const detailsStr = JSON.stringify(errorDetails, null, 2);
          fullErrorMessage = `${errorMessage}\n상세: ${detailsStr}`;
        }
      }
      
      const error: any = new Error(fullErrorMessage);
      error.code = errorCode;
      error.status = response.status;
      error.details = errorDetails;
      error.originalMessage = errorMessage;
      
      throw error;
    }

    const result = await response.json();
    console.log('✅ [sendSubscriptionToServer] Push subscription registered:', result);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [sendSubscriptionToServer] Failed to send subscription to server:', {
      error: error.message,
      stack: error.stack,
      deviceId: deviceInfo.deviceId,
      deviceType: deviceInfo.platform,
    });
    
    // 에러 메시지 추출
    let errorMessage = '서버에 구독 정보를 전송하는데 실패했습니다.';
    let statusCode: number | undefined = error.status;
    let errorCode: string | undefined = error.code;
    const errorDetails = error.details;
    
    // 원본 메시지가 있으면 우선 사용 (서버에서 내려온 상세 메시지)
    if (error.originalMessage) {
      errorMessage = error.originalMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // 에러 코드별 기본 메시지 매핑 (상세 메시지가 없을 때만 사용)
    if (errorCode && !error.originalMessage) {
      const errorMessages: Record<string, string> = {
        'MISSING_REQUIRED_FIELDS': '필수 필드가 누락되었습니다. 브라우저를 새로고침해주세요.',
        'PUSH_SUBSCRIPTION_FAILED': '푸시 구독 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
        'SUBSCRIPTION_NOT_FOUND': '구독 정보를 찾을 수 없습니다. 다시 구독해주세요.',
        'DATABASE_CONSTRAINT_VIOLATION': '데이터베이스 제약조건 위반이 발생했습니다. 잠시 후 다시 시도해주세요.',
        'DATABASE_CONNECTION_FAILED': '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
        'DATABASE_ERROR': '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        'DEVICE_NOT_FOUND': '기기 정보를 찾을 수 없습니다.',
        'UNKNOWN_ERROR': '알 수 없는 오류가 발생했습니다.',
      };
      
      if (errorMessages[errorCode]) {
        errorMessage = errorMessages[errorCode];
      } else {
        // 알 수 없는 에러 코드인 경우 코드를 포함한 메시지
        errorMessage = `[${errorCode}] ${errorMessage}`;
      }
    }
    
    // 에러 코드가 있으면 메시지 앞에 추가
    if (errorCode && !errorMessage.startsWith(`[${errorCode}]`)) {
      errorMessage = `[${errorCode}] ${errorMessage}`;
    }
    
    // HTTP 상태 코드별 메시지 (에러 코드가 없는 경우)
    if (!errorCode && statusCode) {
      if (statusCode === 400) {
        errorMessage = '잘못된 요청입니다. 구독 정보를 확인해주세요.';
      } else if (statusCode === 401) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (statusCode === 403) {
        errorMessage = '권한이 없습니다.';
      } else if (statusCode === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
    }
    
    return { 
      success: false, 
      error: errorMessage,
      status: statusCode,
      errorCode,
      details: errorDetails,
    };
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
      return { 
        success: false, 
        reason: 'service_worker_failed',
        error: 'Service Worker 등록에 실패했습니다. 브라우저를 새로고침해주세요.'
      };
    }

    // 2. 알림 권한 요청
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('⚠️  Notification permission denied');
      return { success: false, reason: 'permission_denied' };
    }

    // 3. 푸시 구독 (기기별 독립 구독)
    const subscription = await subscribeToPush(registration, false);
    if (!subscription) {
      return {
        success: false,
        reason: 'subscription_failed',
        error: '푸시 구독 생성에 실패했습니다. 브라우저가 푸시 알림을 지원하는지 확인해주세요.'
      };
    }

    // 4. 서버에 구독 정보 전송
    console.log('📤 [initializePushNotifications] 서버에 구독 정보 전송 시작');
    const serverResult = await sendSubscriptionToServer(subscription, token);
    if (!serverResult.success) {
      return {
        success: false,
        reason: 'server_error',
        error: serverResult.error || '서버에 구독 정보를 전송하는데 실패했습니다.',
        status: serverResult.status,
        errorCode: serverResult.errorCode,
        details: serverResult.details,
      };
    }

    console.log('🎉 [initializePushNotifications] Push notifications initialized successfully');
    return { success: true, subscription };
  } catch (error: any) {
    console.error('❌ [initializePushNotifications] Push notification initialization failed:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    return { 
      success: false, 
      error: error.message || '알 수 없는 오류가 발생했습니다.'
    };
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get device list');
    }

    const data = await response.json();
    return data.devices || [];
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices/${deviceId}/name`, {
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices/${deviceId}`, {
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

