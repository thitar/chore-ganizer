import React, { useState, useEffect } from 'react'
import { useAuth, useAssignments } from '../hooks'
import { Loading } from '../components/common'
import { assignmentsApi } from '../api'
import type { ChoreAssignment } from '../types'

export const Dashboard: React.FC = () => {
  const { user, isParent } = useAuth()
  const { completeAssignment } = useAssignments()
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [calendarData, setCalendarData] = useState<{
    year: number
    month: number
    days: Record<number, ChoreAssignment[]>
  } | null>(null)

  // Load user's personal assignments
  useEffect(() => {
    loadMyAssignments()
  }, [user?.id])

  const loadMyAssignments = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      // Fetch only the current user's assignments
      const data = await assignmentsApi.getAll({ userId: user.id })
      setAssignments(data)
      
      // Load calendar data for current month
      const now = new Date()
      const calData = await assignmentsApi.getCalendar(now.getFullYear(), now.getMonth() + 1)
      // Filter to only show user's assignments in calendar
      const userDays: Record<number, ChoreAssignment[]> = {}
      for (const [day, dayAssignments] of Object.entries(calData.days)) {
        const userAssignments = dayAssignments.filter(a => a.assignedToId === user.id)
        if (userAssignments.length > 0) {
          userDays[Number(day)] = userAssignments
        }
      }
      setCalendarData({
        year: calData.year,
        month: calData.month,
        days: userDays
      })
    } catch (err) {
      console.error('Failed to load assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (id: number, status: 'COMPLETED' | 'PARTIALLY_COMPLETE' = 'COMPLETED') => {
    const result = await completeAssignment(id, { status })
    if (result.success) {
      const statusText = status === 'PARTIALLY_COMPLETE' ? 'partially completed' : 'completed'
      setSuccessMessage(`Chore ${statusText}! You earned ${result.pointsAwarded} points!`)
      setTimeout(() => setSuccessMessage(null), 5000)
      await loadMyAssignments()
    }
  }

  // Calculate personal stats
  const myPending = assignments.filter(a => a.status === 'PENDING')
  const myPartiallyComplete = assignments.filter(a => a.status === 'PARTIALLY_COMPLETE')
  const myCompleted = assignments.filter(a => a.status === 'COMPLETED')
  const myOverdue = myPending.filter(a => a.isOverdue)

  // Sort pending by due date
  const sortedPending = [...myPending, ...myPartiallyComplete].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )

  // Sort completed by completedAt date (most recent first)
  const sortedCompleted = [...myCompleted].sort(
    (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
  )

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay()
  }

  const generateCalendarDays = () => {
    if (!calendarData) return []
    
    const daysInMonth = getDaysInMonth(calendarData.year, calendarData.month)
    const firstDay = getFirstDayOfMonth(calendarData.year, calendarData.month)
    const days: { day: number; assignments: ChoreAssignment[]; isToday: boolean; isCurrentMonth: boolean }[] = []
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    // Previous month padding
    const prevMonth = calendarData.month === 1 ? 12 : calendarData.month - 1
    const prevYear = calendarData.month === 1 ? calendarData.year - 1 : calendarData.year
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      days.push({
        day: dayNum,
        assignments: [],
        isToday: false,
        isCurrentMonth: false
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        assignments: calendarData.days[day] || [],
        isToday: currentYear === calendarData.year && currentMonth === calendarData.month && day === currentDay,
        isCurrentMonth: true
      })
    }

    // Next month padding
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        assignments: [],
        isToday: false,
        isCurrentMonth: false
      })
    }

    return days
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']

  if (loading) {
    return <Loading text="Loading your dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}!</p>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">My Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{myPending.length}</p>
              {myOverdue.length > 0 && (
                <p className="text-sm text-red-600">{myOverdue.length} overdue</p>
              )}
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partial</p>
              <p className="text-3xl font-bold text-orange-600">{myPartiallyComplete.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔶</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600">{myCompleted.length}</p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending & Partially Completed Chores */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            My Chores
            {sortedPending.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({sortedPending.length} active)
              </span>
            )}
          </h2>
          
          {sortedPending.length === 0 ? (
            <p className="text-gray-600">You have no pending chores. Great job!</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedPending.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`p-3 rounded-lg border ${
                    assignment.isOverdue 
                      ? 'border-red-300 bg-red-50' 
                      : assignment.status === 'PARTIALLY_COMPLETE'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {assignment.choreTemplate?.title || 'Unknown Chore'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        {assignment.isOverdue && (
                          <span className="ml-2 text-red-600 font-medium">Overdue!</span>
                        )}
                        {assignment.status === 'PARTIALLY_COMPLETE' && (
                          <span className="ml-2 text-orange-600 font-medium">Partial</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {assignment.choreTemplate?.points || 0} pts
                      </span>
                      <button
                        onClick={() => handleComplete(assignment.id, 'COMPLETED')}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleComplete(assignment.id, 'PARTIALLY_COMPLETE')}
                        className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                      >
                        Partial
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personal Calendar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            My Calendar - {calendarData ? monthNames[calendarData.month - 1] : ''} {calendarData?.year}
          </h2>
          
          {calendarData ? (
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
              {generateCalendarDays().map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[60px] p-1 border rounded ${
                    day.isCurrentMonth 
                      ? day.isToday 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <span className={`text-xs ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day.day}
                  </span>
                  {day.assignments.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {day.assignments.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${
                            a.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : a.status === 'PARTIALLY_COMPLETE'
                              ? 'bg-orange-100 text-orange-800'
                              : a.isOverdue
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                          title={a.choreTemplate?.title}
                        >
                          {a.choreTemplate?.title}
                        </div>
                      ))}
                      {day.assignments.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{day.assignments.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Loading calendar...</p>
          )}
        </div>
      </div>

      {/* Completed Chores (Collapsible) */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Completed Chores ({myCompleted.length})
          </h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showCompleted ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showCompleted && (
          <div className="mt-4">
            {sortedCompleted.length === 0 ? (
              <p className="text-gray-600">No completed chores yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedCompleted.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">
                          {assignment.choreTemplate?.title || 'Unknown Chore'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Completed: {assignment.completedAt ? new Date(assignment.completedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <span className="text-sm text-green-600 font-medium">
                        +{assignment.choreTemplate?.points || 0} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
