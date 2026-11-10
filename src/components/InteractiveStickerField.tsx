import React, { useEffect, useRef } from 'react'

interface InteractiveStickerFieldProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

interface StickerConfig {
  id: string
  name: string
  width: number
  height: number
  zIndex: number
  bg: string
  border: string
  content: React.ReactNode
}

interface HistoryPoint {
  x: number
  y: number
  dist: number // distance from preceding point
}

interface StickerPhysics {
  x: number
  y: number
  angle: number
  opacity: number
  scale: number
  isRevealed: boolean
  entranceImpulse: number
}

export const InteractiveStickerField: React.FC<InteractiveStickerFieldProps> = ({
  containerRef,
}) => {
  // DOM element refs for all 12 stickers to update directly without React re-renders
  const stickerRefs = useRef<(HTMLDivElement | null)[]>([])

  // State & History buffers maintained in refs
  const historyRef = useRef<HistoryPoint[]>([])
  const physicsRef = useRef<StickerPhysics[]>([])
  const animFrameRef = useRef<number | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPointerActiveRef = useRef<boolean>(false)
  const isLoopRunningRef = useRef<boolean>(false)

  // Progressive sequential reveal tracking
  const movementStartTimeRef = useRef<number | null>(null)
  const totalDistanceMovedRef = useRef<number>(0)

  // 12 Stickers in exact sequence with +14% enhanced dimensions:
  // Cursor → React → GitHub → HTML5 → CSS3 → JavaScript → Node.js → Python → MongoDB → AI → TypeScript → Java → Docker
  const STICKERS: StickerConfig[] = [
    // 0. React (Leader sticker following directly behind cursor)
    {
      id: 'react',
      name: 'React',
      width: 90,
      height: 90,
      zIndex: 42,
      bg: 'bg-[#0B1526]',
      border: 'border-2 border-cyan-400/60 shadow-[0_18px_40px_rgba(6,182,212,0.38)]',
      content: (
        <svg className="w-14 h-14 text-[#61DAFB]" viewBox="-11.5 -10.23174 23 20.46348" fill="none">
          <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
          <g stroke="#61DAFB" strokeWidth="1">
            <ellipse rx="11" ry="4.2" />
            <ellipse rx="11" ry="4.2" transform="rotate(60)" />
            <ellipse rx="11" ry="4.2" transform="rotate(120)" />
          </g>
        </svg>
      ),
    },

    // 1. GitHub
    {
      id: 'github',
      name: 'GitHub',
      width: 110,
      height: 68,
      zIndex: 41,
      bg: 'bg-[#18181b]',
      border: 'border-2 border-white/25 shadow-[0_18px_40px_rgba(0,0,0,0.55)]',
      content: (
        <div className="flex items-center gap-1.5 px-3 text-white">
          <svg className="w-8 h-8 fill-white shrink-0" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="font-bold text-base tracking-tight">GitHub</span>
        </div>
      ),
    },

    // 2. HTML5
    {
      id: 'html5',
      name: 'HTML5',
      width: 84,
      height: 88,
      zIndex: 40,
      bg: 'bg-white',
      border: 'border-2 border-orange-500/40 shadow-[0_18px_40px_rgba(234,88,12,0.32)]',
      content: (
        <svg className="w-13 h-13" viewBox="0 0 512 512">
          <path fill="#E34F26" d="M71 460L30 0h452l-41 460-185 52z" />
          <path fill="#EF652A" d="M256 472l149-41 35-391H256v432z" />
          <path fill="#ECECEC" d="M256 176h-60l-4-45h64V88H140l12 133h104zm0 133h-58l-4-44h62v-45H144l12 134h100zm-53 79l-2-21h-44l6 64 93 26v-46z" />
          <path fill="#fff" d="M256 88v43h108l-10 112h-98v45h94l-9 101-85 24v46l131-36 18-202 4-45 4-45z" />
        </svg>
      ),
    },

    // 3. CSS3
    {
      id: 'css3',
      name: 'CSS3',
      width: 84,
      height: 88,
      zIndex: 39,
      bg: 'bg-white',
      border: 'border-2 border-blue-500/40 shadow-[0_18px_40px_rgba(37,99,235,0.32)]',
      content: (
        <svg className="w-13 h-13" viewBox="0 0 512 512">
          <path fill="#1572B6" d="M71 460L30 0h452l-41 460-185 52z" />
          <path fill="#33A9DC" d="M256 472l149-41 35-391H256v432z" />
          <path fill="#ECECEC" d="M256 176h-60l-4-45h64V88H140l12 133h104zm0 133h-58l-4-44h62v-45H144l12 134h100zm-53 79l-2-21h-44l6 64 93 26v-46z" />
          <path fill="#fff" d="M256 88v43h108l-10 112h-98v45h94l-9 101-85 24v46l131-36 18-202 4-45 4-45z" />
        </svg>
      ),
    },

    // 4. JavaScript
    {
      id: 'javascript',
      name: 'JavaScript',
      width: 84,
      height: 84,
      zIndex: 38,
      bg: 'bg-[#F7DF1E]',
      border: 'border-2 border-amber-300 shadow-[0_18px_40px_rgba(245,158,11,0.38)]',
      content: (
        <div className="w-full h-full p-2 flex flex-col justify-end items-end">
          <span className="font-black text-4xl text-black font-mono leading-none tracking-tighter">
            JS
          </span>
        </div>
      ),
    },

    // 5. Node.js
    {
      id: 'nodejs',
      name: 'Node.js',
      width: 104,
      height: 66,
      zIndex: 37,
      bg: 'bg-[#0E1B12]',
      border: 'border-2 border-green-500/40 shadow-[0_18px_40px_rgba(34,197,94,0.32)]',
      content: (
        <div className="flex items-center gap-1.5 px-2.5">
          <svg className="w-7 h-7 fill-[#5FA04E]" viewBox="0 0 24 24">
            <path d="M12 1.5l10.392 6v12L12 25.5 1.608 19.5v-12L12 1.5z" fill="#333333" />
            <path d="M12 2.887L2.809 8.196v10.608L12 24.113l9.191-5.309V8.196L12 2.887z" fill="#5FA04E" />
          </svg>
          <span className="font-bold text-lg text-white tracking-tight">node</span>
        </div>
      ),
    },

    // 6. Python
    {
      id: 'python',
      name: 'Python',
      width: 88,
      height: 88,
      zIndex: 36,
      bg: 'bg-white',
      border: 'border-2 border-slate-300 shadow-[0_18px_40px_rgba(59,130,246,0.28)]',
      content: (
        <svg className="w-13 h-13" viewBox="0 0 128 128">
          <path fill="#3776AB" d="M63.4 5.2c-23.3 0-21.8 10.1-21.8 10.1l.1 10.5h22.2v3.1H32.7S18 27.2 18 50.7c0 23.4 12.8 22.6 12.8 22.6h7.6v-10.7s-.4-12.8 12.6-12.8h21.6s12.2.2 12.2-11.8V17s1.8-11.8-21.4-11.8zm-11.9 6.8c2.4 0 4.4 2 4.4 4.4 0 2.4-2 4.4-4.4 4.4-2.4 0-4.4-2-4.4-4.4 0-2.4 2-4.4 4.4-4.4z" />
          <path fill="#FFD438" d="M64.6 122.8c23.3 0 21.8-10.1 21.8-10.1l-.1-10.5H64.1v-3.1h31.2s14.7 1.7 14.7-21.8c0-23.4-12.8-22.6-12.8-22.6h-7.6v10.7s.4 12.8-12.6 12.8H55.4s-12.2-.2-12.2 11.8V111s-1.8 11.8 21.4 11.8zm11.9-6.8c-2.4 0-4.4-2-4.4-4.4 0-2.4 2-4.4 4.4-4.4 2.4 0 4.4 2 4.4 4.4 0 2.4-2 4.4-4.4 4.4z" />
        </svg>
      ),
    },

    // 7. MongoDB
    {
      id: 'mongodb',
      name: 'MongoDB',
      width: 84,
      height: 88,
      zIndex: 35,
      bg: 'bg-[#061B10]',
      border: 'border-2 border-emerald-500/40 shadow-[0_18px_40px_rgba(16,185,129,0.32)]',
      content: (
        <svg className="w-11 h-13" viewBox="0 0 24 24">
          <path fill="#00ED64" d="M12 0c-.3 0-.6.2-.8.5C8.9 4.3 4 12.7 4 17.5 4 21.1 7.6 24 12 24s8-2.9 8-6.5c0-4.8-4.9-13.2-7.2-17C12.6.2 12.3 0 12 0zm.6 2.1c1.8 3.3 5.4 10.7 5.4 15.4 0 2.6-2.6 4.7-6 4.7V2.1z" />
          <path fill="#00684A" d="M12 2.1v20.1c-3.4 0-6-2.1-6-4.7 0-4.7 3.6-12.1 5.4-15.4h.6z" />
        </svg>
      ),
    },

    // 8. AI Symbol
    {
      id: 'ai-symbol',
      name: 'AI Symbol',
      width: 85,
      height: 85,
      zIndex: 34,
      bg: 'bg-gradient-to-tr from-[#3B0764] via-[#581C87] to-[#7C3AED]',
      border: 'border-2 border-purple-300/60 shadow-[0_18px_40px_rgba(147,51,234,0.42)]',
      content: (
        <div className="flex flex-col items-center justify-center p-1 text-white">
          <svg className="w-9 h-9 text-white animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.39 8.26L21 9.27L16.27 13.88L17.58 20.46L12 17.1L6.42 20.46L7.73 13.88L3 9.27L9.61 8.26L12 2Z" />
          </svg>
          <span className="text-[11px] font-black tracking-widest uppercase mt-0.5 text-purple-200">AI</span>
        </div>
      ),
    },

    // 9. TypeScript (New sticker)
    {
      id: 'typescript',
      name: 'TypeScript',
      width: 84,
      height: 84,
      zIndex: 33,
      bg: 'bg-[#3178C6]',
      border: 'border-2 border-sky-300/50 shadow-[0_18px_40px_rgba(49,120,198,0.4)]',
      content: (
        <div className="w-full h-full p-2 flex flex-col justify-end items-end">
          <span className="font-black text-4xl text-white font-mono leading-none tracking-tighter">
            TS
          </span>
        </div>
      ),
    },

    // 10. Java (New sticker)
    {
      id: 'java',
      name: 'Java',
      width: 86,
      height: 88,
      zIndex: 32,
      bg: 'bg-[#0E1524]',
      border: 'border-2 border-amber-500/50 shadow-[0_18px_40px_rgba(245,158,11,0.35)]',
      content: (
        <svg className="w-13 h-13" viewBox="0 0 24 24" fill="none">
          <path d="M8.2 18.5c2.2.2 4.5.2 6.7-.1 1.6-.2 2.9-.6 2.6-2-.3-1.5-1.7-1.7-3.1-1.9-2.2-.3-4.5-.3-6.7 0-1.6.2-3 .7-2.8 2.1.3 1.4 1.7 1.7 3.3 1.9z" fill="#5382A1"/>
          <path d="M12.9 14.2c1.3-.7 2.3-2 2.4-3.5 0-.3-.3-.5-.5-.5-.2 0-.4.1-.5.3-1 1.5-2.4 2.6-4 3.1-.2.1-.3.3-.2.5.1.2.3.3.5.2.8-.3 1.6-.6 2.3-1.1z" fill="#E76F00"/>
          <path d="M10.8 8.8c1-1.2 1.8-2.5 2.1-4 0-.3-.2-.5-.5-.5s-.4.1-.5.3c-.8 1.5-1.6 2.9-2.1 4.5-.1.2 0 .4.2.5.2.1.4.1.5-.1.1-.2.2-.4.3-.7z" fill="#E76F00"/>
          <path d="M16.3 16.7c.4 0 .7-.1 1.1-.2 1.2-.4 1.6-1.2 1-2.2-.6-.9-1.6-1.4-2.8-1.6-.3 0-.5.2-.5.5s.2.5.5.5c.9.2 1.6.6 2 1.1.4.6.1 1.1-.7 1.3-.4.1-.7.2-1.1.2-.3 0-.5.2-.5.5s.2.4.5.4z" fill="#5382A1"/>
        </svg>
      ),
    },

    // 11. Docker (New sticker)
    {
      id: 'docker',
      name: 'Docker',
      width: 104,
      height: 70,
      zIndex: 31,
      bg: 'bg-[#0B1E3B]',
      border: 'border-2 border-cyan-400/50 shadow-[0_18px_40px_rgba(36,150,237,0.38)]',
      content: (
        <svg className="w-13 h-13" viewBox="0 0 24 24" fill="#2496ED">
          <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.186.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.12a.186.186 0 00-.185.185v1.888c0 .102.084.185.186.185m-2.928 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H2.208a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185M23.79 10.96a4.89 4.89 0 00-1.78-.588c-.144-.035-.382-.047-.468-.047-.197 0-.582.073-.787.16-.388.163-.733.428-.99.76a4.135 4.135 0 00-.472.846c-.07.164-.177.534-.177.604 0 .02-.02.043-.04.043h-.42c-.08 0-.17-.035-.224-.093a.352.352 0 01-.082-.224v-.223c0-.663-.263-1.3-.733-1.768a2.535 2.535 0 00-1.77-.733h-.223a.35.35 0 00-.224.082.35.35 0 00-.094.224v.223c0 .185.034.37.093.543l.047.116c.07.163.07.256 0 .348-.07.094-.175.14-.291.14H1.36a.35.35 0 00-.35.35c.082 1.348.423 2.66 1.01 3.86a11.23 11.23 0 002.66 3.493c1.235 1.055 2.68 1.84 4.24 2.302a15.4 15.4 0 004.382.63c2.47 0 4.87-.59 7.025-1.73a14.28 14.28 0 004.97-4.493c.96-1.42 1.54-3.04 1.705-4.72a.35.35 0 00-.07-.27.35.35 0 00-.26-.11z"/>
        </svg>
      ),
    },
  ]

  // Initialize physics state once
  if (physicsRef.current.length === 0) {
    physicsRef.current = STICKERS.map(() => ({
      x: -500,
      y: -500,
      angle: 0,
      opacity: 0,
      scale: 0.75,
      isRevealed: false,
      entranceImpulse: 0,
    }))
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Spacing between consecutive stickers along the trajectory (88px adjusted for +14% size)
    const STICKER_SPACING = 88
    const BASE_OFFSET = 50 // Initial distance behind cursor for leader (React)
    const STAGGER_TIME_MS = 135 // Stagger interval (100–160ms)

    // Animation Loop
    const tick = () => {
      const history = historyRef.current
      const physics = physicsRef.current
      const isPointerActive = isPointerActiveRef.current
      const now = performance.now()
      const movementStart = movementStartTimeRef.current
      const totalDist = totalDistanceMovedRef.current

      let hasActiveSticker = false

      if (history.length > 0) {
        // Calculate cumulative arc-length distances along history
        // history[0] is current cursor head
        for (let i = 0; i < STICKERS.length; i++) {
          const p = physics[i]

          // Progressive reveal condition:
          // Sticker 0 activates on initial movement
          // Subsequent stickers activate sequentially based on elapsed time and trajectory distance
          let shouldBeRevealed = false
          if (isPointerActive && movementStart !== null) {
            const timeElapsed = now - movementStart
            const timeReady = timeElapsed >= i * STAGGER_TIME_MS
            const distanceReady = totalDist >= 15 + i * 40
            shouldBeRevealed = timeReady && distanceReady
          }

          // Trigger entrance animation when sticker unlocks
          if (shouldBeRevealed && !p.isRevealed) {
            p.isRevealed = true
            p.scale = 0.75 // Start entrance scale at 0.75
            // Slight rotation impulse during entrance (-12 to +12deg)
            p.entranceImpulse = (i % 2 === 0 ? 1 : -1) * 14
          }

          // If idle or deactivated
          if (!isPointerActive) {
            p.isRevealed = false
          }

          const targetOpacity = p.isRevealed ? 1 : 0
          const targetScale = p.isRevealed ? 1 : 0.75

          const targetDist = BASE_OFFSET + i * STICKER_SPACING

          // Find position at targetDist along the history path
          let accumulated = 0
          let targetX = history[0].x
          let targetY = history[0].y
          let dirX = 0
          let dirY = 0

          for (let k = 0; k < history.length - 1; k++) {
            const p1 = history[k]
            const p2 = history[k + 1]
            const segDist = p2.dist

            if (accumulated + segDist >= targetDist) {
              const t = segDist > 0 ? (targetDist - accumulated) / segDist : 0
              targetX = p1.x + (p2.x - p1.x) * t
              targetY = p1.y + (p2.y - p1.y) * t
              dirX = p1.x - p2.x
              dirY = p1.y - p2.y
              break
            }

            accumulated += segDist
            // If trail is shorter than target distance, clamp to the tail
            if (k === history.length - 2) {
              targetX = p2.x
              targetY = p2.y
              dirX = p1.x - p2.x
              dirY = p1.y - p2.y
            }
          }

          // Directional banking tilt
          let targetAngle = 0
          if (dirX !== 0 || dirY !== 0) {
            const heading = Math.atan2(dirY, dirX) * (180 / Math.PI)
            targetAngle = Math.max(-25, Math.min(25, heading * 0.35))
          }

          // Add entrance impulse rotation decay
          p.entranceImpulse *= 0.88
          const combinedAngle = targetAngle + p.entranceImpulse

          // Physics interpolation (spring smoothing)
          const lerpFactor = 0.28
          p.x += (targetX - p.x) * lerpFactor
          p.y += (targetY - p.y) * lerpFactor
          p.angle += (combinedAngle - p.angle) * 0.16

          // Smooth opacity and scale transition
          const opacityRate = p.isRevealed ? 0.16 : 0.09
          p.opacity += (targetOpacity - p.opacity) * opacityRate
          p.scale += (targetScale - p.scale) * 0.14

          if (!isPointerActive && p.opacity < 0.02) {
            p.opacity = 0
          }

          if (p.opacity > 0) {
            hasActiveSticker = true
          }

          // Update DOM node directly
          const el = stickerRefs.current[i]
          if (el) {
            const sticker = STICKERS[i]
            const tx = p.x - sticker.width / 2
            const ty = p.y - sticker.height / 2
            el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${p.angle}deg) scale(${p.scale})`
            el.style.opacity = `${p.opacity}`
            el.style.visibility = p.opacity > 0.005 ? 'visible' : 'hidden'
          }
        }
      }

      // If trail has completely faded out, safely clear state so next move starts fresh
      if (!isPointerActive && !hasActiveSticker && history.length > 0) {
        historyRef.current = []
        movementStartTimeRef.current = null
        totalDistanceMovedRef.current = 0
        physics.forEach(p => {
          p.isRevealed = false
          p.entranceImpulse = 0
        })
      }

      // Continue loop if active or still fading
      if (isPointerActive || hasActiveSticker) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        isLoopRunningRef.current = false
      }
    }

    const startLoop = () => {
      if (!isLoopRunningRef.current) {
        isLoopRunningRef.current = true
        animFrameRef.current = requestAnimationFrame(tick)
      }
    }

    // Pointer move handler across the entire hero container
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Bounds check: pointer within hero
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return
      }

      // Start movement clock if starting from idle
      if (!isPointerActiveRef.current || movementStartTimeRef.current === null) {
        movementStartTimeRef.current = performance.now()
        totalDistanceMovedRef.current = 0
      }

      isPointerActiveRef.current = true

      // Reset 900ms inactivity timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      idleTimerRef.current = setTimeout(() => {
        isPointerActiveRef.current = false
      }, 900)

      // Add to history if moved at least 3px
      const history = historyRef.current
      if (history.length === 0) {
        history.unshift({ x, y, dist: 0 })
        physicsRef.current.forEach(p => {
          p.x = x
          p.y = y
        })
      } else {
        const dx = x - history[0].x
        const dy = y - history[0].y
        const dist = Math.hypot(dx, dy)

        if (dist >= 3) {
          totalDistanceMovedRef.current += dist
          history.unshift({ x, y, dist })

          // Cap history length (~1350px total arc length for all 12 stickers)
          let totalDist = 0
          let cutIndex = history.length
          for (let k = 0; k < history.length; k++) {
            totalDist += history[k].dist
            if (totalDist > 1350) {
              cutIndex = k + 1
              break
            }
          }
          if (cutIndex < history.length) {
            history.length = cutIndex
          }
        }
      }

      startLoop()
    }

    // Pointer leaves hero -> fade out
    const handlePointerLeave = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      isPointerActiveRef.current = false
    }

    // Mobile touch events
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY } as PointerEvent)
      }
    }

    const handleTouchEnd = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      isPointerActiveRef.current = false
    }

    // Attach listeners
    container.addEventListener('pointermove', handlePointerMove, { passive: true })
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', handlePointerLeave)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [containerRef])

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-25 select-none"
      aria-hidden="true"
    >
      {STICKERS.map((sticker, idx) => (
        <div
          key={sticker.id}
          ref={el => {
            stickerRefs.current[idx] = el
          }}
          style={{
            width: sticker.width,
            height: sticker.height,
            zIndex: sticker.zIndex,
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: 'hidden',
            opacity: 0,
            willChange: 'transform, opacity',
          }}
          className={`flex items-center justify-center rounded-2xl ${sticker.bg} ${sticker.border} transition-shadow duration-200`}
        >
          {sticker.content}
        </div>
      ))}
    </div>
  )
}

export default InteractiveStickerField
