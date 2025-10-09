// 디바이스 타입 감지
export type DeviceType = 'mobile' | 'desktop';

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

export function getDeviceInfo(): { type: DeviceType; userAgent: string } {
  return {
    type: detectDeviceType(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
  };
}

