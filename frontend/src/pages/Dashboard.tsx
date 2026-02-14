import React, { useState } from 'react'
import { useAuth, useChores, useUsers } from '../hooks'
import { Loading } from '../components/common'
import type { ChoreAssignment } from '../types'

export const Dashboard: React.FC = () => {
  const { user, isParent } = useAuth()
  const { chores, loading: choresLoading, completeChore } = useChores()
  const { users, loading: usersLoading } = useUsers()
  const [showAllPending, setShowAllPending] = useState(false)

  if (choresLoading || usersLoading) {
    return <Loading text="Loading dashboard..." />
  }

  const totalChores = chores.length
  const pendingChores = chores.filter((c) => c.status === 'PENDING').length
  const completedChores = chores.filter((c) => c.status === 'COMPLETED').length
  const myPendingChores = chores.filter(
    (c) => c.status === 'PENDING' && c.assignedToId === user?.id
  ).length

  // Get user's pending chores, sorted by due date
  const myPendingList = myPendingChores > 0 
    ? chores
        .filter((c) => c.status === 'PENDING' && c.assignedToId === user?.id)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    : []

  // Show first 5 or all based on state
  const displayedPending = showAllPending ? myPendingList : myPendingList.slice(0, 5)
  const hasMorePending = myPendingList.length > 5

  const handleComplete = async (choreId: number) => {
    await completeChore(choreId)
  }

  const getUserName = (userId: number) => {
    const u = users.find((u) => u.id === userId)
    return u?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Chores</p>
              <p className="text-3xl font-bold text-gray-900">{totalChores}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingChores}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600">{completedChores}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">My Points</p>
              <p className="text-3xl font-bold text-blue-600">{user?.points || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {isParent && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Family Members</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <div key={u.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-600">{u.role}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-gray-600">Points:</span>
                  <span className="font-semibold text-blue-600">{u.points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Pending Chores</h2>
        {myPendingChores === 0 ? (
          <p className="text-gray-600">You have no pending chores. Great job!</p>
        ) : (
          <>
            <p className="text-gray-600 mb-4">You have {myPendingChores} pending chore(s).</p>
            
            {/* Pending chores list */}
            <div className="space-y-3 mb-4">
              {displayedPending.map((chore: ChoreAssignment) => (
                <div 
                  key={chore.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    chore.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {chore.choreTemplate?.title || 'Unknown Chore'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(chore.dueDate).toLocaleDateString()}
                      {chore.isOverdue && (
                        <span className="ml-2 text-red-600 font-medium">Overdue!</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {chore.choreTemplate?.points || 0} pts
                    </span>
                    <button
                      onClick={() => handleComplete(chore.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Show More / Show Less button */}
            {hasMorePending && (
              <button
                onClick={() => setShowAllPending(!showAllPending)}
                className="w-full py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {showAllPending ? 'Show Less' : `Show All ${myPendingList.length} Chores`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
