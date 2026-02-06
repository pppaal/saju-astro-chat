'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-400">API 문서 로딩중...</p>
      </div>
    </div>
  ),
})

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">API 문서 로딩중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Custom Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white py-6 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔮 Saju Astro Chat API</h1>
          <p className="text-purple-200">
            동양과 서양의 운명학을 결합한 종합 API 문서
          </p>
          <div className="flex gap-4 mt-4 text-sm">
            <span className="bg-purple-700/50 px-3 py-1 rounded-full">
              Version 1.0.0
            </span>
            <span className="bg-green-700/50 px-3 py-1 rounded-full">
              ✓ Production Ready
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-100 border-b py-4 px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 text-sm">
          <span className="font-semibold text-gray-700">Quick Links:</span>
          <a href="#/Saju" className="text-purple-600 hover:underline">사주</a>
          <a href="#/Astrology" className="text-purple-600 hover:underline">점성술</a>
          <a href="#/Tarot" className="text-purple-600 hover:underline">타로</a>
          <a href="#/Dream" className="text-purple-600 hover:underline">꿈해몽</a>
          <a href="#/I%20Ching" className="text-purple-600 hover:underline">주역</a>
          <a href="#/Compatibility" className="text-purple-600 hover:underline">궁합</a>
          <a href="#/Destiny%20Match" className="text-purple-600 hover:underline">매칭</a>
        </div>
      </div>

      {/* Swagger UI */}
      <SwaggerUI
        url="/openapi.json"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        tryItOutEnabled={true}
      />

      {/* Custom Styles */}
      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
          color: #1a1a2e;
        }
        .swagger-ui .info .description {
          font-size: 1rem;
          line-height: 1.6;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.2rem;
          border-bottom: 2px solid #e2e8f0;
        }
        .swagger-ui .opblock.opblock-post {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.05);
        }
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #8b5cf6;
        }
        .swagger-ui .opblock.opblock-get {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #10b981;
        }
        .swagger-ui .opblock.opblock-put {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
        }
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #f59e0b;
        }
        .swagger-ui .opblock.opblock-delete {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #ef4444;
        }
        .swagger-ui .opblock.opblock-patch {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
        }
        .swagger-ui .opblock.opblock-patch .opblock-summary-method {
          background: #6366f1;
        }
        .swagger-ui .btn.execute {
          background: #8b5cf6;
          border-color: #8b5cf6;
        }
        .swagger-ui .btn.execute:hover {
          background: #7c3aed;
        }
        .swagger-ui section.models {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .swagger-ui section.models h4 {
          font-size: 1.2rem;
          padding: 15px;
          background: #f8fafc;
        }
        .swagger-ui .model-box {
          background: #f8fafc;
        }
        .swagger-ui table tbody tr td:first-of-type {
          max-width: 200px;
          word-break: break-word;
        }
        .swagger-ui .parameter__name.required::after {
          color: #ef4444;
        }
      `}</style>
    </div>
  )
}
