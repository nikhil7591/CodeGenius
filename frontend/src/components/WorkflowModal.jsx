import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { X, GitBranch, Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const API_BASE = '/api'

// ─── Node type config ────────────────────────────────────────────────────────
const NODE_TYPES = {
    entry: { color: '#06FDD8', bg: 'rgba(6,253,216,0.12)', border: '#06FDD8', glow: 'rgba(6,253,216,0.4)', shape: 'pill' },
    output: { color: '#00D4FF', bg: 'rgba(0,212,255,0.12)', border: '#00D4FF', glow: 'rgba(0,212,255,0.4)', shape: 'pill' },
    process: { color: '#9D4EDD', bg: 'rgba(157,78,221,0.12)', border: '#9D4EDD', glow: 'rgba(157,78,221,0.4)', shape: 'rect' },
    decision: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', glow: 'rgba(245,158,11,0.4)', shape: 'diamond' },
    database: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: '#8B5CF6', glow: 'rgba(139,92,246,0.4)', shape: 'rect' },
    api: { color: '#EC4899', bg: 'rgba(236,72,153,0.12)', border: '#EC4899', glow: 'rgba(236,72,153,0.4)', shape: 'rect' },
}

// ─── Single animated node ─────────────────────────────────────────────────────
const FlowNode = ({ node, index, x, y, width = 200, onHover, isHovered }) => {
    const cfg = NODE_TYPES[node.type] || NODE_TYPES.process
    const baseDelay = index * 0.12

    const borderRadius = cfg.shape === 'pill' ? '999px' : '16px'

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: baseDelay, duration: 0.5, type: 'spring', stiffness: 200, damping: 18 }}
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width,
                transform: 'translateX(-50%)',
                zIndex: isHovered ? 10 : 2,
                cursor: 'pointer',
            }}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
        >
            {/* 3D layered shadow for cartoon depth */}
            <div style={{
                position: 'absolute', inset: 0,
                borderRadius,
                background: cfg.border,
                transform: 'translate(5px, 6px)',
                opacity: 0.3,
                filter: 'blur(2px)',
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                borderRadius,
                background: cfg.border,
                transform: 'translate(3px, 4px)',
                opacity: 0.2,
            }} />

            {/* Main node face */}
            <motion.div
                animate={isHovered
                    ? { scale: 1.06, y: -4 }
                    : { scale: [1, 1.015, 1], y: [0, -3, 0] }
                }
                transition={isHovered
                    ? { duration: 0.2 }
                    : { repeat: Infinity, duration: 3 + index * 0.4, ease: 'easeInOut', delay: index * 0.2 }
                }
                style={{
                    position: 'relative',
                    background: cfg.bg,
                    border: `2.5px solid ${cfg.border}`,
                    borderRadius,
                    padding: cfg.shape === 'pill' ? '12px 22px' : '14px 18px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: isHovered
                        ? `0 0 32px ${cfg.glow}, 0 0 60px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`
                        : `0 0 16px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                    transition: 'box-shadow 0.3s',
                }}
            >
                {/* Shine line — cartoon highlight */}
                <div style={{
                    position: 'absolute', top: '6px', left: '12px', right: '12px', height: '2px',
                    borderRadius: '2px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                }} />

                {/* Type badge */}
                <div style={{
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: cfg.color, marginBottom: '5px', opacity: 0.85,
                }}>
                    {node.type}
                </div>

                {/* Label */}
                <div style={{
                    fontSize: '13px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3,
                    textShadow: `0 0 12px ${cfg.glow}`,
                }}>
                    {node.label}
                </div>

                {/* Description — shown on hover */}
                <AnimatePresence>
                    {isHovered && node.description && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, overflow: 'hidden' }}
                        >
                            {node.description}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}

// ─── Animated SVG connector arrow ────────────────────────────────────────────
const FlowArrow = ({ x1, y1, x2, y2, index, color = '#9D4EDD' }) => {
    const midY = (y1 + y2) / 2
    const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`

    return (
        <motion.g>
            {/* Glow layer */}
            <motion.path
                d={path} fill="none" stroke={color} strokeWidth={3}
                strokeOpacity={0.3} filter="url(#arrowGlow)"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 + index * 0.12, duration: 0.6, ease: 'easeOut' }}
            />
            {/* Main line */}
            <motion.path
                d={path} fill="none" stroke={color} strokeWidth={2}
                strokeOpacity={0.85}
                strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 + index * 0.12, duration: 0.6, ease: 'easeOut' }}
            />
            {/* Arrowhead */}
            <motion.polygon
                points={`${x2},${y2} ${x2 - 6},${y2 - 10} ${x2 + 6},${y2 - 10}`}
                fill={color}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.12, duration: 0.2 }}
                style={{ transformOrigin: `${x2}px ${y2}px` }}
            />
            {/* Animated traveling dot */}
            <motion.circle r={4} fill={color}
                animate={{ offsetDistance: ['0%', '100%'] }}
                style={{ offsetPath: `path("${path}")`, offsetrotate: 'auto' }}
                transition={{ delay: 0.9 + index * 0.12, duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
        </motion.g>
    )
}

// ─── Layout engine: arrange nodes in a vertical flow ─────────────────────────
const layoutNodes = (nodes, canvasWidth) => {
    const nodeWidth = Math.min(220, canvasWidth * 0.55)
    const nodeHeight = 90
    const gapY = 60
    const colGap = nodeWidth + 50

    // Split into columns if > 5 nodes
    const useColumns = nodes.length > 5
    const positions = {}

    if (useColumns) {
        const half = Math.ceil(nodes.length / 2)
        nodes.forEach((n, i) => {
            const col = i < half ? 0 : 1
            const row = col === 0 ? i : i - half
            positions[n.id] = {
                x: canvasWidth / 2 + (col === 0 ? -colGap / 2 : colGap / 2),
                y: 40 + row * (nodeHeight + gapY),
                width: nodeWidth,
            }
        })
    } else {
        nodes.forEach((n, i) => {
            positions[n.id] = {
                x: canvasWidth / 2,
                y: 40 + i * (nodeHeight + gapY),
                width: nodeWidth,
            }
        })
    }

    return positions
}

// ─── Main WorkflowModal ───────────────────────────────────────────────────────
export const WorkflowModal = ({ repoName, onClose }) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [hoveredId, setHoveredId] = useState(null)
    const [zoom, setZoom] = useState(1)
    const canvasRef = useRef(null)
    const canvasWidth = 780

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

    const positions = data ? layoutNodes(data.nodes, canvasWidth) : {}

    // Total canvas height
    const maxY = Object.values(positions).reduce((m, p) => Math.max(m, p.y + 110), 200)
    const svgHeight = maxY

    const getNodeColor = (nodeId) => {
        const node = data?.nodes.find(n => n.id === nodeId)
        return node ? (NODE_TYPES[node.type]?.border || '#9D4EDD') : '#9D4EDD'
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(4, 4, 12, 0.92)',
                backdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Header */}
            <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                    width: '100%', maxWidth: '900px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 28px 16px',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #06FDD8, #9D4EDD)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(6,253,216,0.3)',
                    }}>
                        <GitBranch size={20} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '18px', lineHeight: 1.2 }}>
                            Workflow Flowchart
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                            {repoName}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Zoom controls */}
                    <button onClick={() => setZoom(z => Math.min(z + 0.15, 1.8))}
                        style={{ padding: '7px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                        <ZoomIn size={15} />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
                        style={{ padding: '7px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                        <ZoomOut size={15} />
                    </button>
                    <button onClick={() => setZoom(1)}
                        style={{ padding: '7px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                        <RotateCcw size={15} />
                    </button>
                    <button onClick={onClose}
                        style={{
                            padding: '8px', borderRadius: '10px', marginLeft: '4px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                            color: '#ef4444', cursor: 'pointer',
                            display: 'flex', alignItems: 'center',
                        }}>
                        <X size={18} />
                    </button>
                </div>
            </motion.div>

            {/* Canvas */}
            <div style={{
                flex: 1, overflow: 'auto', width: '100%',
                display: 'flex', justifyContent: 'center',
                padding: '0 24px 32px',
            }}>
                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#64748b', marginTop: '80px' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                            <Loader2 size={32} color="#9D4EDD" />
                        </motion.div>
                        <span style={{ fontSize: '14px' }}>Generating workflow...</span>
                    </div>
                )}

                {error && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#ef4444', marginTop: '80px' }}>
                        <AlertCircle size={32} />
                        <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', maxWidth: '360px' }}>{error}</p>
                    </div>
                )}

                {data && !loading && (
                    <motion.div
                        style={{
                            position: 'relative',
                            width: canvasWidth,
                            minHeight: svgHeight + 60,
                            transformOrigin: 'top center',
                            scale: zoom,
                            flexShrink: 0,
                        }}
                        animate={{ scale: zoom }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Grid pattern background */}
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.12 }}
                            xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#9D4EDD" strokeWidth="0.5" />
                                </pattern>
                                <filter id="arrowGlow">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>

                        {/* SVG arrows */}
                        <svg
                            style={{ position: 'absolute', inset: 0, width: '100%', height: svgHeight + 60, pointerEvents: 'none', overflow: 'visible' }}
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <filter id="arrowGlow">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            {data.edges.map((edge, i) => {
                                const from = positions[edge.from]
                                const to = positions[edge.to]
                                if (!from || !to) return null
                                const fromNode = data.nodes.find(n => n.id === edge.from)
                                const color = fromNode ? (NODE_TYPES[fromNode.type]?.border || '#9D4EDD') : '#9D4EDD'
                                return (
                                    <FlowArrow
                                        key={i}
                                        x1={from.x} y1={from.y + 80}
                                        x2={to.x} y2={to.y}
                                        index={i}
                                        color={color}
                                    />
                                )
                            })}
                        </svg>

                        {/* Nodes */}
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
                                    width={pos.width}
                                    onHover={setHoveredId}
                                    isHovered={hoveredId === node.id}
                                />
                            )
                        })}
                    </motion.div>
                )}
            </div>

            {/* Legend */}
            {data && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                    style={{
                        display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center',
                        padding: '12px 24px 20px',
                        borderTop: '1px solid rgba(42,42,85,0.4)',
                        width: '100%',
                    }}
                >
                    {Object.entries(NODE_TYPES).map(([type, cfg]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '3px', background: cfg.bg, border: `1.5px solid ${cfg.border}` }} />
                            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{type}</span>
                        </div>
                    ))}
                </motion.div>
            )}
        </motion.div>
    )
}
