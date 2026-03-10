import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '../../types'
import { Button } from '../common'

interface UserTableProps {
  users: User[]
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
  onLock?: (user: User) => void
  onUnlock?: (user: User) => void
  loading?: boolean
}

type SortField = 'name' | 'email' | 'role' | 'points' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onEdit,
  onDelete,
  onLock,
  onUnlock,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'role':
          comparison = a.role.localeCompare(b.role)
          break
        case 'points':
          comparison = a.points - b.points
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [users, sortField, sortDirection])

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null
    return (
      <svg
        className={`w-4 h-4 inline-block ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  const isUserLocked = (user: User): boolean => {
    if (!user.lockoutUntil) return false
    try {
      const lockoutDate = typeof user.lockoutUntil === 'string' 
        ? new Date(user.lockoutUntil) 
        : user.lockoutUntil
      return lockoutDate > new Date()
    } catch {
      return false
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon field="name" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                Email <SortIcon field="email" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('role')}
              >
                Role <SortIcon field="role" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('points')}
              >
                Points <SortIcon field="points" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: user.color || '#3B82F6' }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'PARENT'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-medium">{user.points}</div>
                  {user.role === 'CHILD' && user.basePocketMoney > 0 && (
                    <div className="text-xs text-green-600">€{user.basePocketMoney.toFixed(2)}/mo</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: user.color || '#3B82F6' }}
                    />
                    <span className="text-xs text-gray-500 font-mono">{user.color || '#3B82F6'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isUserLocked(user) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
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
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                    >
                      View
                    </Link>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(user)}
                        className="text-gray-600 hover:text-gray-900 text-xs font-medium"
                      >
                        Edit
                      </button>
                    )}
                    {onLock && !isUserLocked(user) && user.role !== 'PARENT' && (
                      <button
                        onClick={() => onLock(user)}
                        className="text-amber-600 hover:text-amber-900 text-xs font-medium"
                        disabled={loading}
                      >
                        Lock
                      </button>
                    )}
                    {onUnlock && isUserLocked(user) && user.role !== 'PARENT' && (
                      <button
                        onClick={() => onUnlock(user)}
                        className="text-green-600 hover:text-green-900 text-xs font-medium"
                        disabled={loading}
                      >
                        Unlock
                      </button>
                    )}
                    {onDelete && user.role !== 'PARENT' && (
                      <button
                        onClick={() => onDelete(user)}
                        className="text-red-600 hover:text-red-900 text-xs font-medium"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view - shown only on mobile */}
      <div className="md:hidden space-y-4">
        {sortedUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-lg shadow p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: user.color || '#3B82F6' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === 'PARENT'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {user.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-500">Points: </span>
                <span className="font-medium">{user.points}</span>
              </div>
              {isUserLocked(user) ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  Locked
                </span>
              ) : (
                <span className="text-green-600 text-xs font-medium">Active</span>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Link
                to={`/users/${user.id}`}
                className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                View
              </Link>
              {onEdit && (
                <button
                  onClick={() => onEdit(user)}
                  className="flex-1 text-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  Edit
                </button>
              )}
              {onDelete && user.role !== 'PARENT' && (
                <button
                  onClick={() => onDelete(user)}
                  className="flex-1 text-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found</p>
        </div>
      )}
    </div>
  )
}

export default UserTable
