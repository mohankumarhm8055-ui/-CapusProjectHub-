import express, { Express } from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import { getDatabaseStatus } from './config/db.js'
import authRoutes from './modules/auth/auth.routes.js'
import aiRoutes from './modules/ai/ai.routes.js'
import repositoryRoutes from './modules/repository/repository.routes.js'
import proposalRoutes from './modules/proposals/proposal.routes.js'
import connectionRoutes from './modules/connections/connection.routes.js'
import { errorHandler } from './middleware/error.middleware.js'

export function createApp(): Express {
  const app = express()

  // CORS configuration
  app.use(
    cors({
      origin: [config.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    })
  )

  // Request parsing with generous limits for audio recordings & documents
  app.use(express.json({ limit: '25mb' }))
  app.use(express.urlencoded({ extended: true, limit: '25mb' }))

  // Health check endpoint (includes persistence readiness)
  app.get('/health', (_req, res) => {
    const database = getDatabaseStatus()
    const ok = database.persistent || database.mode === 'in-memory-dev-fallback'
    res.status(ok ? 200 : 503).json({
      status: database.persistent
        ? 'ok'
        : database.mode === 'in-memory-dev-fallback'
        ? 'degraded'
        : 'unavailable',
      service: 'CampusProjectHub API',
      database,
      timestamp: new Date().toISOString(),
    })
  })

  // Authentication & session routes
  app.use('/api/auth', authRoutes)

  // Mount AI Project Mentor routes
  app.use('/api/ai', aiRoutes)

  // Mount Project Repository Intelligence Engine routes
  app.use('/api/repository', repositoryRoutes)

  // Mount Academic Proposal Generator routes
  app.use('/api/proposals', proposalRoutes)
  app.use('/api/ai/proposals', proposalRoutes)

  // Mount Senior-Junior Connection Intelligence routes
  app.use('/api/connections', connectionRoutes)

  // Standardized Error Handler
  app.use(errorHandler)

  return app
}
