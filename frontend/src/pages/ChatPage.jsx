import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '../components/Navbar'
import { FileUpload } from '../components/FileUpload'
import { ChatMessage, TypingIndicator } from '../components/ChatMessage'
import { ChatInput } from '../components/ChatInput'
import { WorkflowModal } from '../components/WorkflowModal'
import { AnimatedBackground, FloatingParticle } from '../components/Background'
import { Code2, MessageSquare, Upload as UploadIcon, Sparkles, Zap, Brain } from 'lucide-react'

const API_BASE = '/api'

export const ChatPage = () => {
  const [currentStep, setCurrentStep] = useState('upload')
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [repoName, setRepoName] = useState(null)
  const [repoInfo, setRepoInfo] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [modelStatus, setModelStatus] = useState(null)
  const [showWorkflow, setShowWorkflow] = useState(false)
  const chatEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/health`)
      if (response.data.groq_available) {
        setModelStatus('Groq')
      } else if (response.data.ollama_available) {
        setModelStatus('Ollama')
      } else {
        setModelStatus('Context')
      }
    } catch (error) {
      setModelStatus(null)
    }
  }

  const handleFileSelect = async (file) => {
    console.log('[Upload] File selected:', file.name, `(${(file.size / 1024 / 1024).toFixed(1)} MB)`)

    if (!file.name.toLowerCase().endsWith('.zip')) {
      console.warn('[Upload] Rejected: not a ZIP file')
      setUploadStatus({
        status: 'error',
        message: 'Please select a ZIP file'
      })
      return
    }

    setIsLoading(true)
    setUploadStatus({
      message: 'Uploading file to server...',
      progress: 0
    })

    // Use a ref-like object so the interval ID is accessible across closures
    let processingInterval = null

    const clearPolling = () => {
      if (processingInterval) {
        clearInterval(processingInterval)
        processingInterval = null
      }
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      // Strip .zip extension for repo_name
      const fileName = file.name.replace(/\.zip$/i, '')
      formData.append('repo_name', fileName)

      console.log('[Upload] Starting upload to backend...')

      // Phase 1: Real upload progress via onUploadProgress (0% → 50%)
      // Phase 2: Backend processing progress via polling /api/progress (50% → 100%)
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const uploadPercent = Math.round((progressEvent.loaded / progressEvent.total) * 50)

            if (uploadPercent < 50) {
              setUploadStatus({
                message: 'Uploading file to server...',
                progress: uploadPercent
              })
            }

            // Once all bytes are sent, start polling backend for real processing progress
            if (uploadPercent >= 50 && !processingInterval) {
              console.log('[Upload] File sent — polling backend progress...')
              setUploadStatus({ message: 'File received — starting processing...', progress: 51 })

              // Translates raw backend messages into clean UI-friendly text
              const friendlyMessage = (status, msg, pct) => {
                if (status === 'done') return '✓ Complete! Loading chat...'
                if (status === 'error') return `Error: ${msg}`
                if (pct <= 55) return 'Saving file to server...'
                if (pct <= 63) return 'Extracting & scanning files...'
                if (pct <= 78) return 'Analyzing your code...'
                if (pct <= 98) return 'Building search index...'
                return 'Almost done...'
              }

              processingInterval = setInterval(async () => {
                try {
                  const prog = await axios.get(`${API_BASE}/progress`, { timeout: 5000 })
                  const { status, message, progress } = prog.data
                  console.log(`[Upload] Backend progress: ${progress}% — ${message}`)

                  // Don't poll when server is idle (no upload in progress)
                  if (status === 'idle') return

                  if (progress > 50) {
                    setUploadStatus({
                      message: friendlyMessage(status, message, progress),
                      progress
                    })
                  }
                  // Stop polling automatically when backend signals done or error
                  if (status === 'done' || status === 'error') {
                    clearPolling()
                  }
                } catch (_) {
                  // Ignore transient polling network errors
                }
              }, 800)
            }
          }
        }
      })

      // Response arrived — stop polling
      clearPolling()

      console.log('[Upload] Response received:', response.data)

      if (response.data.status === 'success') {
        console.log(`[Upload] ✓ Success! ${response.data.file_count} files, ${response.data.chunk_count} chunks`)

        setRepoName(fileName)
        setRepoInfo({
          info: {
            file_count: response.data.file_count,
            chunk_count: response.data.chunk_count
          }
        })

        setUploadStatus({
          status: 'success',
          message: `✓ Processed ${response.data.file_count} files into ${response.data.chunk_count} chunks`,
          progress: 100
        })

        setTimeout(() => {
          setCurrentStep('chat')
          setMessages([{
            text: `I've indexed your repository "${fileName}" and I'm ready to answer questions about your code. What would you like to know?`,
            isUser: false,
            model: 'CodeGenius',
            model_name: 'System'
          }])
        }, 1200)
      } else {
        console.error('[Upload] Backend returned non-success:', response.data)
        setUploadStatus({
          status: 'error',
          message: response.data.error || 'Processing failed. Check the backend terminal for details.',
          progress: 0
        })
      }
    } catch (error) {
      // FIXED: Always stop polling on any error so the UI doesn't stay frozen
      clearPolling()

      console.error('[Upload] ✗ Error:', error)
      console.error('[Upload] Error response:', error.response?.data)
      console.error('[Upload] Error message:', error.message)

      let errorMessage = 'Failed to process repository.'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be under heavy load — check the backend terminal.'
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMessage = 'Cannot connect to backend. Make sure it is running on port 5000.'
      } else if (error.response?.status === 413) {
        errorMessage = 'File is too large. Please use a ZIP file smaller than 100 MB.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      // FIXED: status must be 'error' (not undefined) for the error UI to render
      setUploadStatus({
        status: 'error',
        message: errorMessage,
        progress: 0
      })
    } finally {
      clearPolling()
      setIsLoading(false)
      console.log('[Upload] Upload flow completed')
    }
  }

  const handleSendMessage = async () => {
    if (!query.trim() || isLoading) return

    const userMessage = query
    setQuery('')
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }])
    setIsLoading(true)

    try {
      const response = await axios.post(`${API_BASE}/chat`, { query: userMessage })

      if (response.data.status === 'success') {
        setMessages((prev) => [...prev, {
          text: response.data.answer,
          isUser: false,
          model: response.data.model,
          model_name: response.data.model_name,
          sources: response.data.sources
        }])
      } else {
        setMessages((prev) => [...prev, {
          text: response.data.error || 'Sorry, an error occurred',
          isUser: false,
          model: 'Error'
        }])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [...prev, {
        text: error.response?.data?.error || 'Failed to connect to backend. Make sure it is running.',
        isUser: false,
        model: 'Error'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      await axios.post(`${API_BASE}/reset`)
      setCurrentStep('upload')
      setMessages([])
      setRepoName(null)
      setRepoInfo(null)
      setUploadStatus(null)
    } catch (error) {
      console.error('Reset error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-void text-cream font-sans">
      <AnimatedBackground />

      <Navbar
        repoName={repoName}
        repoInfo={repoInfo}
        modelStatus={modelStatus}
        onReset={handleReset}
        onWorkflow={() => setShowWorkflow(true)}
      />

      {showWorkflow && repoName && (
        <WorkflowModal
          repoName={repoName}
          onClose={() => setShowWorkflow(false)}
        />
      )}

      <main className="relative z-10 md:ml-64">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {currentStep === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center py-12"
              >
                <div className="relative mb-10 text-center">
                  <FloatingParticle delay={0} size={3} x="10%" y="20%" />
                  <FloatingParticle delay={1} size={4} x="85%" y="15%" />
                  <FloatingParticle delay={2} size={3} x="90%" y="80%" />

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold
                                    bg-lime/10 border-2 border-lime text-lime text-xs font-display tracking-widest mb-5"
                      style={{ boxShadow: '2px 2px 0px #08080F' }}>
                      <Sparkles size={13} />
                      AI-POWERED CODE ANALYSIS
                    </div>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-5xl sm:text-6xl md:text-7xl font-display font-bold mb-4 leading-[1.1] text-balance text-cream"
                  >
                    UNDERSTAND YOUR{' '}
                    <span className="gradient-text">CODEBASE</span>
                    {' '}INSTANTLY
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-base md:text-lg text-cream/60 max-w-lg mx-auto leading-relaxed font-mono"
                  >
                    Upload any repository and get AI-powered insights.
                    Ask questions, explore code, and learn faster.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="w-full max-w-xl"
                >
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isLoading={isLoading}
                    uploadStatus={uploadStatus}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 w-full max-w-xl"
                >
                  {[
                    { icon: UploadIcon, label: 'UPLOAD ZIP', desc: 'Drop your repository' },
                    { icon: Brain, label: 'AI INDEXES', desc: 'Embeddings created' },
                    { icon: MessageSquare, label: 'ASK ANYTHING', desc: 'Get instant answers' },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -2, transform: 'translate(-2px, -2px)' }}
                      className="cartoon-card p-4 text-center group cursor-default"
                      style={{
                        background: '#14142A',
                        border: '2.5px solid #08080F',
                        boxShadow: '4px 4px 0px #08080F',
                      }}
                    >
                      <div className="w-9 h-9 mx-auto mb-2.5 rounded-lg bg-lime/10 border-2 border-lime
                                      flex items-center justify-center group-hover:bg-lime/20 transition-colors duration-300"
                        style={{ boxShadow: '2px 2px 0px #08080F' }}>
                        <step.icon size={16} className="text-lime transition-colors duration-300" />
                      </div>
                      <p className="text-xs font-bold text-cream mb-0.5 font-display tracking-widest">{step.label}</p>
                      <p className="text-[11px] text-cream/50 font-mono">{step.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col h-[calc(100vh-5rem)]"
              >
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto py-6 pr-2 scrollbar-thin"
                >
                  {messages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} isUser={msg.isUser} />
                  ))}
                  <AnimatePresence>
                    {isLoading && <TypingIndicator />}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>

                <div className="py-4 border-t border-ink/30">
                  <ChatInput
                    query={query}
                    setQuery={setQuery}
                    onSend={handleSendMessage}
                    isLoading={isLoading}
                    modelStatus={modelStatus}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
