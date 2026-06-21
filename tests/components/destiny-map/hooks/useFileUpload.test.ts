/**
 * useFileUpload Hook Tests
 * 이력서(CV) 파일 업로드/파싱 훅 테스트
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileUpload } from '@/components/destiny-map/hooks/useFileUpload'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock the PDF parser — the real one dynamically imports pdfjs-dist.
const mockExtractTextFromPDF = vi.fn()
vi.mock('@/components/destiny-map/pdf-parser', () => ({
  extractTextFromPDF: (file: File) => mockExtractTextFromPDF(file),
}))

// Build a fake change event for an <input type="file">. The hook reads
// e.target.files?.[0] and may reset e.target.value.
function makeChangeEvent(file: File | null) {
  const target = { files: file ? [file] : [], value: 'sentinel' }
  return { target } as unknown as React.ChangeEvent<HTMLInputElement>
}

// Minimal File polyfill helper — jsdom has File, but we control size/type.
function makeFile(content: string, name: string, type: string, size?: number): File {
  const file = new File([content], name, { type })
  if (typeof size === 'number') {
    Object.defineProperty(file, 'size', { value: size })
  }
  return file
}

describe('useFileUpload', () => {
  let setNotice: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setNotice = vi.fn()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should start with empty cvText / cvName and not parsing', () => {
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))

      expect(result.current.cvText).toBe('')
      expect(result.current.cvName).toBe('')
      expect(result.current.parsingPdf).toBe(false)
    })
  })

  describe('handleFileUpload — guards', () => {
    it('should no-op when no file is selected', async () => {
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(null))
      })

      expect(setNotice).not.toHaveBeenCalled()
      expect(result.current.cvName).toBe('')
      expect(mockExtractTextFromPDF).not.toHaveBeenCalled()
    })

    it('should reject oversized files (>10MB) before reading them (en)', async () => {
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const big = makeFile('x', 'big.txt', 'text/plain', 11 * 1024 * 1024)
      const evt = makeChangeEvent(big)

      await act(async () => {
        await result.current.handleFileUpload(evt)
      })

      expect(setNotice).toHaveBeenCalledWith(expect.stringContaining('too large'))
      // input value reset so the user can pick another file immediately
      expect((evt.target as unknown as { value: string }).value).toBe('')
      expect(result.current.cvName).toBe('')
      expect(mockExtractTextFromPDF).not.toHaveBeenCalled()
    })

    it('should reject oversized files in Korean when lang is ko', async () => {
      const { result } = renderHook(() => useFileUpload({ lang: 'ko', setNotice }))
      const big = makeFile('x', 'big.txt', 'text/plain', 11 * 1024 * 1024)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(big))
      })

      expect(setNotice).toHaveBeenCalledWith(expect.stringContaining('너무 커요'))
    })
  })

  describe('handleFileUpload — PDF path', () => {
    it('should parse a PDF and store the extracted text (en)', async () => {
      mockExtractTextFromPDF.mockResolvedValue('Resume text content')
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const pdf = makeFile('%PDF', 'cv.pdf', 'application/pdf', 1000)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(pdf))
      })

      expect(mockExtractTextFromPDF).toHaveBeenCalledWith(pdf)
      expect(result.current.cvText).toBe('Resume text content')
      expect(result.current.cvName).toBe('cv.pdf')
      expect(result.current.parsingPdf).toBe(false)
      expect(setNotice).toHaveBeenCalledWith(expect.stringContaining('CV loaded'))
    })

    it('should detect PDF by .pdf extension when the type is empty', async () => {
      mockExtractTextFromPDF.mockResolvedValue('Extracted')
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const pdf = makeFile('%PDF', 'resume.pdf', '', 500)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(pdf))
      })

      expect(mockExtractTextFromPDF).toHaveBeenCalled()
      expect(result.current.cvText).toBe('Extracted')
    })

    it('should clamp the extracted text to MAX_CV_CHARS (6000)', async () => {
      mockExtractTextFromPDF.mockResolvedValue('a'.repeat(10000))
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const pdf = makeFile('%PDF', 'cv.pdf', 'application/pdf', 1000)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(pdf))
      })

      expect(result.current.cvText.length).toBe(6000)
    })

    it('should auto-dismiss the success notice after NOTICE_DISMISS', async () => {
      mockExtractTextFromPDF.mockResolvedValue('Resume text content')
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const pdf = makeFile('%PDF', 'cv.pdf', 'application/pdf', 1000)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(pdf))
      })

      setNotice.mockClear()
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(setNotice).toHaveBeenCalledWith(null)
    })

    it('should report when the PDF yields no extractable text', async () => {
      mockExtractTextFromPDF.mockResolvedValue('')
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const pdf = makeFile('%PDF', 'cv.pdf', 'application/pdf', 1000)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(pdf))
      })

      expect(result.current.cvText).toBe('')
      expect(setNotice).toHaveBeenCalledWith(expect.stringContaining('Could not extract text'))
    })

    it('should report a Korean message for a scanned PDF (SCANNED_PDF)', async () => {
      mockExtractTextFromPDF.mockRejectedValue(new Error('SCANNED_PDF'))
      const { result } = renderHook(() => useFileUpload({ lang: 'ko', setNotice }))
      const pdf = makeFile('%PDF', 'cv.pdf', 'application/pdf', 1000)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(pdf))
      })

      expect(result.current.cvText).toBe('')
      expect(setNotice).toHaveBeenCalledWith(expect.stringContaining('스캔된 PDF'))
      expect(result.current.parsingPdf).toBe(false)
    })

    it('should report a generic parse failure (en) for other errors', async () => {
      mockExtractTextFromPDF.mockRejectedValue(new Error('boom'))
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const pdf = makeFile('%PDF', 'cv.pdf', 'application/pdf', 1000)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(pdf))
      })

      expect(setNotice).toHaveBeenCalledWith('PDF parsing failed')
      expect(result.current.parsingPdf).toBe(false)
    })

    it('should mark the previous file as replaced on a second upload (en)', async () => {
      mockExtractTextFromPDF.mockResolvedValue('first')
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))

      await act(async () => {
        await result.current.handleFileUpload(
          makeChangeEvent(makeFile('%PDF', 'first.pdf', 'application/pdf', 100))
        )
      })

      mockExtractTextFromPDF.mockResolvedValue('second')
      setNotice.mockClear()

      await act(async () => {
        await result.current.handleFileUpload(
          makeChangeEvent(makeFile('%PDF', 'second.pdf', 'application/pdf', 100))
        )
      })

      expect(setNotice).toHaveBeenCalledWith(expect.stringContaining('replaced previous file'))
      expect(result.current.cvName).toBe('second.pdf')
    })
  })

  describe('handleFileUpload — text file path (FileReader)', () => {
    it('should read a plain text file and store its contents', async () => {
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const txt = makeFile('hello world', 'cv.txt', 'text/plain', 11)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(txt))
      })

      // FileReader.onload fires asynchronously.
      await waitFor(() => {
        expect(result.current.cvText).toBe('hello world')
      })
      expect(result.current.cvName).toBe('cv.txt')
      expect(setNotice).toHaveBeenCalledWith(expect.stringContaining('File loaded'))
    })

    it('should clamp text-file contents to MAX_CV_CHARS', async () => {
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
      const txt = makeFile('b'.repeat(9000), 'cv.txt', 'text/plain', 9000)

      await act(async () => {
        await result.current.handleFileUpload(makeChangeEvent(txt))
      })

      await waitFor(() => {
        expect(result.current.cvText.length).toBe(6000)
      })
    })

    it('should surface a read failure when FileReader errors', async () => {
      // Force FileReader to error by stubbing the global.
      class FailingFileReader {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        error: unknown = new Error('read fail')
        result: string | null = null
        readAsText() {
          // simulate async error
          setTimeout(() => this.onerror?.(), 0)
        }
      }
      const original = global.FileReader
      // @ts-expect-error test stub
      global.FileReader = FailingFileReader

      try {
        const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))
        const txt = makeFile('hello', 'cv.txt', 'text/plain', 5)

        await act(async () => {
          await result.current.handleFileUpload(makeChangeEvent(txt))
          await vi.advanceTimersByTimeAsync(1)
        })

        expect(setNotice).toHaveBeenCalledWith('File reading failed')
        expect(result.current.cvText).toBe('')
        expect(result.current.cvName).toBe('')
      } finally {
        global.FileReader = original
      }
    })
  })

  describe('clearFile', () => {
    it('should reset all state and clear the notice', async () => {
      mockExtractTextFromPDF.mockResolvedValue('content')
      const { result } = renderHook(() => useFileUpload({ lang: 'en', setNotice }))

      await act(async () => {
        await result.current.handleFileUpload(
          makeChangeEvent(makeFile('%PDF', 'cv.pdf', 'application/pdf', 100))
        )
      })

      expect(result.current.cvText).toBe('content')

      act(() => {
        result.current.clearFile()
      })

      expect(result.current.cvText).toBe('')
      expect(result.current.cvName).toBe('')
      expect(result.current.parsingPdf).toBe(false)
      expect(setNotice).toHaveBeenLastCalledWith(null)
    })
  })
})
