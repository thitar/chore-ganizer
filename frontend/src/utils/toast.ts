import { toast } from 'sonner'

/**
 * Show a success toast that auto-dismisses after 5 seconds
 */
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 5000,
  })
}

/**
 * Show an error toast that requires manual dismiss
 */
export const showError = (message: string) => {
  toast.error(message, {
    duration: Infinity,
  })
}
