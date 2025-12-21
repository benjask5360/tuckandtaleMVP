'use client'

import { Suspense } from 'react'
import V3StreamingViewer from './V3StreamingViewer'

export default function V3StreamingPage() {
  return (
    <Suspense fallback={<StreamingLoading />}>
      <V3StreamingViewer />
    </Suspense>
  )
}

function StreamingLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Preparing your story...</p>
      </div>
    </div>
  )
}
