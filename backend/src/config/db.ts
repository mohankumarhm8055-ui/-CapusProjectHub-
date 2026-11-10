import mongoose from 'mongoose'
import { config } from './env.js'

export class DatabaseUnavailableError extends Error {
  statusCode = 503
  code = 'DATABASE_UNAVAILABLE'

  constructor(
    message = 'Persistent storage (MongoDB) is currently unavailable. Please ensure MongoDB is running and try again.'
  ) {
    super(message)
    this.name = 'DatabaseUnavailableError'
  }
}

export let isConnectedToMongo = false
let lastConnectionError: string | undefined
let listenersRegistered = false

function registerMongooseListeners(): void {
  if (listenersRegistered) return
  listenersRegistered = true

  mongoose.connection.on('connected', () => {
    isConnectedToMongo = true
    lastConnectionError = undefined
  })

  mongoose.connection.on('reconnected', () => {
    isConnectedToMongo = true
    lastConnectionError = undefined
  })

  mongoose.connection.on('disconnected', () => {
    isConnectedToMongo = false
  })

  mongoose.connection.on('error', (err: any) => {
    isConnectedToMongo = mongoose.connection.readyState === 1
    lastConnectionError = err?.message || 'Unknown MongoDB connection error'
  })
}

export function isMongoConnected(): boolean {
  const connected = mongoose.connection.readyState === 1
  isConnectedToMongo = connected
  return connected
}

export function isInMemoryFallbackAllowed(): boolean {
  if (config.NODE_ENV === 'production') {
    return false
  }
  return config.ALLOW_INMEMORY_FALLBACK === 'true' || process.env.ALLOW_INMEMORY_FALLBACK === 'true'
}

export function assertPersistenceAvailable(context?: string): void {
  if (isMongoConnected()) return
  if (isInMemoryFallbackAllowed()) return
  const scope = context ? ` for ${context}` : ''
  throw new DatabaseUnavailableError(
    lastConnectionError
      ? `Persistent storage (MongoDB) is unavailable${scope}: ${lastConnectionError}`
      : `Persistent storage (MongoDB) is unavailable${scope}. In-memory fallback is disabled.`
  )
}

export function getDatabaseStatus(): {
  connected: boolean
  mode: 'mongodb' | 'in-memory-dev-fallback' | 'unavailable'
  persistent: boolean
  lastError?: string
} {
  const connected = isMongoConnected()
  if (connected) {
    return {
      connected: true,
      mode: 'mongodb',
      persistent: true,
    }
  }
  if (isInMemoryFallbackAllowed()) {
    return {
      connected: false,
      mode: 'in-memory-dev-fallback',
      persistent: false,
      lastError: lastConnectionError,
    }
  }
  return {
    connected: false,
    mode: 'unavailable',
    persistent: false,
    lastError: lastConnectionError || 'MongoDB is not connected',
  }
}

export async function connectDatabase(uriOverride?: string): Promise<boolean> {
  registerMongooseListeners()
  const uri = uriOverride || config.MONGODB_URI

  try {
    mongoose.set('strictQuery', true)
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    })
    isConnectedToMongo = mongoose.connection.readyState === 1
    lastConnectionError = undefined
    console.log(`[Database] Successfully connected to MongoDB (${mongoose.connection.name})`)
    return true
  } catch (err: any) {
    isConnectedToMongo = false
    lastConnectionError = err?.message || 'Connection failed'
    console.error(`[Database] MongoDB connection failed: ${lastConnectionError}`)

    if (config.NODE_ENV === 'production') {
      throw new DatabaseUnavailableError(
        `Production startup aborted: MongoDB is unreachable (${lastConnectionError}).`
      )
    }

    if (isInMemoryFallbackAllowed()) {
      console.warn(
        '[Database] Explicit development fallback enabled (ALLOW_INMEMORY_FALLBACK=true). Data will NOT persist across restarts.'
      )
    } else {
      console.error(
        '[Database] Persistent storage unavailable and in-memory fallback is disabled. Database-backed requests will return 503 DATABASE_UNAVAILABLE until MongoDB connects.'
      )
    }
    return false
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  isConnectedToMongo = false
}
