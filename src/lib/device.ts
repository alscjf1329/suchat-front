// 디바이스 타입 감지
export type DeviceType = 'mobile' | 'desktop';
export type DevicePlatform = 'ios' | 'android' | 'desktop' | 'tablet';

/**
 * 기기 플랫폼 감지 (iOS, Android, Desktop, Tablet)
 */
export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  
  // iOS 감지 (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    // iPad는 태블릿으로 분류
    if (/ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'ios';
  }
  
  // Android 감지
  if (/android/i.test(userAgent)) {
    // 태블릿 감지 (Android 태블릿은 userAgent에 'Mobile'이 없음)
    if (!/mobile/i.test(userAgent)) {
      return 'tablet';
    }
    return 'android';
  }
  
  // 태블릿 감지 (기타)
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet';
  }
  
  // 데스크톱
  return 'desktop';
}

export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // 또는 화면 크기로도 감지 가능
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobile || isSmallScreen ? 'mobile' : 'desktop';
}

/**
 * 새로운 기기 ID 생성
 */
function generateDeviceId(): string {
  return 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

/**
 * deviceId를 스토리지에 저장 (공통 메소드)
 * localStorage 우선, 실패 시 sessionStorage 사용
 */
function saveDeviceIdToStorage(deviceId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const STORAGE_KEY = 'suchat_device_id';
  
  try {
    // localStorage에 저장 시도
    localStorage.setItem(STORAGE_KEY, deviceId);
    console.log('✅ [saveDeviceIdToStorage] localStorage에 저장 완료');
    return true;
  } catch (localStorageError: any) {
    console.warn('⚠️  [saveDeviceIdToStorage] localStorage 저장 실패, sessionStorage 시도');
    
    try {
      // localStorage 실패 시 sessionStorage 사용
      sessionStorage.setItem(STORAGE_KEY, deviceId);
      console.log('✅ [saveDeviceIdToStorage] sessionStorage에 저장 완료');
      return true;
    } catch (sessionStorageError: any) {
      console.error('❌ [saveDeviceIdToStorage] 모든 스토리지 저장 실패');
      return false;
    }
  }
}

/**
 * 스토리지에서 deviceId 가져오기 (공통 메소드)
 * localStorage 우선, 없으면 sessionStorage 확인
 */
function getDeviceIdFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const STORAGE_KEY = 'suchat_device_id';
  
  try {
    // localStorage에서 먼저 확인
    const fromLocalStorage = localStorage.getItem(STORAGE_KEY);
    if (fromLocalStorage && fromLocalStorage.trim() !== '') {
      return fromLocalStorage;
    }
    
    // localStorage에 없으면 sessionStorage 확인
    const fromSessionStorage = sessionStorage.getItem(STORAGE_KEY);
    if (fromSessionStorage && fromSessionStorage.trim() !== '') {
      // sessionStorage에 있으면 localStorage에도 저장 시도
      try {
        localStorage.setItem(STORAGE_KEY, fromSessionStorage);
        console.log('✅ [getDeviceIdFromStorage] sessionStorage → localStorage 복사 완료');
      } catch (e) {
        // 복사 실패해도 계속 진행
      }
      return fromSessionStorage;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ [getDeviceIdFromStorage] 스토리지 읽기 실패:', error);
    return null;
  }
}

/**
 * 기기 고유 ID 생성 또는 가져오기 (공통 메소드)
 * 1. 스토리지에서 기존 deviceId 확인
 * 2. 없으면 새로 생성
 * 3. 스토리지에 저장
 * 
 * @returns deviceId (항상 유효한 값 반환)
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    console.error('❌ [getOrCreateDeviceId] window is undefined');
    return 'unknown';
  }

  try {
    // 1. 스토리지에서 기존 deviceId 확인
    let deviceId = getDeviceIdFromStorage();

    if (!deviceId || deviceId.trim() === '') {
      // 2. 없으면 새로 생성
      deviceId = generateDeviceId();
      console.log('🆕 [getOrCreateDeviceId] 새 deviceId 생성:', deviceId);
      
      // 3. 스토리지에 저장
      const saved = saveDeviceIdToStorage(deviceId);
      if (!saved) {
        console.warn('⚠️  [getOrCreateDeviceId] 스토리지 저장 실패, 세션 동안만 사용 가능');
      }
    } else {
      console.log('✅ [getOrCreateDeviceId] 기존 deviceId 사용:', deviceId);
    }

    return deviceId;
  } catch (error: any) {
    console.error('❌ [getOrCreateDeviceId] 에러 발생:', error);
    // 에러 발생 시 임시 deviceId 생성 (스토리지 저장 없이)
    const fallbackDeviceId = generateDeviceId();
    console.warn('⚠️  [getOrCreateDeviceId] fallback deviceId 사용:', fallbackDeviceId);
    return fallbackDeviceId;
  }
}

/**
 * deviceId를 강제로 새로 생성 (기존 deviceId 삭제 후 새로 생성)
 * @returns 새로 생성된 deviceId
 */
export function regenerateDeviceId(): string {
  if (typeof window === 'undefined') {
    console.error('❌ [regenerateDeviceId] window is undefined');
    return 'unknown';
  }

  try {
    const STORAGE_KEY = 'suchat_device_id';
    
    // 기존 deviceId 삭제
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('🗑️  [regenerateDeviceId] 기존 deviceId 삭제 완료');
    } catch (e) {
      console.warn('⚠️  [regenerateDeviceId] 기존 deviceId 삭제 실패:', e);
    }
    
    // 새 deviceId 생성
    const newDeviceId = generateDeviceId();
    console.log('🆕 [regenerateDeviceId] 새 deviceId 생성:', newDeviceId);
    
    // 스토리지에 저장
    const saved = saveDeviceIdToStorage(newDeviceId);
    if (!saved) {
      console.warn('⚠️  [regenerateDeviceId] 스토리지 저장 실패, 세션 동안만 사용 가능');
    }
    
    return newDeviceId;
  } catch (error: any) {
    console.error('❌ [regenerateDeviceId] 에러 발생:', error);
    // 에러 발생 시 임시 deviceId 생성 (스토리지 저장 없이)
    const fallbackDeviceId = generateDeviceId();
    console.warn('⚠️  [regenerateDeviceId] fallback deviceId 사용:', fallbackDeviceId);
    return fallbackDeviceId;
  }
}

/**
 * 기기 이름 생성
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Unknown Device';
  }

  const platform = detectDevicePlatform();
  const userAgent = navigator.userAgent;

  // iOS 기기명 추출
  if (platform === 'ios') {
    const match = userAgent.match(/iPhone|iPad|iPod/);
    if (match) {
      return match[0];
    }
  }

  // Android 기기명 추출
  if (platform === 'android') {
    const match = userAgent.match(/Android\s+([^;)]+)/);
    if (match) {
      return `Android ${match[1]}`;
    }
  }

  // 브라우저 정보
  const browser = getBrowserName();
  
  // 플랫폼별 기본 이름
  const platformNames: Record<DevicePlatform, string> = {
    ios: 'iOS Device',
    android: 'Android Device',
    desktop: `${browser} (Desktop)`,
    tablet: `${browser} (Tablet)`,
  };

  return platformNames[platform] || 'Unknown Device';
}

/**
 * 브라우저 이름 추출
 */
function getBrowserName(): string {
  if (typeof window === 'undefined') {
    return 'Unknown';
  }

  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'Chrome';
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox';
  }
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  }
  if (userAgent.includes('Edg')) {
    return 'Edge';
  }
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    return 'Opera';
  }

  return 'Browser';
}

export function getDeviceInfo(): { 
  type: DeviceType; 
  platform: DevicePlatform;
  deviceId: string;
  deviceName: string;
  userAgent: string;
} {
  return {
    type: detectDeviceType(),
    platform: detectDevicePlatform(),
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
  };
}

