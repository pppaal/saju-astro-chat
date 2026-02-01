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
 * 매칭 프로필 사진 업로드
 * 브라우저에서 직접 Firebase Storage로 업로드
 */
export async function uploadMatchPhoto(
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
  const path = `match-photos/${userId}/${timestamp}.${ext}`
  const storageRef = ref(firebaseStorage, path)

  // 업로드
  return new Promise((resolve, reject) => {
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    })

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        onProgress?.({
          progress,
          state: snapshot.state === 'running' ? 'running' : 'paused',
        })
      },
      (error) => {
        onProgress?.({ progress: 0, state: 'error' })
        reject(new Error(`업로드 실패: ${error.message}`))
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          onProgress?.({ progress: 100, state: 'success' })
          resolve({ url, path })
        } catch (error) {
          reject(new Error('다운로드 URL을 가져올 수 없습니다.'))
        }
      }
    )
  })
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
