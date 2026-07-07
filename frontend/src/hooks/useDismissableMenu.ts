import { useEffect, useRef, useCallback } from 'react'

interface UseDismissableMenuOptions {
  /** Whether the menu is currently open */
  isOpen: boolean
  /** Called when the menu should close */
  onClose: () => void
  /** Whether to focus the trigger on close (default: true) */
  focusTriggerOnClose?: boolean
}

export function useDismissableMenu({ isOpen, onClose, focusTriggerOnClose = true }: UseDismissableMenuOptions) {
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    onClose()
    if (focusTriggerOnClose && triggerRef.current) {
      triggerRef.current.focus()
    }
  }, [onClose, focusTriggerOnClose])

  useEffect(() => {
    if (!isOpen) return

    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, close])

  return { menuRef, triggerRef }
}
