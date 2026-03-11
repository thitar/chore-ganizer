import React from 'react'

interface ErrorDisplayProps {
  title?: string
  message: string
  onRetry?: () => void
  variant?: 'default' | 'warning' | 'danger'
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  message,
  onRetry,
  variant = 'default'
}) => {
  const variantClasses = {
    default: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    danger: 'bg-red-100 border-red-400 text-red-800'
  }

  const titleVariantClasses = {
    default: 'text-red-700',
    warning: 'text-yellow-700',
    danger: 'text-red-800'
  }

  return (
    <div className={`border rounded-lg p-4 ${variantClasses[variant]}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg 
            className={`h-5 w-5 ${titleVariantClasses[variant]}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-semibold ${titleVariantClasses[variant]}`}>
            {title}
          </h3>
          <div className="mt-2 text-sm">
            <p>{message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                  variant === 'warning' 
                    ? 'text-yellow-800 bg-yellow-100 hover:bg-yellow-200' 
                    : 'text-red-800 bg-red-100 hover:bg-red-200'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay
