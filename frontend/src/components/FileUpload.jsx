import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Zap, CheckCircle, AlertCircle, FileArchive, ArrowRight } from 'lucide-react'

export const FileUpload = ({ onFileSelect, isLoading, uploadStatus }) => {
  const fileInputRef = useRef(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (e.dataTransfer.files[0].name.endsWith('.zip')) {
        onFileSelect(e.dataTransfer.files[0])
      } else {
        alert('Please drop a ZIP file')
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-2xl transition-all duration-400 ${isDragActive
          ? 'border-2 border-neon-blue shadow-neon-blue'
          : 'border-2 border-dashed border-dark-border/50 hover:border-neon-blue/40'
        }`}
      style={{
        background: isDragActive
          ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(157, 78, 221, 0.06) 100%)'
          : 'linear-gradient(135deg, rgba(19, 19, 43, 0.5) 0%, rgba(17, 17, 34, 0.3) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="relative z-10 p-8 md:p-10">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-5">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-[3px] border-dark-border/30 border-t-neon-blue"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border-[2px] border-dark-border/20 border-b-neon-purple"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileArchive size={22} className="text-neon-blue" />
                </div>
              </div>

              <p className="text-base font-semibold text-white mb-1">
                {uploadStatus?.message || 'Processing repository...'}
              </p>
              <p className="text-xs text-surface-400 mb-5">This may take a moment for large repositories</p>

              {uploadStatus?.progress != null && (
                <div className="max-w-xs mx-auto">
                  <div className="flex justify-between text-[11px] text-surface-400 mb-1.5 tabular-nums">
                    <span>Progress</span>
                    <span>{Math.round(uploadStatus.progress)}%</span>
                  </div>
                  <div className="w-full bg-dark-bg/60 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadStatus.progress}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #00D4FF 0%, #9D4EDD 50%, #06FDD8 100%)',
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="mb-5"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 border border-neon-blue/20 flex items-center justify-center">
                  <Upload size={28} className="text-neon-blue" strokeWidth={1.5} />
                </div>
              </motion.div>

              <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-2">
                Drop your repository
              </h3>
              <p className="text-sm text-surface-400 mb-6">
                Drag & drop a ZIP file or click to browse
              </p>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary inline-flex items-center gap-2.5 px-7 py-3 text-sm"
              >
                <Zap size={16} />
                Select ZIP File
                <ArrowRight size={14} className="opacity-60" />
              </motion.button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-surface-500">
                <span className="flex items-center gap-1">
                  <FileArchive size={12} />
                  ZIP only
                </span>
                <span className="w-px h-3 bg-dark-border/40" />
                <span>Up to 100MB</span>
                <span className="w-px h-3 bg-dark-border/40" />
                <span>All languages</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {uploadStatus?.status && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-dark-border/30"
          >
            <div
              className={`flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium ${uploadStatus.status === 'success'
                  ? 'text-neon-cyan bg-neon-cyan/5'
                  : 'text-red-400 bg-red-500/5'
                }`}
            >
              {uploadStatus.status === 'success' ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {uploadStatus.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
