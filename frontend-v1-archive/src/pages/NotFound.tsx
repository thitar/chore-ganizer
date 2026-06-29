import React from 'react'
import { Button } from '../components/common'

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <Button variant="primary" onClick={() => window.location.href = '/'}>
          Go Home
        </Button>
      </div>
    </div>
  )
}
