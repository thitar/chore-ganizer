interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
}

export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${SIZE_CLASS[size]}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}
