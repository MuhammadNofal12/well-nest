import { app } from './app.js'
import { config } from './config.js'
import { pool } from './db/pool.js'

const server = app.listen(config.port, async () => {
  try {
    await pool.query('SELECT 1')
    console.info(`Wellnest API listening on http://localhost:${config.port}`)
  } catch (error) {
    console.error('PostgreSQL is unavailable. Start the database, run migrations, then restart the API.', error)
    server.close(() => process.exit(1))
  }
})

async function shutdown() {
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
