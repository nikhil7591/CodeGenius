import React from 'react'
import { motion } from 'framer-motion'

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-dark-bg" />

      <div className="absolute inset-0 bg-mesh opacity-60" />

      <motion.div
        animate={{
          x: [0, 80, -30, 0],
          y: [0, 40, -20, 0],
          scale: [1, 1.3, 0.9, 1]
        }}
        transition={{ repeat: Infinity, duration: 25, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, #00D4FF 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <motion.div
        animate={{
          x: [0, -60, 40, 0],
          y: [0, -30, 60, 0],
          scale: [1, 1.1, 1.3, 1]
        }}
        transition={{ repeat: Infinity, duration: 30, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-32 -right-32 w-[450px] h-[450px] rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, #9D4EDD 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <motion.div
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -40, 30, 0],
        }}
        transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut', delay: 5 }}
        className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #06FDD8 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark-bg/80" />
    </div>
  )
}

export const FloatingParticle = ({ delay = 0, size = 4, x = '50%', y = '50%' }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 0.6, 0],
        y: [0, -30, 0],
        x: [0, 10, -10, 0],
      }}
      transition={{
        repeat: Infinity,
        duration: 4,
        delay,
        ease: 'easeInOut',
      }}
      className="absolute rounded-full bg-neon-blue/40"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        filter: 'blur(1px)',
      }}
    />
  )
}

export const ScrollIndicator = ({ show = true }) => {
  if (!show) return null
  return (
    <motion.div
      animate={{ y: [0, 8, 0], opacity: [0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 2.5 }}
      className="text-center text-surface-400"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </motion.div>
  )
}

export const GlowingCard = ({ children, className = '' }) => {
  return (
    <motion.div
      whileHover={{ boxShadow: '0 0 40px rgba(0, 212, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4)' }}
      className={`glass-card-hover ${className}`}
    >
      {children}
    </motion.div>
  )
}
