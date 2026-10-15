import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { pool } from './pool.js'

const client = await pool.connect()

try {
  await client.query('BEGIN')
  const business = await client.query<{ id: string }>(
    `INSERT INTO businesses (name, slug)
     VALUES ('Wellnest Demo Clinic', 'wellnest-demo')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  )
  const businessId = business.rows[0].id
  const passwordHash = await bcrypt.hash(config.demoUserPassword, 12)
  const user = await client.query<{ id: string }>(
    `INSERT INTO users (business_id, email, full_name, password_hash)
     VALUES ($1, $2, 'Alex Morgan', $3)
     ON CONFLICT (business_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    [businessId, config.demoUserEmail.toLowerCase(), passwordHash],
  )
  const userId = user.rows[0].id

  for (const appointment of [
    { service: 'Annual wellness visit', clinician: 'Dr. Maya Chen', days: 4, hour: 9 },
    { service: 'Dental cleaning', clinician: 'Dr. James Wilson', days: 7, hour: 14 },
    { service: 'Nutrition consultation', clinician: 'Avery Patel, RD', days: 13, hour: 11 },
  ]) {
    const startsAt = new Date()
    startsAt.setDate(startsAt.getDate() + appointment.days)
    startsAt.setHours(appointment.hour, 0, 0, 0)
    await client.query(
      `INSERT INTO appointments (business_id, user_id, service, clinician, starts_at)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (
         SELECT 1 FROM appointments WHERE user_id = $2 AND service = $3 AND starts_at = $5
       )`,
      [businessId, userId, appointment.service, appointment.clinician, startsAt.toISOString()],
    )
  }

  await client.query('COMMIT')
  console.info(`Demo account ready: ${config.demoUserEmail} (password configured by DEMO_USER_PASSWORD).`)
} catch (error) {
  await client.query('ROLLBACK')
  console.error('Database seed failed:', error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
