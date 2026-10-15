import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { HttpError } from '../errors.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()
const createAppointmentSchema = z.object({
  service: z.string().trim().min(2).max(100),
  clinician: z.string().trim().min(2).max(100),
  startsAt: z.string().datetime({ offset: true }).refine((value) => new Date(value).getTime() > Date.now(), 'Choose a future appointment time.'),
})

type AppointmentRow = {
  id: string
  service: string
  clinician: string
  starts_at: Date
  status: 'scheduled' | 'cancelled' | 'completed'
  created_at: Date
}

router.use(requireAuth)

router.get('/', async (request, response) => {
  const result = await pool.query<AppointmentRow>(
    `SELECT id, service, clinician, starts_at, status, created_at
     FROM appointments WHERE user_id = $1 AND business_id = $2
     ORDER BY starts_at ASC`,
    [request.authUser!.id, request.authUser!.businessId],
  )
  response.json({ appointments: result.rows.map(mapAppointment) })
})

router.post('/', validateBody(createAppointmentSchema), async (request, response, next) => {
  const { service, clinician, startsAt } = request.body as z.infer<typeof createAppointmentSchema>
  try {
    const result = await pool.query<AppointmentRow>(
      `INSERT INTO appointments (business_id, user_id, service, clinician, starts_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, service, clinician, starts_at, status, created_at`,
      [request.authUser!.businessId, request.authUser!.id, service, clinician, startsAt],
    )
    response.status(201).json({ appointment: mapAppointment(result.rows[0]) })
  } catch (error) {
    if (isUniqueViolation(error)) {
      next(new HttpError(409, 'That clinician is already booked at this time.', 'slot_unavailable'))
      return
    }
    next(error)
  }
})

router.patch('/:id/cancel', async (request, response, next) => {
  const id = z.string().uuid().safeParse(request.params.id)
  if (!id.success) {
    next(new HttpError(400, 'Appointment id must be a UUID.', 'validation_error'))
    return
  }
  const result = await pool.query<AppointmentRow>(
    `UPDATE appointments SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND business_id = $3 AND status = 'scheduled'
     RETURNING id, service, clinician, starts_at, status, created_at`,
    [id.data, request.authUser!.id, request.authUser!.businessId],
  )
  if (!result.rows[0]) {
    next(new HttpError(404, 'Scheduled appointment not found.', 'appointment_not_found'))
    return
  }
  response.json({ appointment: mapAppointment(result.rows[0]) })
})

function mapAppointment(row: AppointmentRow) {
  return {
    id: row.id,
    service: row.service,
    clinician: row.clinician,
    startsAt: new Date(row.starts_at).toISOString(),
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

export default router
