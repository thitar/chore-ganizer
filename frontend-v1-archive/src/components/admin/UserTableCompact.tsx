import React, { useState } from 'react'
import type { User } from '../../types'
import { Loading, ErrorDisplay, Modal, Button } from '../common'

interface UserTableCompactProps {
  users: User[]
  loading: boolean
  error: string | null
  onLock: (userId: number) => void
  onUnlock: (userId: number) => void
}

function isUserLocked(user: User): boolean {
  if (!user.lockoutUntil) return false
  try {
    const lockoutDate =
      typeof user.lockoutUntil === 'string'
        ? new Date(user.lockoutUntil)
        : user.lockoutUntil
    return lockoutDate > new Date()
  } catch {
    return false
  }
}

export const UserTableCompact: React.FC<UserTableCompactProps> = ({
  users,
  loading,
  error,
  onLock,
  onUnlock,
}) => {
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null)
  const confirmUser = users.find((u) => u.id === confirmUserId)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <Loading text="Loading users..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <ErrorDisplay message={error} />
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Users</h3>
        <p className="text-gray-500 text-sm">No users found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Users</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Name
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Role
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Status
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const locked = isUserLocked(user)
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: user.color || '#3B82F6' }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'PARENT'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {locked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    {user.role !== 'PARENT' && (
                      <Button
                        variant={locked ? 'secondary' : 'danger'}
                        size="sm"
                        onClick={() => setConfirmUserId(user.id)}
                      >
                        {locked ? 'Unlock' : 'Lock'}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation dialog */}
      <Modal
        isOpen={confirmUserId !== null}
        onClose={() => setConfirmUserId(null)}
        title={confirmUser?.lockedAt ? 'Unlock User' : 'Lock User'}
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to {confirmUser?.lockedAt ? 'unlock' : 'lock'}{' '}
          {confirmUser?.name}?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmUserId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmUser) {
                if (confirmUser.lockedAt) {
                  onUnlock(confirmUser.id)
                } else {
                  onLock(confirmUser.id)
                }
              }
              setConfirmUserId(null)
            }}
          >
            {confirmUser?.lockedAt ? 'Unlock' : 'Lock'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
