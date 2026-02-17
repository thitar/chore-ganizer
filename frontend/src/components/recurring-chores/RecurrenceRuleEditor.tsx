import React from 'react'
import type { RecurrenceRule, Frequency, NthWeekday } from '../../types/recurring-chores'
import { Input } from '../common'

interface RecurrenceRuleEditorProps {
  value: RecurrenceRule
  onChange: (rule: RecurrenceRule) => void
  startDate?: Date
  disabled?: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
]

const WEEK_OPTIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: 5, label: 'Fifth' },
]

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function generatePreviewText(rule: RecurrenceRule, startDate?: Date): string {
  const { frequency, interval, dayOfWeek, dayOfMonth, nthWeekday } = rule

  // Get month for yearly frequency
  const month = startDate ? MONTHS[startDate.getMonth()] : 'January'
  const day = startDate?.getDate() || 1

  switch (frequency) {
    case 'DAILY':
      if (interval === 1) {
        return 'Every day'
      }
      return `Every ${interval} days`

    case 'WEEKLY': {
      const daysText = dayOfWeek && dayOfWeek.length > 0
        ? dayOfWeek
            .sort((a: number, b: number) => a - b)
            .map((d: number) => DAYS_OF_WEEK[d].fullLabel)
            .join(', ')
        : 'no days selected'
      
      if (interval === 1) {
        return `Every week on ${daysText}`
      }
      return `Every ${interval} weeks on ${daysText}`
    }

    case 'MONTHLY': {
      if (nthWeekday) {
        const weekLabel = WEEK_OPTIONS.find(w => w.value === nthWeekday.week)?.label || 'First'
        const dayLabel = DAYS_OF_WEEK.find(d => d.value === nthWeekday.day)?.fullLabel || 'Sunday'
        if (interval === 1) {
          return `The ${weekLabel.toLowerCase()} ${dayLabel} of every month`
        }
        return `The ${weekLabel.toLowerCase()} ${dayLabel} of every ${interval} months`
      }
      
      const dayOfMonthValue = dayOfMonth || day
      if (interval === 1) {
        return `On the ${getOrdinal(dayOfMonthValue)} of every month`
      }
      return `Every ${interval} months on the ${getOrdinal(dayOfMonthValue)}`
    }

    case 'YEARLY': {
      const monthDay = dayOfMonth || day
      if (interval === 1) {
        return `Every year on ${month} ${getOrdinal(monthDay)}`
      }
      return `Every ${interval} years on ${month} ${getOrdinal(monthDay)}`
    }

    default:
      return 'Invalid recurrence rule'
  }
}

export function RecurrenceRuleEditor({ 
  value, 
  onChange, 
  startDate, 
  disabled = false 
}: RecurrenceRuleEditorProps) {
  
  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFrequency = e.target.value as Frequency
    
    const newRule: RecurrenceRule = {
      ...value,
      frequency: newFrequency,
      interval: value.interval || 1,
    }

    // Reset frequency-specific fields
    delete newRule.dayOfWeek
    delete newRule.dayOfMonth
    delete newRule.nthWeekday

    // Set defaults based on frequency
    if (newFrequency === 'WEEKLY') {
      newRule.dayOfWeek = value.dayOfWeek || []
    } else if (newFrequency === 'MONTHLY') {
      // Default to day of month mode
      newRule.dayOfMonth = value.dayOfMonth || (startDate?.getDate() || 1)
    }

    onChange(newRule)
  }

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = Math.max(1, parseInt(e.target.value) || 1)
    onChange({
      ...value,
      interval: newInterval,
    })
  }

  const handleDayOfWeekToggle = (dayValue: number) => {
    const currentDays = value.dayOfWeek || []
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(d => d !== dayValue)
      : [...currentDays, dayValue]
    
    onChange({
      ...value,
      dayOfWeek: newDays,
    })
  }

  const handleDayOfMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = Math.min(31, Math.max(1, parseInt(e.target.value) || 1))
    const newRule: RecurrenceRule = {
      ...value,
      dayOfMonth: day,
    }
    delete newRule.nthWeekday
    onChange(newRule)
  }

  const handleNthWeekdayChange = (field: 'week' | 'day', newValue: number) => {
    const currentNthWeekday = value.nthWeekday || { week: 1, day: 0 }
    const newNthWeekday: NthWeekday = {
      ...currentNthWeekday,
      [field]: newValue,
    }
    const newRule: RecurrenceRule = {
      ...value,
      nthWeekday: newNthWeekday,
    }
    delete newRule.dayOfMonth
    onChange(newRule)
  }

  const toggleNthWeekdayMode = (useNthWeekday: boolean) => {
    if (useNthWeekday) {
      const newRule: RecurrenceRule = {
        ...value,
        nthWeekday: value.nthWeekday || { week: 1, day: 0 },
      }
      delete newRule.dayOfMonth
      onChange(newRule)
    } else {
      const newRule: RecurrenceRule = {
        ...value,
        dayOfMonth: value.dayOfMonth || (startDate?.getDate() || 1),
      }
      delete newRule.nthWeekday
      onChange(newRule)
    }
  }

  const getIntervalLabel = () => {
    switch (value.frequency) {
      case 'DAILY':
        return value.interval === 1 ? 'day' : 'days'
      case 'WEEKLY':
        return value.interval === 1 ? 'week' : 'weeks'
      case 'MONTHLY':
        return value.interval === 1 ? 'month' : 'months'
      case 'YEARLY':
        return value.interval === 1 ? 'year' : 'years'
      default:
        return ''
    }
  }

  const isNthWeekdayMode = value.nthWeekday !== undefined

  return (
    <div className="space-y-4">
      {/* Frequency selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Frequency
        </label>
        <select
          value={value.frequency}
          onChange={handleFrequencyChange}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {FREQUENCY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Interval input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Repeat every
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={value.interval || 1}
            onChange={handleIntervalChange}
            disabled={disabled}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <span className="text-gray-600">{getIntervalLabel()}</span>
        </div>
      </div>

      {/* Day of week selector (WEEKLY) */}
      {value.frequency === 'WEEKLY' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            On days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => !disabled && handleDayOfWeekToggle(day.value)}
                disabled={disabled}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  (value.dayOfWeek || []).includes(day.value)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {(!value.dayOfWeek || value.dayOfWeek.length === 0) && (
            <p className="mt-2 text-sm text-amber-600">
              Please select at least one day
            </p>
          )}
        </div>
      )}

      {/* Monthly options */}
      {value.frequency === 'MONTHLY' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            On
          </label>
          
          {/* Toggle between modes */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => !disabled && toggleNthWeekdayMode(false)}
              disabled={disabled}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                !isNthWeekdayMode
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              Specific day
            </button>
            <button
              type="button"
              onClick={() => !disabled && toggleNthWeekdayMode(true)}
              disabled={disabled}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                isNthWeekdayMode
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              Nth weekday
            </button>
          </div>

          {/* Day of month input */}
          {!isNthWeekdayMode && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={value.dayOfMonth || 1}
                onChange={handleDayOfMonthChange}
                disabled={disabled}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-gray-600">of the month</span>
            </div>
          )}

          {/* Nth weekday selector */}
          {isNthWeekdayMode && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">The</span>
              <select
                value={value.nthWeekday?.week || 1}
                onChange={(e) => handleNthWeekdayChange('week', parseInt(e.target.value))}
                disabled={disabled}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {WEEK_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={value.nthWeekday?.day || 0}
                onChange={(e) => handleNthWeekdayChange('day', parseInt(e.target.value))}
                disabled={disabled}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.fullLabel}
                  </option>
                ))}
              </select>
              <span className="text-gray-600">of the month</span>
            </div>
          )}
        </div>
      )}

      {/* Yearly info */}
      {value.frequency === 'YEARLY' && startDate && (
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          Will repeat annually on {MONTHS[startDate.getMonth()]} {getOrdinal(startDate.getDate())}
        </div>
      )}

      {/* Preview section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div className="text-sm font-medium text-blue-800 mb-1">Preview</div>
        <div className="text-blue-700">
          {generatePreviewText(value, startDate)}
        </div>
      </div>
    </div>
  )
}
