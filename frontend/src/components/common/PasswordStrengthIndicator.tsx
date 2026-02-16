import React, { useMemo } from 'react'
import { Check, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
  onStrengthChange?: (strength: number) => void
}

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p) => /[0-9]/.test(p) },
  { label: 'At least one special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  onStrengthChange,
}) => {
  const { metRequirements, strength, strengthLabel, strengthColor } = useMemo(() => {
    const met = passwordRequirements.filter((req) => req.test(password))
    const score = met.length

    // Calculate strength percentage
    const strengthPercent = (score / passwordRequirements.length) * 100

    // Determine label and color based on score
    let label = 'Very Weak'
    let color = 'bg-red-500'

    if (score === 5) {
      label = 'Strong'
      color = 'bg-green-500'
    } else if (score >= 4) {
      label = 'Good'
      color = 'bg-lime-500'
    } else if (score >= 3) {
      label = 'Fair'
      color = 'bg-yellow-500'
    } else if (score >= 2) {
      label = 'Weak'
      color = 'bg-orange-500'
    }

    return {
      metRequirements: met,
      strength: strengthPercent,
      strengthLabel: label,
      strengthColor: color,
    }
  }, [password])

  // Notify parent of strength changes
  React.useEffect(() => {
    onStrengthChange?.(strength)
  }, [strength, onStrengthChange])

  if (!password) {
    return null
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Password strength</span>
          <span className="text-xs font-medium text-gray-700">{strengthLabel}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        {passwordRequirements.map((req, index) => {
          const isMet = req.test(password)
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              {isMet ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <X className="w-3.5 h-3.5 text-gray-300" />
              )}
              <span className={isMet ? 'text-green-600' : 'text-gray-400'}>
                {req.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
