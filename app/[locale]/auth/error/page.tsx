'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ErrorDetails() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
 
  return <p className="font-mono text-sm text-gray-500">Error Code: {error}</p>
}

export default function AuthErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="p-8 bg-white rounded-lg shadow-md text-black">
        <h1 className="mb-4 text-2xl font-bold text-red-600">Authentication Error</h1>
        <p className="mb-4">There was a problem signing you in.</p>
        <Suspense fallback={<p>Loading error details...</p>}>
          <ErrorDetails />
        </Suspense>
        <Link
          href="/auth/signin"
          className="mt-4 inline-block px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Try again
        </Link>
      </div>
    </div>
  )
}

