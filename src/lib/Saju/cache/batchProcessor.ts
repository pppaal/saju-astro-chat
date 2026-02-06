/**
 * batchProcessor.ts - 배치 처리
 */

import type { BatchRequest } from './types';

/**
 * 배치 프로세서
 */
export class BatchProcessor<T, R> {
  private queue: BatchRequest<T, R>[] = [];
  private processing = false;
  private batchSize: number;
  private delayMs: number;
  private processor: (inputs: T[]) => Promise<R[]>;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    processor: (inputs: T[]) => Promise<R[]>,
    options: { batchSize?: number; delayMs?: number } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.delayMs = options.delayMs || 50;
  }

  /**
   * 항목 추가
   */
  add(input: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: Math.random().toString(36).substring(7),
        input,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.scheduleProcess();
    });
  }

  /**
   * 처리 스케줄
   */
  private scheduleProcess(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // 배치 크기에 도달하면 즉시 처리
    if (this.queue.length >= this.batchSize) {
      this.process();
      return;
    }

    // 지연 후 처리
    this.timer = setTimeout(() => {
      this.process();
    }, this.delayMs);
  }

  /**
   * 배치 처리
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) { return; }

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const inputs = batch.map(b => b.input);
      const results = await this.processor(inputs);

      for (let i = 0; i < batch.length; i++) {
        batch[i].resolve(results[i]);
      }
    } catch (error) {
      for (const request of batch) {
        request.reject(error as Error);
      }
    } finally {
      this.processing = false;

      // 대기 중인 항목이 있으면 계속 처리
      if (this.queue.length > 0) {
        this.scheduleProcess();
      }
    }
  }

  /**
   * 대기열 크기
   */
  get queueSize(): number {
    return this.queue.length;
  }

  /**
   * 대기열 비우기
   */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.queue.length === 0) {
        resolve();
        return;
      }

      const checkEmpty = () => {
        if (this.queue.length === 0 && !this.processing) {
          resolve();
        } else {
          setTimeout(checkEmpty, 10);
        }
      };

      this.process().then(checkEmpty);
    });
  }
}
