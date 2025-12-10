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
 * 기기 고유 ID 생성 또는 가져오기
 * localStorage에 저장하여 동일 기기에서 재사용
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const STORAGE_KEY = 'suchat_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // 새 기기 ID 생성 (UUID v4 형식)
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
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

