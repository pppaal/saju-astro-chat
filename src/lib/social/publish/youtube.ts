// src/lib/social/publish/youtube.ts
//
// YouTube Shorts 자동발행은 렌더된 영상 파일이 필요하다 — 우리는 대본만 있어
// 자동발행 미지원. 어드민이 대본을 복사해 직접 올린다(수동). 영상 생성
// 파이프라인이 생기면 여기에 Data API v3 videos.insert 를 연결한다.

import type { PublishAdapter, PublishResult } from './types'

export const youtubeAdapter: PublishAdapter = {
  platform: 'youtube',
  // 영상 자산이 없으므로 자동발행은 항상 미설정 취급.
  isConfigured: () => false,
  async publish(): Promise<PublishResult> {
    return { ok: false, platform: 'youtube', skipped: 'unsupported' }
  },
}
