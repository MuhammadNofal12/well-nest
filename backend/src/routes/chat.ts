import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { generateAssistantReply, type ChatTurn } from '../services/ai.js'

const router = Router()
const sessionSchema = z.object({ title: z.string().trim().min(1).max(100).optional() })
const messageSchema = z.object({ content: z.string().trim().min(1).max(4000) })

router.use(requireAuth)

router.get('/sessions/current', async (request, response) => {
  const values = [request.authUser!.id, request.authUser!.businessId]
  const existing = await pool.query<{ id: string; title: string; created_at: Date; updated_at: Date }>(
    `SELECT id, title, created_at, updated_at FROM chat_sessions
     WHERE user_id = $1 AND business_id = $2 ORDER BY updated_at DESC LIMIT 1`,
    values,
  )
  if (existing.rows[0]) {
    response.json({ session: mapSession(existing.rows[0]) })
    return
  }
  const created = await pool.query<{ id: string; title: string; created_at: Date; updated_at: Date }>(
    `INSERT INTO chat_sessions (business_id, user_id, title)
     VALUES ($1, $2, 'Appointment planning') RETURNING id, title, created_at, updated_at`,
    [request.authUser!.businessId, request.authUser!.id],
  )
  response.status(201).json({ session: mapSession(created.rows[0]) })
})

router.post('/sessions', validateBody(sessionSchema), async (request, response) => {
  const { title } = request.body as z.infer<typeof sessionSchema>
  const result = await pool.query(
    `INSERT INTO chat_sessions (business_id, user_id, title)
     VALUES ($1, $2, $3) RETURNING id, title, created_at, updated_at`,
    [request.authUser!.businessId, request.authUser!.id, title ?? 'Appointment planning'],
  )
  response.status(201).json({ session: mapSession(result.rows[0]) })
})

router.get('/sessions/:sessionId/messages', async (request, response, next) => {
  const session = await findOwnedSession(String(request.params.sessionId), request.authUser!.id, request.authUser!.businessId)
  if (!session) {
    next(new HttpError(404, 'Conversation not found.', 'session_not_found'))
    return
  }
  const result = await pool.query(
    `SELECT id, role, content, created_at
     FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [session.id],
  )
  response.json({ messages: result.rows.map(mapMessage) })
})

router.post('/sessions/:sessionId/messages', validateBody(messageSchema), async (request, response, next) => {
  const session = await findOwnedSession(String(request.params.sessionId), request.authUser!.id, request.authUser!.businessId)
  if (!session) {
    next(new HttpError(404, 'Conversation not found.', 'session_not_found'))
    return
  }
  const { content } = request.body as z.infer<typeof messageSchema>
  const userMessage = await pool.query(
    `INSERT INTO chat_messages (session_id, role, content)
     VALUES ($1, 'user', $2) RETURNING id, role, content, created_at`,
    [session.id, content],
  )
  const historyResult = await pool.query<{ role: 'user' | 'assistant'; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, created_at FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at DESC LIMIT 12
     ) recent ORDER BY created_at ASC`,
    [session.id],
  )
  const assistant = await generateAssistantReply(historyResult.rows as ChatTurn[])
  const assistantMessage = await pool.query(
    `INSERT INTO chat_messages (session_id, role, content, ai_provider, extracted_intent)
     VALUES ($1, 'assistant', $2, $3, $4) RETURNING id, role, content, created_at`,
    [session.id, assistant.reply, assistant.provider, assistant.bookingIntent],
  )
  await pool.query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [session.id])
  request.log.info({ provider: assistant.provider, requiresForm: assistant.requiresForm, hasIntent: Boolean(assistant.bookingIntent) }, 'AI response generated')
  response.status(201).json({
    userMessage: mapMessage(userMessage.rows[0]),
    assistantMessage: mapMessage(assistantMessage.rows[0]),
    bookingIntent: assistant.bookingIntent,
    requiresForm: assistant.requiresForm,
    provider: assistant.provider,
  })
})

async function findOwnedSession(sessionId: string, userId: string, businessId: string) {
  const parsedId = z.string().uuid().safeParse(sessionId)
  if (!parsedId.success) return null
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2 AND business_id = $3',
    [parsedId.data, userId, businessId],
  )
  return result.rows[0] ?? null
}

function mapSession(row: { id: string; title: string; created_at: Date; updated_at: Date }) {
  return { id: row.id, title: row.title, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() }
}

function mapMessage(row: { id: string; role: 'user' | 'assistant'; content: string; created_at: Date }) {
  return { id: row.id, role: row.role, content: row.content, createdAt: new Date(row.created_at).toISOString() }
}

export default router
