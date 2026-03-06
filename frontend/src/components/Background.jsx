import React from 'react'
import { motion } from 'framer-motion'

export const AnimatedBackground = () => {
  // Ghost code tokens floating upward
  const codeTokens = ['const', 'function', '=>', '{}', 'return', 'import', 'export', 'class']

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Deep void background */}
      <div className="absolute inset-0 bg-void" />

      {/* SVG noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' result='noise' /%3E%3C/filter%3E%3Crect width='200' height='200' fill='%23C6FF00' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '400px 400px',
        }}
      />

      {/* Organic blob 1 - Neon Lime, top-left */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
        className="absolute -top-40 -left-40 w-[600px] h-[600px] opacity-[0.08]"
        style={{
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          background: '#C6FF00',
          animation: 'morph 15s ease-in-out infinite',
          filter: 'blur(80px)',
        }}
      />

      {/* Organic blob 2 - Amber, bottom-right */}
      <motion.div
        animate={{
          rotate: -360,
        }}
        transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] opacity-[0.06]"
        style={{
          borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
          background: '#FF9F0A',
          animation: 'morph 20s ease-in-out infinite 2s',
          filter: 'blur(100px)',
        }}
      />

      {/* Organic blob 3 - Pale Cyan, center-right */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{ repeat: Infinity, duration: 45, ease: 'linear' }}
        className="absolute top-1/3 right-1/4 w-[400px] h-[400px] opacity-[0.05]"
        style={{
          borderRadius: '30% 70% 30% 70% / 70% 30% 70% 30%',
          background: '#A0F0FF',
          animation: 'morph 18s ease-in-out infinite 5s',
          filter: 'blur(80px)',
        }}
      />

      {/* Floating ghost code tokens */}
      {codeTokens.map((token, index) => (
        <motion.div
          key={token + index}
          initial={{
            opacity: 0.6,
            y: window.innerHeight + 50,
            x: Math.random() * window.innerWidth,
            rotate: Math.random() * 360,
          }}
          animate={{
            opacity: 0,
            y: -100,
            rotate: Math.random() * 360 + 180,
          }}
          transition={{
            duration: 20 + Math.random() * 15,
            ease: 'linear',
            repeat: Infinity,
            delay: index * 2,
          }}
          className="absolute whitespace-nowrap pointer-events-none"
          style={{
            fontSize: '14px',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 'bold',
            color: 'rgba(198, 255, 0, 0.15)',
            textShadow: '0 0 20px rgba(198, 255, 0, 0.1)',
            letterSpacing: '0.05em',
          }}
        >
          {token}
        </motion.div>
      ))}

      {/* Grid pattern overlay - very subtle */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(198, 255, 0, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(198, 255, 0, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Scanline effect - subtle horizontal lines sweep */}
      <motion.div
        animate={{
          top: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 8,
          ease: 'linear',
        }}
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(198, 255, 0, 0.05), transparent)',
          boxShadow: '0 0 20px rgba(198, 255, 0, 0.1)',
        }}
      />

      {/* Gradient fade to dark at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void/80" />
    </div>
  )
}

export const FloatingParticle = ({ delay = 0, size = 4, x = '50%', y = '50%' }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        y: [0, -50, 0],
        x: [0, Math.random() * 30 - 15, 0],
      }}
      transition={{
        repeat: Infinity,
        duration: 5,
        delay,
        ease: 'easeInOut',
      }}
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: '#C6FF00',
        filter: 'blur(2px)',
        boxShadow: '0 0 10px rgba(198, 255, 0, 0.6)',
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
      className="text-center text-cream"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </motion.div>
  )
}

export const GlowingCard = ({ children, className = '' }) => {
  return (
    <motion.div
      whileHover={{ 
        boxShadow: '6px 6px 0px #C6FF00',
        transform: 'translate(-2px, -2px)',
      }}
      className={`cartoon-card ${className}`}
    >
      {children}
    </motion.div>
  )
}
