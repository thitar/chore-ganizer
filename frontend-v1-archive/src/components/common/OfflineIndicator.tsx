import { useState, useEffect } from 'react'

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      You are currently offline. Some features may be unavailable.
    </div>
  )
}

export default OfflineIndicator
