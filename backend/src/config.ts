import 'dotenv/config'

const localJwtSecret = 'local-assessment-secret-change-before-deploy-2026'

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://wellnest:wellnest@localhost:5433/wellnest',
  frontendOrigins: (process.env.FRONTEND_URL ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET ?? localJwtSecret,
  cookieSecure: process.env.NODE_ENV === 'production',
  mistralApiKey: process.env.MISTRAL_API_KEY ?? '',
  mistralModel: process.env.MISTRAL_MODEL ?? 'mistral-small-latest',
  demoUserEmail: process.env.DEMO_USER_EMAIL ?? 'alex@example.test',
  demoUserPassword: process.env.DEMO_USER_PASSWORD ?? 'WellnestDemo2026!',
}

if (process.env.NODE_ENV === 'production' && (config.jwtSecret.length < 32 || config.jwtSecret === localJwtSecret)) {
  throw new Error('Set a unique JWT_SECRET of at least 32 characters in production.')
}
