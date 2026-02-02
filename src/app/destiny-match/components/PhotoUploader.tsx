'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { uploadMatchPhoto, type UploadProgress } from '@/lib/firebase/storage'
import styles from '../DestinyMatch.module.css'

interface PhotoUploaderProps {
  photos: string[]
  userId: string
  onChange: (photos: string[]) => void
  maxPhotos?: number
}

export default function PhotoUploader({
  photos,
  userId,
  onChange,
  maxPhotos = 6,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      if (photos.length >= maxPhotos) {
        setError(`최대 ${maxPhotos}장까지 업로드할 수 있습니다.`)
        return
      }

      const file = files[0]
      setError(null)
      setUploading(true)
      setProgress(0)

      try {
        const result = await uploadMatchPhoto(file, userId, (p: UploadProgress) => {
          setProgress(p.progress)
        })
        onChange([...photos, result.url]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
      } finally {
        setUploading(false)
        setProgress(0)
        // 같은 파일 다시 선택 가능하도록 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [photos, userId, maxPhotos, onChange]
  )

  const handleRemove = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index)
      onChange(newPhotos)
    },
    [photos, onChange]
  )

  const handleSetMain = useCallback(
    (index: number) => {
      if (index === 0) return
      const newPhotos = [...photos]
      const [moved] = newPhotos.splice(index, 1)
      newPhotos.unshift(moved)
      onChange(newPhotos)
    },
    [photos, onChange]
  );

  return (
    <div className={styles.photoUploaderContainer}>
      <label className={styles.photoUploaderLabel}>
        프로필 사진 ({photos.length}/{maxPhotos})
      </label>
      <p className={styles.photoUploaderHint}>
        첫 번째 사진이 메인 프로필 사진입니다
      </p>

      <div className={styles.photoGrid}>
        {photos.map((url, index) => (
          <div key={url} className={styles.photoItem}>
            <Image
              src={url}
              alt={`프로필 ${index + 1}`}
              fill
              sizes="(max-width: 768px) 30vw, 140px"
              className={styles.photoPreview}
            />
            {index === 0 && (
              <span className={styles.mainPhotoBadge}>메인</span>
            )}
            <div className={styles.photoActions}>
              {index !== 0 && (
                <button
                  type="button"
                  onClick={() => handleSetMain(index)}
                  className={styles.photoActionBtn}
                  title="메인으로 설정"
                >
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className={styles.photoRemoveBtn}
                title="삭제"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            className={styles.photoAddBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span className={styles.photoProgress}>{progress}%</span>
            ) : (
              <>
                <span className={styles.photoAddIcon}>+</span>
                <span className={styles.photoAddText}>사진 추가</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && <p className={styles.photoError}>{error}</p>}
    </div>
  )
}
