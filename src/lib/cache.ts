// ponytail: localStorage 캐시 — 마지막 데이터를 즉시 보여주고 네트워크로 갱신 (stale-while-revalidate)
// 용량 초과/사파리 프라이빗 모드 등은 조용히 무시 (캐시는 있으면 좋고 없어도 동작)

const PREFIX = 'suchat:cache:'

export function cacheGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

// 로그아웃 등에서 캐시 전체 삭제 (대화 내용이 남지 않도록)
export function cacheClear(): void {
  if (typeof window === 'undefined') return
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

export function cacheSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 용량 초과 시 캐시 전체 비우고 재시도 없이 포기
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  }
}
