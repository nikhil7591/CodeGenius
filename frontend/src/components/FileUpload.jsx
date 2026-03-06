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
      className={`relative overflow-hidden rounded-xl transition-all duration-400`}
      style={{
        border: `3px dashed ${isDragActive ? '#C6FF00' : '#08080F'}`,
        background: isDragActive ? '#14142A' : '#0F0F1E',
        boxShadow: isDragActive ? '4px 4px 0px #C6FF00' : '4px 4px 0px #08080F',
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

              <p className="text-base font-bold text-cream mb-1 font-display">
                {uploadStatus?.message || 'Processing repository...'}
              </p>
              <p className="text-xs text-cream/60 mb-5 font-mono">This may take a moment for large repositories</p>

              {uploadStatus?.progress != null && (
                <div className="max-w-xs mx-auto">
                  <div className="flex justify-between text-[11px] text-cream/60 mb-1.5 tabular-nums font-mono">
                    <span>PROGRESS</span>
                    <span>{Math.round(uploadStatus.progress)}%</span>
                  </div>
                  <div className="w-full rounded-lg h-3 overflow-hidden" style={{
                    background: '#08080F',
                    border: '2px solid #08080F',
                    boxShadow: '2px 2px 0px #08080F',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadStatus.progress}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="h-full"
                      style={{
                        background: '#C6FF00',
                        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%)',
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
                <div className="w-16 h-16 mx-auto rounded-lg font-display bg-lime/10 flex items-center justify-center" style={{
                  border: '2.5px solid #C6FF00',
                  boxShadow: '3px 3px 0px #C6FF00',
                }}>
                  <Upload size={28} className="text-lime" strokeWidth={2} />
                </div>
              </motion.div>

              <h3 className="text-2xl md:text-4xl font-display font-bold text-cream mb-2 letter-spacing-widest">
                DROP YOUR REPOSITORY
              </h3>
              <p className="text-sm text-cream/70 mb-6 font-mono">
                Drag & drop a ZIP file or click to browse
              </p>

              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-bold font-display"
              >
                <Zap size={16} />
                SELECT ZIP FILE
                <ArrowRight size={14} />
              </motion.button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-cream/50 font-mono tracking-widest">
                <span className="flex items-center gap-1">
                  <FileArchive size={12} />
                  ZIP ONLY
                </span>
                <span className="w-px h-3 bg-lime/20" />
                <span>UP TO 100MB</span>
                <span className="w-px h-3 bg-lime/20" />
                <span>ALL LANGUAGES</span>
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
            style={{
              borderTop: `2.5px solid ${uploadStatus.status === 'success' ? '#C6FF00' : '#FF2E7E'}`,
            }}
          >
            <div
              className={`flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold font-mono tracking-widest ${uploadStatus.status === 'success'
                  ? 'text-lime bg-lime/5'
                  : 'text-hot-pink bg-hot-pink/5'
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
