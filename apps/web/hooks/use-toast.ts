"use client"

// Simplified version of the use-toast hook
import { useState } from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = (props: ToastProps) => {
    setToasts((prev) => [...prev, props])
    // In a real implementation, this would show the toast UI
    console.log("Toast:", props)
  }

  return {
    toast,
    toasts,
    dismiss: (index: number) => {
      setToasts((prev) => prev.filter((_, i) => i !== index))
    },
  }
}

