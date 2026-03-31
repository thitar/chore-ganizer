import React, { useState, useEffect } from 'react'
import type { User, CreateUserData, UpdateUserData } from '../../types'
import { Button, Input } from '../common'
import ColorPicker from './ColorPicker'

interface UserFormProps {
  user?: User | null
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>
  onCancel: () => void
  loading?: boolean
  parentCount?: number
}

export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  onCancel,
  loading = false,
  parentCount,
}) => {
  const isEdit = !!user

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CHILD' as 'PARENT' | 'CHILD',
    color: '#3B82F6',
    basePocketMoney: '0',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        color: user.color || '#3B82F6',
        basePocketMoney: user.basePocketMoney?.toString() || '0',
      })
    }
  }, [user])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required'
    } else if (!isEdit) {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter'
      } else if (!/[a-z]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one lowercase letter'
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one number'
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one special character'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const data = isEdit
      ? {
          name: formData.name.trim(),
          email: formData.email.trim(),
          color: formData.color,
          role: formData.role,
          basePocketMoney: formData.role === 'CHILD' ? parseFloat(formData.basePocketMoney) || 0 : undefined,
        } as UpdateUserData
      : {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        } as CreateUserData

    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="Enter name"
        required
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        placeholder="Enter email"
        required
      />

      {!isEdit && (
        <Input
          label="Password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          error={errors.password}
          placeholder="Enter password"
          required
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="CHILD"
              checked={formData.role === 'CHILD'}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'CHILD' })}
              disabled={isEdit && user?.role === 'PARENT' && parentCount !== undefined && parentCount <= 1}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="ml-2 text-sm text-gray-700">Child</span>
            {isEdit && user?.role === 'PARENT' && parentCount !== undefined && parentCount <= 1 && (
              <span className="ml-1 text-xs text-red-500">(last parent)</span>
            )}
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="PARENT"
              checked={formData.role === 'PARENT'}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'PARENT' })}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Parent</span>
          </label>
        </div>
      </div>

      <ColorPicker
        label="Calendar Color"
        value={formData.color}
        onChange={(color) => setFormData({ ...formData, color })}
        previewText={formData.name || 'User'}
      />

      {formData.role === 'CHILD' && (
        <div>
          <Input
            label="Base Pocket Money (€)"
            type="number"
            step="0.01"
            min="0"
            value={formData.basePocketMoney}
            onChange={(e) => setFormData({ ...formData, basePocketMoney: e.target.value })}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">Base amount added to pocket money each payout period</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          {isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}

export default UserForm
