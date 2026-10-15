import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { HttpError } from '../errors.js'
import { pool } from '../db/pool.js'

type SessionClaims = jwt.JwtPayload & { sub: string }

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const token = request.cookies?.wellnest_session as string | undefined
  if (!token) {
    next(new HttpError(401, 'Sign in to continue.', 'unauthenticated'))
    return
  }

  let claims: SessionClaims
  try {
    claims = jwt.verify(token, config.jwtSecret) as SessionClaims
  } catch {
    next(new HttpError(401, 'Your session is no longer valid. Sign in again.', 'invalid_session'))
    return
  }

  if (typeof claims.sub !== 'string') {
    next(new HttpError(401, 'Your session is no longer valid. Sign in again.', 'invalid_session'))
    return
  }

  try {
    const result = await pool.query<{
      id: string
      business_id: string
      email: string
      full_name: string
    }>('SELECT id, business_id, email, full_name FROM users WHERE id = $1', [claims.sub])
    const user = result.rows[0]
    if (!user) {
      next(new HttpError(401, 'Your session is no longer valid. Sign in again.', 'invalid_session'))
      return
    }
    request.authUser = {
      id: user.id,
      businessId: user.business_id,
      email: user.email,
      fullName: user.full_name,
    }
    next()
  } catch (error) {
    next(error)
  }
}
