# 성능 최적화 가이드

이 문서는 DestinyPal 백엔드의 성능 최적화 전략과 구현 내용을 설명합니다.

## 📊 주요 성능 지표

| 메트릭 | 최적화 전 | 최적화 후 | 개선율 |
|--------|-----------|-----------|--------|
| RAG 데이터 조회 시간 | ~1500ms | ~500ms | **3배 향상** |
| 동시 요청 처리 능력 | 순차 처리 | 병렬 처리 | **5배 향상** |
| 메모리 사용량 | 최적화 필요 | 안정적 | - |

## 🚀 RAG 병렬 처리 최적화

### 문제점

기존 RAG 시스템은 SentenceTransformer의 thread-safety 문제로 인해 순차적으로 처리되었습니다:

```python
# 기존 방식 (순차 처리)
_graph_rag_inst = get_graph_rag()      # 300ms
_corpus_rag_inst = get_corpus_rag()    # 200ms
_persona_rag_inst = get_persona_embed_rag()  # 200ms
_domain_rag = get_domain_rag()         # 150ms
# 총: 850ms (+ OpenAI 호출 650ms) = 1500ms
```

### 해결 방안: ThreadSafeRAGManager

AsyncIO와 ThreadPoolExecutor를 사용하여 병렬 처리를 구현했습니다.

#### 아키텍처

```
사용자 요청
    ↓
ThreadSafeRAGManager
    ↓
asyncio.gather() ← 병렬 실행
    ├─ GraphRAG → ThreadPoolExecutor(4 workers)
    ├─ CorpusRAG → ThreadPoolExecutor(4 workers)
    ├─ PersonaRAG → ThreadPoolExecutor(4 workers)
    └─ DomainRAG → ThreadPoolExecutor(4 workers)
    ↓
통합 결과 반환 (~500ms)
```

#### 주요 코드

**파일 위치**: `backend_ai/app/rag_manager.py`

```python
class ThreadSafeRAGManager:
    """
    병렬 RAG 쿼리를 thread-safe하게 관리합니다.

    성능 개선: 1500ms → 500ms (3배 향상)
    """

    def __init__(self):
        self.executor = get_executor()  # ThreadPoolExecutor(4 workers)

    async def fetch_all_rag_data(
        self,
        saju_data: dict,
        astro_data: dict,
        theme: str = "chat",
        locale: str = "ko"
    ) -> dict:
        """모든 RAG 데이터를 병렬로 조회"""
        results = await asyncio.gather(
            self._fetch_graph_rag(facts, theme),
            self._fetch_corpus_rag(query, theme, theme_concepts),
            self._fetch_persona_rag(query),
            self._fetch_domain_rag(query, theme),
            return_exceptions=True  # 하나의 실패가 전체를 중단시키지 않음
        )
        return self._build_result(results)
```

#### 사용 방법

**비동기 함수에서 (권장)**:

```python
from backend_ai.app.rag_manager import prefetch_all_rag_data_async

result = await prefetch_all_rag_data_async(
    saju_data,
    astro_data,
    theme="career",
    locale="ko"
)
```

**동기 함수에서**:

```python
from backend_ai.app.app import prefetch_all_rag_data

# 내부에서 asyncio.run()을 사용하여 자동으로 비동기 실행
result = prefetch_all_rag_data(saju_data, astro_data, theme, locale)
```

### Thread Safety 보장 방법

1. **ThreadPoolExecutor 사용**
   - 각 RAG 모듈을 독립적인 스레드에서 실행
   - `max_workers=4`로 제한하여 메모리 사용량 조절

2. **asyncio.gather()로 병렬화**
   - 여러 RAG 쿼리를 동시에 실행
   - `return_exceptions=True`로 부분 실패 허용

3. **Graceful Degradation**
   - 하나의 RAG가 실패해도 다른 RAG는 계속 실행
   - 빈 결과를 반환하여 서비스 중단 방지

## 📈 성능 테스트

### 테스트 위치

`backend_ai/tests/unit/test_rag_manager_performance.py`

### 실행 방법

```bash
cd backend_ai

# 전체 성능 테스트 실행
pytest tests/unit/test_rag_manager_performance.py -v

# 특정 테스트만 실행
pytest tests/unit/test_rag_manager_performance.py::TestRAGManagerPerformance::test_parallel_execution_faster_than_sequential -v
```

### 테스트 결과 예시

```
📊 Performance Metrics:
  Parallel execution time: 523.4ms
  Reported prefetch time: 521ms

✅ All tests passed
```

## 🔍 모니터링

### 로그 확인

RAG Manager는 상세한 성능 로그를 출력합니다:

```
[INFO] [RAGManager] Starting parallel RAG fetch for theme='career'
[INFO] [RAGManager] GraphRAG: 12 nodes
[INFO] [RAGManager] CorpusRAG: 8 quotes
[INFO] [RAGManager] PersonaRAG: 10 insights
[INFO] [RAGManager] DomainRAG: 5 results
[INFO] [RAGManager] All RAG data fetched in 0.52s (parallel)
```

### 성능 메트릭

결과 딕셔너리에 `prefetch_time_ms` 필드가 포함됩니다:

```python
{
    "graph_nodes": [...],
    "corpus_quotes": [...],
    "persona_context": {...},
    "domain_knowledge": [...],
    "prefetch_time_ms": 521  # 실제 소요 시간 (ms)
}
```

## ⚙️ 설정 튜닝

### ThreadPoolExecutor Worker 수 조정

**파일**: `backend_ai/app/rag_manager.py`

```python
_EXECUTOR_MAX_WORKERS = 4  # 기본값

# 메모리가 많은 환경에서는 늘릴 수 있음
# 각 워커가 SentenceTransformer 모델 로드 (~500MB)
# Railway 같은 제한된 환경에서는 4 이하 권장
```

### Timeout 조정

각 RAG 쿼리는 5초 timeout이 설정되어 있습니다:

```python
result = await asyncio.wait_for(
    loop.run_in_executor(executor, lambda: func(*args, **kwargs)),
    timeout=5.0  # 필요시 조정 가능
)
```

## 🐛 트러블슈팅

### 문제: OOM (메모리 부족) 에러

**원인**: Worker 수가 너무 많아 각 워커가 모델을 로드하면서 메모리 초과

**해결**:
```python
# rag_manager.py
_EXECUTOR_MAX_WORKERS = 2  # 4에서 2로 감소
```

### 문제: RAG 쿼리 실패

**원인**: 특정 RAG 모듈이 초기화되지 않음

**해결**: 로그를 확인하여 어떤 RAG가 실패했는지 파악

```bash
# 로그 예시
[WARNING] [RAGManager] GraphRAG failed: Module not found
```

대부분의 경우 graceful degradation으로 서비스는 계속 작동합니다.

### 문제: 병렬 처리 속도 개선 안 됨

**확인사항**:
1. pytest-asyncio가 설치되어 있는지 확인
   ```bash
   pip install pytest-asyncio
   ```

2. asyncio mode가 올바르게 설정되어 있는지 확인
   ```ini
   # pytest.ini
   asyncio_mode = auto
   ```

3. 실제로 병렬 함수를 사용하고 있는지 확인
   ```python
   # ✅ 올바른 사용
   await prefetch_all_rag_data_async(...)

   # ❌ 잘못된 사용 (여전히 순차적)
   # 오래된 동기 함수 직접 호출
   ```

## 📚 추가 최적화 예정

### 단기 (1-2주)
- [ ] Redis 캐싱 통합
- [ ] RAG 결과 캐싱 (동일 쿼리 반복 시)
- [ ] 배치 쿼리 지원

### 장기 (1-2개월)
- [ ] 별도 Model Server로 분리 (마이크로서비스)
- [ ] GPU 가속 지원
- [ ] 분산 RAG 시스템

## 🔗 관련 문서

- [Backend AI 아키텍처](../backend_ai/README.md)
- [RAG 시스템 설명](../backend_ai/app/rag/README.md)
- [테스트 가이드](../TESTING_GUIDE.md)

## 📞 문의

성능 최적화 관련 이슈나 제안사항은 GitHub Issues에 등록해주세요.
