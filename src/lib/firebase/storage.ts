'use client'

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
  type UploadTask,
} from 'firebase/storage'

let app: FirebaseApp | null = null
let storage: FirebaseStorage | null = null

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function getFirebaseStorage(): FirebaseStorage | null {
  const configString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  if (!configString) {
    storage = null
    app = null
    return null
  }

  if (storage) return storage

  try {
    const config = JSON.parse(configString)
    app = getApps().length > 0 ? getApp() : initializeApp(config)
    storage = getStorage(app)
    return storage
  } catch {
    return null
  }
}

export interface UploadProgress {
  progress: number // 0-100
  state: 'running' | 'paused' | 'success' | 'error'
}

export interface UploadResult {
  url: string
  path: string
}

/**
 * Firebase Storage 로 이미지 업로드 (브라우저에서 직접).
 * folder 로 용도를 구분: match-photos / profile-photos.
 */
function uploadImageToFolder(
  folder: string,
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // 검증
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('지원하지 않는 파일 형식입니다. JPG, PNG, WebP만 가능합니다.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 5MB 이하만 가능합니다.')
  }

  const firebaseStorage = getFirebaseStorage()
  if (!firebaseStorage) {
    throw new Error('사진 업로드 서비스를 사용할 수 없습니다.')
  }

  // 파일 경로 생성
  const ext = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const path = `${folder}/${userId}/${timestamp}.${ext}`
  const storageRef = ref(firebaseStorage, path)

  // 업로드 — Firebase Storage 규칙이 막혀 있거나 CORS 가 잘못 잡혔을 때
  // state_changed 이 영영 호출되지 않고 fetch 가 매달려 사용자 화면이
  // "업로드 중…" 으로 굳는 사례가 종종 보였다. 60초 안에 한 번도 진행
  // 콜백이 안 오면 timeout 으로 reject 해서 사용자에게 명확한 메시지를
  // 보여준다.
  return new Promise((resolve, reject) => {
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    })

    let settled = false
    let lastProgressAt = Date.now()

    const watchdog = setInterval(() => {
      if (settled) {
        clearInterval(watchdog)
        return
      }
      // 60초 동안 진행 콜백이 한 번도 안 오면 강제 종료
      if (Date.now() - lastProgressAt > 60_000) {
        settled = true
        clearInterval(watchdog)
        try {
          uploadTask.cancel()
        } catch {
          // ignore
        }
        onProgress?.({ progress: 0, state: 'error' })
        reject(
          new Error(
            '업로드가 응답하지 않습니다. 네트워크 상태 또는 Firebase Storage 설정을 확인해 주세요.'
          )
        )
      }
    }, 5_000)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        lastProgressAt = Date.now()
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        onProgress?.({
          progress,
          state: snapshot.state === 'running' ? 'running' : 'paused',
        })
      },
      (error) => {
        if (settled) return
        settled = true
        clearInterval(watchdog)
        onProgress?.({ progress: 0, state: 'error' })
        // Firebase 에러는 .code 가 더 진단에 유용함 (storage/unauthorized,
        // storage/canceled, storage/retry-limit-exceeded 등). 사용자에게도
        // 사유를 알려주려고 같이 보여준다.
        const fbError = error as { code?: string; message?: string }
        const code = fbError.code || 'unknown'
        // 브라우저 콘솔에 상세 진단을 남겨 디버깅을 돕는다.
        if (typeof window !== 'undefined') {
          console.error('[firebase/storage] upload failed', {
            code,
            message: fbError.message,
            path,
          })
        }
        reject(new Error(`업로드 실패: ${code}${fbError.message ? ` — ${fbError.message}` : ''}`))
      },
      async () => {
        if (settled) return
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          settled = true
          clearInterval(watchdog)
          onProgress?.({ progress: 100, state: 'success' })
          resolve({ url, path })
        } catch (err) {
          settled = true
          clearInterval(watchdog)
          if (typeof window !== 'undefined') {
            console.error('[firebase/storage] getDownloadURL failed', err)
          }
          reject(new Error('다운로드 URL을 가져올 수 없습니다.'))
        }
      }
    )
  })
}

/**
 * 매칭 프로필 사진 업로드
 */
export async function uploadMatchPhoto(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImageToFolder('match-photos', file, userId, onProgress)
}

/**
 * 내 프로필 사진 업로드 (프로필 페이지)
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadImageToFolder('profile-photos', file, userId, onProgress)
}

/**
 * 매칭 프로필 사진 삭제
 */
export async function deleteMatchPhoto(photoPath: string): Promise<void> {
  const firebaseStorage = getFirebaseStorage()
  if (!firebaseStorage) return

  try {
    const storageRef = ref(firebaseStorage, photoPath)
    await deleteObject(storageRef)
  } catch {
    // 이미 삭제된 파일이면 무시
  }
}
