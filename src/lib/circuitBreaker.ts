/**
 * Circuit Breaker Pattern
 * =======================
 * 외부 서비스(Flask 백엔드 등) 호출 실패 시 빠른 폴백을 위한 서킷브레이커
 *
 * 상태:
 * - CLOSED: 정상 - 모든 요청 통과
 * - OPEN: 차단 - 즉시 실패 반환 (백엔드 호출 안 함)
 * - HALF_OPEN: 테스트 - 일부 요청만 통과시켜 복구 확인
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

type CircuitBreakerOptions = {
  failureThreshold: number; // 연속 실패 횟수 (기본: 3)
  resetTimeoutMs: number; // 회로 열림 후 대기 시간 (기본: 60초)
  halfOpenMaxAttempts: number; // HALF_OPEN에서 최대 시도 (기본: 1)
};

type CircuitBreakerState = {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  halfOpenAttempts: number;
};

const circuits = new Map<string, CircuitBreakerState>();

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 3,
  resetTimeoutMs: 60 * 1000, // 1분
  halfOpenMaxAttempts: 1,
};

function getCircuit(name: string): CircuitBreakerState {
  let circuit = circuits.get(name);
  if (!circuit) {
    circuit = {
      state: "CLOSED",
      failures: 0,
      lastFailure: 0,
      halfOpenAttempts: 0,
    };
    circuits.set(name, circuit);
  }
  return circuit;
}

/**
 * 서킷브레이커가 요청을 허용하는지 확인
 */
export function isCircuitOpen(
  name: string,
  options: Partial<CircuitBreakerOptions> = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const circuit = getCircuit(name);
  const now = Date.now();

  if (circuit.state === "CLOSED") {
    return false; // 허용
  }

  if (circuit.state === "OPEN") {
    // 대기 시간 지났으면 HALF_OPEN으로 전환
    if (now - circuit.lastFailure >= opts.resetTimeoutMs) {
      circuit.state = "HALF_OPEN";
      circuit.halfOpenAttempts = 0;
      console.log(`[CircuitBreaker:${name}] OPEN → HALF_OPEN (testing)`);
      return false; // 테스트 요청 허용
    }
    return true; // 차단
  }

  // HALF_OPEN: 제한된 요청만 허용
  if (circuit.halfOpenAttempts >= opts.halfOpenMaxAttempts) {
    return true; // 차단
  }
  circuit.halfOpenAttempts++;
  return false; // 허용
}

/**
 * 요청 성공 기록
 */
export function recordSuccess(name: string): void {
  const circuit = getCircuit(name);

  if (circuit.state === "HALF_OPEN") {
    console.log(`[CircuitBreaker:${name}] HALF_OPEN → CLOSED (recovered)`);
  }

  circuit.state = "CLOSED";
  circuit.failures = 0;
  circuit.halfOpenAttempts = 0;
}

/**
 * 요청 실패 기록
 */
export function recordFailure(
  name: string,
  options: Partial<CircuitBreakerOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const circuit = getCircuit(name);
  const now = Date.now();

  circuit.failures++;
  circuit.lastFailure = now;

  if (circuit.state === "HALF_OPEN") {
    // HALF_OPEN에서 실패하면 다시 OPEN
    circuit.state = "OPEN";
    console.warn(`[CircuitBreaker:${name}] HALF_OPEN → OPEN (still failing)`);
    return;
  }

  if (circuit.failures >= opts.failureThreshold) {
    circuit.state = "OPEN";
    console.warn(
      `[CircuitBreaker:${name}] CLOSED → OPEN (${circuit.failures} failures)`
    );
  }
}

/**
 * 서킷브레이커로 감싸서 함수 실행
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T | (() => T | Promise<T>),
  options: Partial<CircuitBreakerOptions> = {}
): Promise<{ result: T; fromFallback: boolean }> {
  // 회로가 열려있으면 즉시 폴백
  if (isCircuitOpen(name, options)) {
    console.log(`[CircuitBreaker:${name}] Circuit OPEN - using fallback`);
    const fallbackResult =
      typeof fallback === "function"
        ? await (fallback as () => T | Promise<T>)()
        : fallback;
    return { result: fallbackResult, fromFallback: true };
  }

  try {
    const result = await fn();
    recordSuccess(name);
    return { result, fromFallback: false };
  } catch (error) {
    recordFailure(name, options);
    console.warn(`[CircuitBreaker:${name}] Request failed:`, error);

    const fallbackResult =
      typeof fallback === "function"
        ? await (fallback as () => T | Promise<T>)()
        : fallback;
    return { result: fallbackResult, fromFallback: true };
  }
}

/**
 * 서킷 상태 조회 (디버깅/모니터링용)
 */
export function getCircuitStatus(name: string): {
  state: CircuitState;
  failures: number;
  lastFailure: Date | null;
} {
  const circuit = getCircuit(name);
  return {
    state: circuit.state,
    failures: circuit.failures,
    lastFailure: circuit.lastFailure ? new Date(circuit.lastFailure) : null,
  };
}

/**
 * 모든 서킷 상태 초기화 (테스트용)
 */
export function resetAllCircuits(): void {
  circuits.clear();
}
