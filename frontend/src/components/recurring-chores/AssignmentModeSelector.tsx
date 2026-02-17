import React from 'react'
import type { AssignmentMode } from '../../types/recurring-chores'
import type { User } from '../../types'

interface AssignmentModeSelectorProps {
  mode: AssignmentMode
  onModeChange: (mode: AssignmentMode) => void
  fixedAssigneeIds: number[]
  onFixedAssigneesChange: (ids: number[]) => void
  roundRobinPoolIds: number[]
  onRoundRobinPoolChange: (ids: number[]) => void
  availableChildren: User[]
  disabled?: boolean
}

const ASSIGNMENT_MODE_OPTIONS: { value: AssignmentMode; label: string; description: string }[] = [
  { value: 'FIXED', label: 'Fixed Assignment', description: 'Same child(ren) always do this chore' },
  { value: 'ROUND_ROBIN', label: 'Round Robin', description: 'Children take turns doing this chore' },
  { value: 'MIXED', label: 'Mixed', description: 'Some children always do it + others rotate' },
]

function generatePreviewText(
  mode: AssignmentMode,
  fixedAssigneeIds: number[],
  roundRobinPoolIds: number[],
  children: User[]
): string {
  const getChildName = (id: number) => children.find(c => c.id === id)?.name || 'Unknown'
  
  const fixedNames = fixedAssigneeIds.map(getChildName)
  const poolNames = roundRobinPoolIds.map(getChildName)

  switch (mode) {
    case 'FIXED': {
      if (fixedNames.length === 0) {
        return 'No children assigned yet'
      }
      if (fixedNames.length === 1) {
        return `${fixedNames[0]} will always do this chore`
      }
      const last = fixedNames.pop()
      return `${fixedNames.join(', ')} and ${last} will always do this chore`
    }

    case 'ROUND_ROBIN': {
      if (poolNames.length === 0) {
        return 'No children in rotation pool yet'
      }
      if (poolNames.length === 1) {
        return `${poolNames[0]} is the only one in the rotation (add more for true rotation)`
      }
      // Show rotation pattern: Alice → Bob → Charlie → Alice → ...
      const rotation = [...poolNames, poolNames[0]]
      return `${rotation.join(' → ')}`
    }

    case 'MIXED': {
      const parts: string[] = []
      
      if (fixedNames.length > 0) {
        if (fixedNames.length === 1) {
          parts.push(`${fixedNames[0]} always`)
        } else {
          const last = fixedNames.slice(-1)[0]
          const others = fixedNames.slice(0, -1)
          parts.push(`${others.join(', ')} and ${last} always`)
        }
      } else {
        parts.push('No fixed assignees')
      }

      if (poolNames.length > 0) {
        if (parts.length > 0) {
          parts.push(' + ')
        }
        if (poolNames.length === 1) {
          parts.push(`${poolNames[0]} rotates`)
        } else {
          parts.push(`${poolNames.join(' → ')} rotate`)
        }
      } else {
        if (parts.length > 0) {
          parts.push(' + no rotation')
        }
      }

      return parts.join('')
    }

    default:
      return 'Invalid assignment mode'
  }
}

export function AssignmentModeSelector({
  mode,
  onModeChange,
  fixedAssigneeIds,
  onFixedAssigneesChange,
  roundRobinPoolIds,
  onRoundRobinPoolChange,
  availableChildren,
  disabled = false,
}: AssignmentModeSelectorProps) {
  
  // Handle mode change - clear selections when switching modes
  const handleModeChange = (newMode: AssignmentMode) => {
    onModeChange(newMode)
    
    // Clear selections that aren't relevant to the new mode
    if (newMode === 'FIXED') {
      onRoundRobinPoolChange([])
    } else if (newMode === 'ROUND_ROBIN') {
      onFixedAssigneesChange([])
    }
    // For MIXED mode, keep both selections
  }

  // Toggle a child in the fixed assignees list
  const handleFixedAssigneeToggle = (childId: number) => {
    const newIds = fixedAssigneeIds.includes(childId)
      ? fixedAssigneeIds.filter(id => id !== childId)
      : [...fixedAssigneeIds, childId]
    onFixedAssigneesChange(newIds)
  }

  // Select all children as fixed assignees
  const handleSelectAllFixed = () => {
    onFixedAssigneesChange(availableChildren.map(c => c.id))
  }

  // Clear all fixed assignees
  const handleClearFixed = () => {
    onFixedAssigneesChange([])
  }

  // Add a child to the round-robin pool
  const handleAddToPool = (childId: number) => {
    if (!roundRobinPoolIds.includes(childId)) {
      onRoundRobinPoolChange([...roundRobinPoolIds, childId])
    }
  }

  // Remove a child from the round-robin pool
  const handleRemoveFromPool = (childId: number) => {
    onRoundRobinPoolChange(roundRobinPoolIds.filter(id => id !== childId))
  }

  // Move a child up in the rotation order
  const handleMoveUp = (childId: number) => {
    const index = roundRobinPoolIds.indexOf(childId)
    if (index > 0) {
      const newIds = [...roundRobinPoolIds]
      ;[newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]]
      onRoundRobinPoolChange(newIds)
    }
  }

  // Move a child down in the rotation order
  const handleMoveDown = (childId: number) => {
    const index = roundRobinPoolIds.indexOf(childId)
    if (index < roundRobinPoolIds.length - 1) {
      const newIds = [...roundRobinPoolIds]
      ;[newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]]
      onRoundRobinPoolChange(newIds)
    }
  }

  // Get children not yet in the round-robin pool
  const availableForPool = availableChildren.filter(
    child => !roundRobinPoolIds.includes(child.id)
  )

  // Validation messages
  const getValidationMessage = (): { type: 'warning' | 'error'; message: string } | null => {
    if (mode === 'FIXED' && fixedAssigneeIds.length === 0) {
      return { type: 'error', message: 'Please select at least one child for fixed assignment' }
    }
    if (mode === 'ROUND_ROBIN') {
      if (roundRobinPoolIds.length === 0) {
        return { type: 'error', message: 'Please add at least one child to the rotation pool' }
      }
      if (roundRobinPoolIds.length === 1) {
        return { type: 'warning', message: 'Consider adding more children for a true rotation' }
      }
    }
    if (mode === 'MIXED') {
      if (fixedAssigneeIds.length === 0 && roundRobinPoolIds.length === 0) {
        return { type: 'error', message: 'Please add at least one fixed assignee or rotation member' }
      }
      if (fixedAssigneeIds.length === 0) {
        return { type: 'warning', message: 'Consider adding fixed assignees or switch to Round Robin mode' }
      }
      if (roundRobinPoolIds.length === 0) {
        return { type: 'warning', message: 'Consider adding rotation members or switch to Fixed mode' }
      }
    }
    return null
  }

  const validation = getValidationMessage()

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assignment Mode
        </label>
        <div className="space-y-2">
          {ASSIGNMENT_MODE_OPTIONS.map(option => (
            <label
              key={option.value}
              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                mode === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="assignmentMode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => !disabled && handleModeChange(option.value)}
                disabled={disabled}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="block text-sm font-medium text-gray-900">
                  {option.label}
                </span>
                <span className="block text-sm text-gray-500">
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Fixed assignees section (shown for FIXED and MIXED modes) */}
      {(mode === 'FIXED' || mode === 'MIXED') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Always Assigned
            </label>
            {availableChildren.length > 2 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFixed}
                  disabled={disabled}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearFixed}
                  disabled={disabled}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          
          {availableChildren.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No children available in the family
            </p>
          ) : (
            <div className="space-y-2">
              {availableChildren.map(child => (
                <label
                  key={child.id}
                  className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                    fixedAssigneeIds.includes(child.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={fixedAssigneeIds.includes(child.id)}
                    onChange={() => !disabled && handleFixedAssigneeToggle(child.id)}
                    disabled={disabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">{child.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Round-robin pool section (shown for ROUND_ROBIN and MIXED modes) */}
      {(mode === 'ROUND_ROBIN' || mode === 'MIXED') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rotation Pool
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Children will take turns in this order
          </p>

          {/* Current pool with reorder controls */}
          {roundRobinPoolIds.length > 0 && (
            <div className="space-y-2 mb-3">
              {roundRobinPoolIds.map((childId, index) => {
                const child = availableChildren.find(c => c.id === childId)
                if (!child) return null
                
                return (
                  <div
                    key={childId}
                    className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    {/* Order indicator */}
                    <span className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white text-xs font-medium rounded-full">
                      {index + 1}
                    </span>
                    
                    {/* Name */}
                    <span className="flex-1 text-sm text-gray-900">{child.name}</span>
                    
                    {/* Reorder buttons */}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(childId)}
                        disabled={disabled || index === 0}
                        className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(childId)}
                        disabled={disabled || index === roundRobinPoolIds.length - 1}
                        className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromPool(childId)}
                        disabled={disabled}
                        className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add to pool dropdown */}
          {availableForPool.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddToPool(parseInt(e.target.value))
                    e.target.value = ''
                  }
                }}
                disabled={disabled}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Add child to rotation...
                </option>
                {availableForPool.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {roundRobinPoolIds.length === 0 && availableForPool.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No children available to add
            </p>
          )}
        </div>
      )}

      {/* Validation message */}
      {validation && (
        <div className={`flex items-center gap-2 text-sm ${
          validation.type === 'error' ? 'text-red-600' : 'text-amber-600'
        }`}>
          {validation.type === 'error' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <span>{validation.message}</span>
        </div>
      )}

      {/* Preview section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div className="text-sm font-medium text-blue-800 mb-1">Preview</div>
        <div className="text-blue-700">
          {generatePreviewText(mode, fixedAssigneeIds, roundRobinPoolIds, availableChildren)}
        </div>
      </div>
    </div>
  )
}
