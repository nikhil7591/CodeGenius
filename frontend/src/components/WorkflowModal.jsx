import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { X, Upload, CheckCircle, GitBranch, Database, Zap, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const API_BASE = '/api'

// ────────────────────────────────────────────────────────────────────────────
// CUSTOM SCROLLBAR STYLES — Dark Cartoon Futurism Theme
// ────────────────────────────────────────────────────────────────────────────
const scrollbarStyles = `
  /* Firefox scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: #C6FF00 #13132B;
  }
  
  /* Chrome/Safari scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  ::-webkit-scrollbar-track {
    background: #13132B;
    border-radius: 8px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #C6FF00;
    border-radius: 8px;
    border: 2px solid #08080F;
    box-shadow: 2px 2px 0px #08080F;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #E8FF33;
    box-shadow: 2px 2px 0px #08080F;
  }
`

// Inject scrollbar styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = scrollbarStyles
  document.head.appendChild(styleEl)
}

// ────────────────────────────────────────────────────────────────────────────
// NODE TYPE CONFIGURATIONS — Each type has unique visual identity
// ────────────────────────────────────────────────────────────────────────────
const NODE_CONFIG = {
  entry: {
    label: 'ENTRY',
    icon: Upload,
    gradient: 'linear-gradient(135deg, #C6FF00, #A8E000)',
    border: '#08080F',
    textColor: '#08080F',
    badgeColor: '#C6FF00',
    badgeBg: 'rgba(198,255,0,0.2)',
    shadowColor: '#08080F',
    pulse: true,
  },
  output: {
    label: 'OUTPUT',
    icon: CheckCircle,
    gradient: 'linear-gradient(135deg, #06FDD8, #00B89C)',
    border: '#08080F',
    textColor: '#08080F',
    badgeColor: '#06FDD8',
    badgeBg: 'rgba(6,253,216,0.2)',
    shadowColor: '#08080F',
  },
  process: {
    label: 'PROCESS',
    icon: null,
    bg: '#13132B',
    border: '#9D4EDD',
    borderWidth: '2.5px',
    textColor: '#F5F0E8',
    badgeColor: '#9D4EDD',
    badgeBg: 'rgba(157,78,221,0.2)',
    shadowColor: '#08080F',
  },
  decision: {
    label: 'DECISION',
    icon: GitBranch,
    bg: '#1C1520',
    border: '#FF9F0A',
    borderWidth: '2.5px',
    leftBorder: '4px solid #FF9F0A',
    textColor: '#F5F0E8',
    badgeColor: '#FF9F0A',
    badgeBg: 'rgba(255,159,10,0.2)',
    shadowColor: '#08080F',
  },
  database: {
    label: 'DATABASE',
    icon: Database,
    bg: '#0F0F2A',
    border: '#6366F1',
    borderWidth: '2.5px',
    topBorder: '4px solid #6366F1',
    textColor: '#F5F0E8',
    badgeColor: '#6366F1',
    badgeBg: 'rgba(99,102,241,0.2)',
    shadowColor: '#08080F',
  },
  api: {
    label: 'API',
    icon: Zap,
    bg: '#0A1A0A',
    border: '#C6FF00',
    borderWidth: '2.5px',
    textColor: '#C6FF00',
    badgeColor: '#C6FF00',
    badgeBg: 'rgba(198,255,0,0.15)',
    shadowColor: '#08080F',
    glow: 'rgba(198,255,0,0.25)',
  },
}

// ────────────────────────────────────────────────────────────────────────────
// LAYOUT ENGINE — BFS-based horizontal column layout
// ────────────────────────────────────────────────────────────────────────────
const computeLayout = (nodes, edges) => {
  if (!nodes || !nodes.length) return { positions: {}, canvasW: 400, canvasH: 300 }

  // Find entry node (first node or type=entry)
  const entryNode = nodes.find(n => n.type === 'entry') || nodes[0]
  if (!entryNode) return { positions: {}, canvasW: 400, canvasH: 300 }

  // BFS to assign depth (column) to each node
  const depth = {}
  const queue = [{ id: entryNode.id, d: 0 }]
  const visited = new Set()

  while (queue.length) {
    const { id, d } = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    depth[id] = d

    // Find outgoing edges from this node
    const outgoing = edges.filter(e => e.from === id)
    outgoing.forEach(e => {
      if (!visited.has(e.to)) {
        queue.push({ id: e.to, d: d + 1 })
      }
    })
  }

  // Assign depth to any unreached nodes
  const maxDepth = Math.max(...Object.values(depth || {}), 0)
  nodes.forEach(n => {
    if (depth[n.id] === undefined) {
      depth[n.id] = maxDepth + 1
    }
  })

  // Group nodes by depth (column)
  const columns = {}
  nodes.forEach(n => {
    const col = depth[n.id]
    if (!columns[col]) columns[col] = []
    columns[col].push(n.id)
  })

  // Position nodes
  const NODE_W = 200
  const NODE_H = 90
  const COL_GAP = 100
  const ROW_GAP = 60
  const LEFT_PADDING = 40
  const TOP_PADDING = 40

  const positions = {}
  const colKeys = Object.keys(columns)
    .map(Number)
    .sort((a, b) => a - b)

  colKeys.forEach((col, colIdx) => {
    const nodesInCol = columns[col]
    const totalColH = nodesInCol.length * NODE_H + (nodesInCol.length - 1) * ROW_GAP
    const startY = TOP_PADDING

    nodesInCol.forEach((nodeId, rowIdx) => {
      positions[nodeId] = {
        x: colIdx * (NODE_W + COL_GAP) + LEFT_PADDING,
        y: startY + rowIdx * (NODE_H + ROW_GAP),
        w: NODE_W,
        h: NODE_H,
      }
    })
  })

  // Calculate canvas dimensions
  const canvasW = colKeys.length * (NODE_W + COL_GAP) + 120
  const canvasH = Math.max(...Object.values(positions).map(p => p.y + p.h)) + 60

  return { positions, canvasW, canvasH }
}

// ────────────────────────────────────────────────────────────────────────────
// L-SHAPED ELBOW ARROW with animated traveling dot
// ────────────────────────────────────────────────────────────────────────────
const ElbowArrow = ({ from, to, positions, index, nodeMap, nodes }) => {
  const fromPos = positions[from]
  const toPos = positions[to]
  if (!fromPos || !toPos) return null

  const fromNode = nodes.find(n => n.id === from)
  const arrowColor = fromNode ? (NODE_CONFIG[fromNode.type]?.badgeColor || '#2A2A55') : '#2A2A55'

  // L-shaped path: exit right side of source → center → enter left side of target
  const x1 = fromPos.x + fromPos.w
  const y1 = fromPos.y + fromPos.h / 2
  const x2 = toPos.x
  const y2 = toPos.y + toPos.h / 2
  const midX = (x1 + x2) / 2

  const pathD = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`

  return (
    <g>
      {/* Main arrow line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={arrowColor}
        strokeWidth={2}
        strokeOpacity={0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.4 + index * 0.1, duration: 0.5, ease: 'easeInOut' }}
      />

      {/* Arrowhead */}
      <motion.polygon
        points={`${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}`}
        fill={arrowColor}
        fillOpacity={0.8}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 + index * 0.1 }}
      />

      {/* Traveling dot animation (simulated with circle following the path) */}
      <motion.circle
        r={3}
        fill={arrowColor}
        fillOpacity={0.6}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.4, 0.8, 0.4],
          x: [x1, midX, x2],
          y: [y1, y1, y2],
        }}
        transition={{
          delay: 1 + index * 0.15,
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </g>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SINGLE FLOW NODE with type-specific styling
// ────────────────────────────────────────────────────────────────────────────
const FlowNode = ({ node, index, x, y, w, h, isHovered, onHover }) => {
  const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.process
  const Icon = cfg.icon

  // Entrance animation with stagger
  const nodeVariants = {
    hidden: { opacity: 0, scale: 0.7, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 320,
        damping: 20,
        delay: index * 0.07,
      },
    },
  }

  // Idle pulse for entry nodes
  const pulseVariants = {
    idle: cfg.pulse
      ? {
          scale: [1, 1.03, 1],
          transition: {
            repeat: Infinity,
            duration: 2.5,
            ease: 'easeInOut',
          },
        }
      : {},
  }

  // Hover animation
  const hoverVariants = {
    hover: {
      scale: 1.05,
      y: -3,
      x: -2,
      transition: { type: 'spring', stiffness: 400, damping: 18 },
    },
  }

  const isGradient = cfg.gradient !== undefined
  const bgStyle = isGradient
    ? {
        background: cfg.gradient,
        color: cfg.textColor,
      }
    : {
        background: cfg.bg,
        color: cfg.textColor,
      }

  return (
    <motion.div
      variants={nodeVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        zIndex: isHovered ? 50 : 10,
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.div
        variants={pulseVariants}
        animate={cfg.pulse ? 'idle' : {}}
        whileHover="hover"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: node.type === 'api' ? '999px' : '10px',
          border: `${cfg.borderWidth || '3px'} solid ${cfg.border}`,
          ...(cfg.leftBorder && { borderLeft: cfg.leftBorder }),
          ...(cfg.topBorder && { borderTop: cfg.topBorder }),
          boxShadow:
            node.type === 'api' && isHovered
              ? `0 0 16px ${cfg.glow}, 4px 4px 0px ${cfg.shadowColor}`
              : `4px 4px 0px ${cfg.shadowColor}`,
          padding: node.type === 'api' ? '10px 16px' : '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'box-shadow 0.3s ease',
          ...bgStyle,
        }}
      >
        {/* Icon + Label container */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          {Icon && <Icon size={14} strokeWidth={2.5} opacity={0.9} />}

          {/* Type badge */}
          {(node.type === 'process' || node.type === 'decision' || node.type === 'database' || node.type === 'api') && (
            <div
              style={{
                fontSize: '7px',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: cfg.badgeBg,
                color: cfg.badgeColor,
                padding: '2px 6px',
                borderRadius: '3px',
                lineHeight: 1,
                marginBottom: '2px',
              }}
            >
              {cfg.label}
            </div>
          )}

          {/* Node label */}
          <div
            style={{
              fontSize: node.type === 'api' ? '9px' : '11px',
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {node.label}
          </div>
        </div>

        {/* Hover tooltip - description */}
        <AnimatePresence>
          {isHovered && node.description && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 12px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1E1E3F',
                border: '2.5px solid #2A2A55',
                boxShadow: '6px 6px 0px #08080F',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                fontFamily: "'Nunito', sans-serif",
                color: '#E2E8F0',
                maxWidth: '280px',
                whiteSpace: 'normal',
                lineHeight: 1.5,
                zIndex: 100,
                pointerEvents: 'none',
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              {node.description}
              {/* Arrow pointer */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid #1E1E3F',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// LOADING SPINNER — 3 bouncing colored dots
// ────────────────────────────────────────────────────────────────────────────
const LoadingDots = () => {
  const dotColors = ['#C6FF00', '#FF9F0A', '#06FDD8']

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        height: '32px',
      }}
    >
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -16, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.6,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: dotColors[i],
            boxShadow: `0 0 8px ${dotColors[i]}`,
          }}
        />
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN WORKFLOW MODAL
// ────────────────────────────────────────────────────────────────────────────
export const WorkflowModal = ({ repoName, onClose }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [manualZoom, setManualZoom] = useState(false)
  const [customZoom, setCustomZoom] = useState(1)
  const [displayZoom, setDisplayZoom] = useState(1)

  // Fetch workflow data
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await axios.get(`${API_BASE}/workflow?repo=${encodeURIComponent(repoName)}`)
        setData(res.data)
      } catch (e) {
        setError(e.response?.data?.error || e.message || 'Failed to generate workflow')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [repoName])

  // Compute layout
  const layoutResult = data ? computeLayout(data.nodes, data.edges) : { positions: {}, canvasW: 400, canvasH: 300 }
  const positions = layoutResult.positions
  const canvasW = layoutResult.canvasW
  const canvasH = layoutResult.canvasH

  // Calculate auto-fit zoom (fit all content in viewport without scrollbars)
  const VIEWPORT_W = 1350 // modal max-width minus padding
  const VIEWPORT_H = 800 // available height (95vh - header) with scrolling support
  const autoZoom = Math.min(VIEWPORT_W / canvasW, VIEWPORT_H / canvasH, 1)

  useEffect(() => {
    setDisplayZoom(autoZoom)
    setManualZoom(false)
    setCustomZoom(1)
  }, [autoZoom])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(8, 8, 15, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        style={{
          background: '#0F0F1E',
          border: '2.5px solid #2A2A55',
          boxShadow: '8px 8px 0px #08080F',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1400px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            padding: '18px 24px',
            borderBottom: '2px solid #2A2A55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#13132B',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: '#C6FF00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #08080F',
                boxShadow: '3px 3px 0px #08080F',
                color: '#08080F',
                fontWeight: 'bold',
              }}
            >
              <GitBranch size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#F5F0E8',
                  letterSpacing: '0.05em',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                WORKFLOW{' '}
                <span style={{ color: '#C6FF00' }}>FLOWCHART</span>
              </h2>
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '10px',
                  color: '#64748B',
                  marginTop: '4px',
                  margin: 0,
                }}
              >
                {repoName}
              </p>
            </div>
          </div>

          {/* Control buttons */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setManualZoom(true)
                setCustomZoom(z => Math.min(z + 0.2, 2))
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                background: '#13132B',
                border: '2px solid #2A2A55',
                boxShadow: '3px 3px 0px #08080F',
                color: '#C6FF00',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZoomIn size={16} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setManualZoom(true)
                setCustomZoom(z => Math.max(z - 0.2, 0.5))
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                background: '#13132B',
                border: '2px solid #2A2A55',
                boxShadow: '3px 3px 0px #08080F',
                color: '#C6FF00',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZoomOut size={16} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setManualZoom(false)
                setCustomZoom(1)
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                background: '#13132B',
                border: '2px solid #2A2A55',
                boxShadow: '3px 3px 0px #08080F',
                color: '#C6FF00',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RotateCcw size={16} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                marginLeft: '4px',
                background: '#FF2E7E',
                border: '2px solid #08080F',
                boxShadow: '3px 3px 0px #08080F',
                color: '#F5F0E8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

        {/* CANVAS AREA */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '32px 40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundImage: 'radial-gradient(circle, rgba(198,255,0,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            scrollBehavior: 'smooth',
          }}
        >
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                marginTop: '80px',
              }}
            >
              <LoadingDots />
              <p
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#C6FF00',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                Generating Workflow...
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                marginTop: '80px',
              }}
            >
              <AlertCircle size={32} color="#FF2E7E" strokeWidth={2} />
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '12px',
                  color: '#F5F0E8',
                  textAlign: 'center',
                  maxWidth: '360px',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </p>
            </motion.div>
          )}

          {data && !loading && (
            <motion.div
              style={{
                position: 'relative',
                width: canvasW,
                height: canvasH,
                transformOrigin: 'center center',
                scale: manualZoom ? customZoom : displayZoom,
                flexShrink: 0,
              }}
              animate={{ scale: manualZoom ? customZoom : displayZoom }}
              transition={{ duration: 0.25 }}
            >
              {/* SVG Arrows Layer */}
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {data.edges.map((edge, i) => (
                  <ElbowArrow
                    key={i}
                    from={edge.from}
                    to={edge.to}
                    positions={positions}
                    index={i}
                    nodes={data.nodes}
                  />
                ))}
              </svg>

              {/* Nodes Layer */}
              {data.nodes.map((node, i) => {
                const pos = positions[node.id]
                if (!pos) return null
                return (
                  <FlowNode
                    key={node.id}
                    node={node}
                    index={i}
                    x={pos.x}
                    y={pos.y}
                    w={pos.w}
                    h={pos.h}
                    isHovered={hoveredId === node.id}
                    onHover={setHoveredId}
                  />
                )
              })}
            </motion.div>
          )}
        </div>

        {/* LEGEND */}
        {data && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            style={{
              borderTop: '2px solid #2A2A55',
              padding: '12px 24px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              background: '#13132B',
              flexShrink: 0,
            }}
          >
            {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    background: cfg.gradient || cfg.bg,
                    border: `1.5px solid ${cfg.border}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#F5F0E8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {cfg.label}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
