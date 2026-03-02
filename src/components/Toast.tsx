import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useToastStore } from '@/store/useToastStore'

const typeStyles = {
  error: 'bg-occupied text-white ring-1 ring-white/15',
  success: 'bg-available text-white ring-1 ring-white/15',
  info: 'bg-primary text-white ring-1 ring-white/15',
}

const typeIcons = {
  error: CircleAlert,
  success: CircleCheck,
  info: Info,
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        (() => {
          const Icon = typeIcons[toast.type]
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg',
                'text-[12px] font-medium animate-in fade-in slide-in-from-bottom-2 duration-200',
                typeStyles[toast.type]
              )}
              role="status"
              aria-live="polite"
            >
              <Icon size={14} className="shrink-0 opacity-95" />
              <span className="leading-tight">{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick()
                dismiss(toast.id)
              }}
              className="ml-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[12px] font-semibold transition-colors"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-1 hover:bg-white/20 rounded-md p-0.5 transition-colors"
          >
            <X size={12} />
          </button>
            </div>
          )
        })()
      ))}
    </div>
  )
}
