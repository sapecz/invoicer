type NumberLike = string | undefined

function toNumber(value: NumberLike, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const port = toNumber(process.env.PORT, 3011)
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5174'
const appBaseUrl = process.env.APP_BASE_URL ?? `http://localhost:${port}`

export const config = {
  port,
  appBaseUrl,
  frontendUrl,
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    googleRedirectUri:
      process.env.GOOGLE_REDIRECT_URI ?? `${appBaseUrl}/api/auth/google/callback`,
    googleAuthUrl:
      process.env.GOOGLE_AUTH_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth',
    googleTokenUrl:
      process.env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token',
    googleUserInfoUrl:
      process.env.GOOGLE_USERINFO_URL ?? 'https://openidconnect.googleapis.com/v1/userinfo',
  },
  mailgun: {
    domain: process.env.MAILGUN_DOMAIN ?? '',
    apiKey: process.env.MAILGUN_API_KEY ?? '',
    apiBaseUrl: process.env.MAILGUN_API_BASE_URL ?? 'https://api.mailgun.net',
    fromEmail: process.env.MAILGUN_FROM_EMAIL ?? '',
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY ?? '',
    fromEmail: process.env.BREVO_FROM_EMAIL ?? '',
    fromName: process.env.BREVO_FROM_NAME ?? 'Invoicer',
  },
  integrations: {
    aresBaseUrl:
      process.env.ARES_API_BASE_URL ??
      'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty',
    qrApiBaseUrl:
      process.env.QR_API_BASE_URL ?? 'https://api.qrserver.com/v1/create-qr-code/',
  },
  isProduction: process.env.NODE_ENV === 'production',
} as const
