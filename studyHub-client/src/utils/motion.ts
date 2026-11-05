import type { Variants } from 'motion/react'

// Spring physics configurations for premium feel
export const springTransition = {
  type: 'spring' as const,
  stiffness: 80,
  damping: 15,
  mass: 1,
}

export const staggerContainer = (staggerChildren = 0.15, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
})

export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export const slideInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 70,
      damping: 18,
    },
  },
}

// Bouncing / Floating animation generator for a weightless floating look
export const getFloatAnimation = (yOffset = 15, duration = 4, delay = 0): Variants => ({
  animate: {
    y: [0, -yOffset, 0],
    rotate: [0, 2, -2, 0],
    transition: {
      duration,
      repeat: Infinity,
      repeatType: 'reverse' as const,
      ease: 'easeInOut' as const,
      delay,
    },
  },
})

// Pulsing interactive CTA
export const pulseAnimation: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.03,
    boxShadow: '0px 0px 20px rgba(79, 70, 229, 0.4)',
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 10,
    },
  },
  tap: { scale: 0.97 },
}
