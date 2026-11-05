import { useEffect, useRef } from 'react'
import { useMotionValue, useTransform, animate } from 'motion/react'

interface CountingNumberProps {
  value: number
  duration?: number // in seconds
  decimalPlaces?: number
}

export default function CountingNumber({ value, duration = 1.2, decimalPlaces = 0 }: CountingNumberProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => latest)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Animate from 0 to value
    const controls = animate(count, value, {
      duration,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [value, duration])

  useEffect(() => {
    // Keep raw dom in sync with transform updates
    return rounded.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = latest.toLocaleString(undefined, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        })
      }
    })
  }, [rounded, decimalPlaces])

  return <span ref={ref} className="font-mono">0</span>
}

