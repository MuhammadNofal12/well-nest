import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config.js'
import { pool } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
})
const signInSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
})

type UserRow = { id: string; business_id: string; email: string; full_name: string; password_hash: string }

function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, fullName: user.full_name }
}

function setSessionCookie(response: Parameters<Parameters<typeof router.post>[1]>[1], userId: string) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' })
  response.cookie('wellnest_session', token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api',
  })
}

router.post('/signup', validateBody(signUpSchema), async (request, response, next) => {
  const { fullName, email, password } = request.body as z.infer<typeof signUpSchema>
  try {
    const business = await pool.query<{ id: string }>("SELECT id FROM businesses WHERE slug = 'wellnest-demo'")
    if (!business.rows[0]) throw new HttpError(503, 'The demo clinic is not initialized. Run the database seed command.', 'setup_required')
    const passwordHash = await bcrypt.hash(password, 12)
    const result = await pool.query<UserRow>(
      `INSERT INTO users (business_id, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, business_id, email, full_name, password_hash`,
      [business.rows[0].id, email, fullName, passwordHash],
    )
    setSessionCookie(response, result.rows[0].id)
    response.status(201).json({ user: publicUser(result.rows[0]) })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      next(new HttpError(409, 'An account with this email already exists.', 'email_in_use'))
      return
    }
    next(error)
  }
})

router.post('/login', validateBody(signInSchema), async (request, response, next) => {
  const { email, password } = request.body as z.infer<typeof signInSchema>
  try {
    const result = await pool.query<UserRow>(
      'SELECT id, business_id, email, full_name, password_hash FROM users WHERE email = $1 LIMIT 1',
      [email],
    )
    const user = result.rows[0]
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, 'Email or password is incorrect.', 'invalid_credentials')
    }
    setSessionCookie(response, user.id)
    response.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, (request, response) => {
  const user = request.authUser!
  response.json({ user: { id: user.id, email: user.email, fullName: user.fullName } })
})

router.post('/logout', (_request, response) => {
  response.clearCookie('wellnest_session', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/api',
  })
  response.status(204).end()
})

export default router
