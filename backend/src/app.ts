import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { HttpError } from './errors.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { apiLimiter, authLimiter, chatLimiter } from './middleware/rateLimit.js'
import appointmentRoutes from './routes/appointments.js'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chat.js'

export const app = express()
const allowedOrigins = new Set(config.frontendOrigins)

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }
    callback(new HttpError(403, 'This origin is not allowed.', 'origin_not_allowed'))
  },
}))
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())
app.use(pinoHttp({ redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers.set-cookie'] }))

app.get('/api/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1')
    response.json({ status: 'ok', database: 'connected', ai: config.mistralApiKey ? 'mistral' : 'fallback' })
  } catch (error) {
    next(new HttpError(503, 'Database is unavailable. Start PostgreSQL and run migrations.', 'database_unavailable'))
  }
})

app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/chat', chatLimiter, chatRoutes)
app.use(notFound)
app.use(errorHandler)
