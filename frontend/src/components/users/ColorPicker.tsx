import React from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  showPreview?: boolean
  previewText?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

// Predefined color palette for easy selection
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#A855F7', // Violet
]

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label = 'Color',
  showPreview = true,
  previewText = 'Preview',
  size = 'md',
  disabled = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const presetSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    // Only update if it's a valid partial or full hex color
    if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
      onChange(hex)
    }
  }

  const isValidHex = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      
      {/* Custom color input with preset options */}
      <div className="space-y-3">
        {/* Preset colors */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              disabled={disabled}
              className={`${presetSizeClasses[size]} rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                value === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Custom color picker */}
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={isValidHex(value) ? value : '#3B82F6'}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`${sizeClasses[size]} rounded-lg cursor-pointer border border-gray-300 p-1 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <input
            type="text"
            value={value}
            onChange={handleColorInputChange}
            disabled={disabled}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm disabled:opacity-50"
            placeholder="#000000"
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{previewText}:</p>
            <div
              className="h-10 rounded-lg flex items-center justify-center text-white font-medium px-4 transition-colors"
              style={{ backgroundColor: isValidHex(value) ? value : '#3B82F6' }}
            >
              {previewText}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ColorPicker
