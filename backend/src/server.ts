import { createApp } from './app.js'
import { config } from './config/env.js'
import { connectDatabase } from './config/db.js'
import { seedRepository } from './modules/repository/repository.seeder.js'
import { seedMentorProfiles } from './modules/connections/connection.model.js'
import { seedCollegeTemplates } from './modules/proposals/template.model.js'

async function bootstrap() {
  // Connect to Database (or initialize explicit non-production fallback store)
  await connectDatabase()

  // Seed repository, mentor profiles, and college templates into persistent storage
  await seedRepository()
  await seedMentorProfiles()
  await seedCollegeTemplates()

  const app = createApp()

  const server = app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`[CampusProjectHub Backend] Server listening on http://127.0.0.1:${config.PORT} (0.0.0.0:${config.PORT})`)
    console.log(`[CampusProjectHub Backend] AI Project Mentor endpoints ready at http://127.0.0.1:${config.PORT}/api/ai`)
  })

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('[CampusProjectHub Backend] Shutting down server gracefully...')
    server.close(() => {
      console.log('[CampusProjectHub Backend] Closed out remaining connections.')
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

bootstrap().catch((err) => {
  console.error('[CampusProjectHub Backend] Fatal startup error:', err)
  process.exit(1)
})
