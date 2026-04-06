import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from './db.js'
import { config } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = config.port
const jwtSecret = config.auth.jwtSecret
const brevoApiKey = config.brevo.apiKey
const brevoFromEmail = config.brevo.fromEmail
const brevoFromName = config.brevo.fromName
const frontendUrl = config.frontendUrl
const googleClientId = config.auth.googleClientId
const googleClientSecret = config.auth.googleClientSecret
const googleRedirectUri = config.auth.googleRedirectUri
const googleAuthUrl = config.auth.googleAuthUrl
const googleTokenUrl = config.auth.googleTokenUrl
const googleUserInfoUrl = config.auth.googleUserInfoUrl
const aresBaseUrl = config.integrations.aresBaseUrl
const isProduction = config.isProduction

type AuthPayload = {
  userId: number
}

type AuthContext = {
  userId: number
  isAdmin: boolean
}

const primaryAdminEmail = 'habatomas@gmail.com'

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateResetToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!brevoApiKey || !brevoFromEmail) {
    console.warn('Brevo is not configured. Skipping email send.')
    return false
  }

  return sendEmailBrevo(to, subject, html)
}

async function sendEmailBrevo(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: brevoFromName, email: brevoFromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Brevo send failed', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
    }

    return response.ok
  } catch (error) {
    console.error('Brevo email send failed:', error)
    return false
  }
}

app.use(cors())
app.use(express.json())

function createAuthToken(userId: number) {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' })
}

function getUserIdFromToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, jwtSecret) as AuthPayload
    return typeof payload.userId === 'number' ? payload.userId : null
  } catch {
    return null
  }
}

function getAuthUserId(req: express.Request): number | null {
  const authHeader = req.header('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice('Bearer '.length)
  return getUserIdFromToken(token)
}

async function getAuthContext(req: express.Request): Promise<AuthContext | null> {
  const userId = getAuthUserId(req)
  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true, isBlocked: true },
  })

  if (!user || user.isBlocked) {
    return null
  }

  return { userId: user.id, isAdmin: Boolean(user.isAdmin) }
}

function parseRequestedUserId(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

const registerSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
})

const googleCallbackSchema = z.object({
  code: z.string().min(1),
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid registration payload',
      issues: parsed.error.flatten(),
    })
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  })

  if (existing) {
    return res.status(409).json({ message: 'User already exists' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const verificationCode = generateVerificationCode()
  const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      displayName: parsed.data.email,
      passwordHash,
      isAdmin: parsed.data.email === primaryAdminEmail,
      verificationCode,
      verificationCodeExpires,
      isVerified: false,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      isAdmin: true,
    },
  })

  const verificationHtml = `
    <h2>Verify your email</h2>
    <p>Your verification code is: <strong>${verificationCode}</strong></p>
    <p>This code will expire in 15 minutes.</p>
  `

  const emailSent = await sendEmail(user.email, 'Verify your email', verificationHtml)

  return res.status(201).json({
    message: 'User created. Check your email for verification code.',
    user,
    verificationCode: !isProduction ? verificationCode : undefined,
    emailSent,
  })
})

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid login payload',
      issues: parsed.error.flatten(),
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  if (user.isBlocked) {
    return res.status(403).json({ message: 'Account is blocked' })
  }

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  if (!user.isVerified) {
    return res.status(403).json({ message: 'Email not verified' })
  }

  const loginUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: {
      id: true,
      email: true,
      displayName: true,
      isAdmin: true,
    },
  })

  const token = createAuthToken(loginUser.id)
  return res.json({
    token,
    user: loginUser,
  })
})

app.get('/api/auth/google/start', (_req, res) => {
  if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
    return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Google login is not configured yet')}`)
  }

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  return res.redirect(`${googleAuthUrl}?${params.toString()}`)
})

app.get('/api/auth/google/callback', async (req, res) => {
  if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
    return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Google login is not configured yet')}`)
  }

  const parsed = googleCallbackSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Missing Google authorization code')}`)
  }

  try {
    const tokenResponse = await fetch(googleTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: parsed.data.code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Google token exchange failed')}`)
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string }
    if (!tokenData.access_token) {
      return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Google access token is missing')}`)
    }

    const profileResponse = await fetch(googleUserInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Google profile fetch failed')}`)
    }

    const profile = (await profileResponse.json()) as {
      email?: string
      email_verified?: boolean | string
      verified_email?: boolean | string
      name?: string
    }

    const email = profile.email?.toLowerCase().trim()
    const emailVerified =
      profile.email_verified === true ||
      profile.email_verified === 'true' ||
      profile.verified_email === true ||
      profile.verified_email === 'true'

    if (!email || !emailVerified) {
      return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Google email is not verified')}`)
    }

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const passwordHash = await bcrypt.hash(generateResetToken(), 10)
      try {
        user = await prisma.user.create({
          data: {
            email,
            displayName: profile.name?.trim() || email,
            passwordHash,
            isAdmin: email === primaryAdminEmail,
            isVerified: true,
          },
        })
      } catch {
        // Race-safe fallback when account was created in parallel request.
        user = await prisma.user.findUnique({ where: { email } })
      }
    }

    if (!user) {
      return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Google account could not be created')}`)
    }

    if (user.isBlocked) {
      return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent('Account is blocked')}`)
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: profile.name?.trim() || email,
        isVerified: true,
        lastLoginAt: new Date(),
      },
    })

    const token = createAuthToken(user.id)
    return res.redirect(`${frontendUrl}/?google_token=${encodeURIComponent(token)}`)
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.error('Google callback failed:', error)
    return res.redirect(`${frontendUrl}/?google_error=${encodeURIComponent(`Google login failed: ${details}`)}`)
  }
})

app.get('/api/auth/me', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      isAdmin: true,
      isBlocked: true,
    },
  })

  if (!user || user.isBlocked) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  return res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
  })
})

app.get('/api/users', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  if (!auth.isAdmin) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      isAdmin: true,
    },
    orderBy: { email: 'asc' },
  })

  return res.json(users)
})

const verifyCodeSchema = z.object({
  email: z.email().toLowerCase(),
  code: z.string().length(6),
})

app.post('/api/auth/verify-code', async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (user.isVerified) {
    return res.status(400).json({ message: 'User already verified' })
  }

  if (!user.verificationCode || user.verificationCode !== parsed.data.code) {
    return res.status(401).json({ message: 'Invalid verification code' })
  }

  if (user.verificationCodeExpires && user.verificationCodeExpires < new Date()) {
    return res.status(401).json({ message: 'Verification code expired' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    },
  })

  const token = createAuthToken(user.id)
  return res.json({
    message: 'Email verified successfully',
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: Boolean(user.isAdmin),
    },
  })
})

const resendVerificationSchema = z.object({
  email: z.email().toLowerCase(),
})

app.post('/api/auth/resend-verification', async (req, res) => {
  const parsed = resendVerificationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (user.isVerified) {
    return res.status(400).json({ message: 'User already verified' })
  }

  const verificationCode = generateVerificationCode()
  const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCode,
      verificationCodeExpires,
    },
  })

  const verificationHtml = `
    <h2>Verify your email</h2>
    <p>Your verification code is: <strong>${verificationCode}</strong></p>
    <p>This code will expire in 15 minutes.</p>
  `

  const emailSent = await sendEmail(user.email, 'Verify your email', verificationHtml)

  return res.json({
    message: 'Verification code sent',
    verificationCode: !isProduction ? verificationCode : undefined,
    emailSent,
  })
})

const forgotPasswordSchema = z.object({
  email: z.email().toLowerCase(),
})

app.post('/api/auth/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (!user) {
    return res.json({ message: 'If user exists, reset email has been sent' })
  }

  const resetToken = generateResetToken()
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpires,
    },
  })

  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`
  const resetHtml = `
    <h2>Reset your password</h2>
    <p><a href="${resetLink}">Click here to reset your password</a></p>
    <p>Or use this link: ${resetLink}</p>
    <p>This link will expire in 1 hour.</p>
  `

  const emailSent = await sendEmail(user.email, 'Reset your password', resetHtml)

  return res.json({
    message: 'If user exists, reset email has been sent',
    resetToken: !isProduction ? resetToken : undefined,
    emailSent,
  })
})

const resetPasswordSchema = z.object({
  email: z.email().toLowerCase(),
  token: z.string().min(8),
  newPassword: z.string().min(6),
})

app.post('/api/auth/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' })
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (!user.resetToken || user.resetToken !== parsed.data.token) {
    return res.status(401).json({ message: 'Invalid reset token' })
  }

  if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
    return res.status(401).json({ message: 'Reset token expired' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
    },
  })

  const token = createAuthToken(user.id)
  return res.json({
    message: 'Password reset successfully',
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: Boolean(user.isAdmin),
    },
  })
})

const updateAccountSchema = z.object({
  bankAccount: z.string().trim().max(120).optional(),
  companyIc: z.string().trim().max(30).optional(),
  isVatPayer: z.boolean().optional(),
  requiresControlStatement: z.boolean().optional(),
  bankAccounts: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60).optional(),
        currency: z.string().trim().min(1).max(10),
        accountNumber: z.string().trim().min(1).max(120),
        label: z.string().trim().max(80).optional(),
      }),
    )
    .optional(),
  logoDataUrl: z.string().max(500000).optional(),
})

type StoredBankAccount = {
  id: string
  currency: string
  accountNumber: string
  label: string
}

function normalizeStoredBankAccounts(input: unknown): StoredBankAccount[] {
  if (!Array.isArray(input)) return []

  const entries: StoredBankAccount[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const currency = String(record.currency ?? '').trim().toUpperCase()
    const accountNumber = String(record.accountNumber ?? '').trim()
    if (!currency || !accountNumber) continue

    entries.push({
      id: String(record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      currency,
      accountNumber,
      label: String(record.label ?? '').trim(),
    })
  }

  return entries
}

function parseStoredBankAccounts(raw: string | null): StoredBankAccount[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as { bankAccounts?: unknown }
    if (parsed && typeof parsed === 'object' && 'bankAccounts' in parsed) {
      return normalizeStoredBankAccounts(parsed.bankAccounts)
    }
  } catch {
    // Legacy mode where bankAccount column stores a plain account number string.
  }

  return [{
    id: 'legacy-czk',
    currency: 'CZK',
    accountNumber: raw,
    label: '',
  }]
}

function parseStoredAccountProfile(raw: string | null): {
  bankAccounts: StoredBankAccount[]
  isVatPayer: boolean
  requiresControlStatement: boolean
} {
  const parsedAccounts = parseStoredBankAccounts(raw)
  if (!raw) {
    return {
      bankAccounts: parsedAccounts,
      isVatPayer: false,
      requiresControlStatement: false,
    }
  }

  try {
    const parsed = JSON.parse(raw) as {
      bankAccounts?: unknown
      isVatPayer?: unknown
      requiresControlStatement?: unknown
    }

    if (parsed && typeof parsed === 'object' && 'bankAccounts' in parsed) {
      return {
        bankAccounts: normalizeStoredBankAccounts(parsed.bankAccounts),
        isVatPayer: Boolean(parsed.isVatPayer),
        requiresControlStatement: Boolean(parsed.requiresControlStatement),
      }
    }
  } catch {
    // Legacy mode where bankAccount column stores a plain account number string.
  }

  return {
    bankAccounts: parsedAccounts,
    isVatPayer: false,
    requiresControlStatement: false,
  }
}

const documentStatusSchema = z.enum(['draft', 'approved'])

const upsertDocumentSchema = z.object({
  status: documentStatusSchema.optional(),
  fileName: z.string().trim().min(1).max(240),
  sourceType: z.enum(['pdf', 'image', 'manual']),
  supplierName: z.string().trim().max(240).optional().nullable(),
  supplierIc: z.string().trim().max(60).optional().nullable(),
  invoiceNumber: z.string().trim().max(120).optional().nullable(),
  bankAccount: z.string().trim().max(120).optional().nullable(),
  variableSymbol: z.string().trim().max(60).optional().nullable(),
  constantSymbol: z.string().trim().max(60).optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  currency: z.string().trim().max(10).optional(),
  baseAmount: z.number().finite().optional().nullable(),
  vatAmount: z.number().finite().optional().nullable(),
  totalAmount: z.number().finite().optional().nullable(),
  vatRate: z.number().finite().optional().nullable(),
  extractedText: z.string().max(200000).optional().nullable(),
})

app.get('/api/account', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bankAccount: true,
        logoDataUrl: true,
        companyIc: true,
      },
    })

    const safeRow = row ?? { bankAccount: null, logoDataUrl: null, companyIc: null }
    const storedProfile = parseStoredAccountProfile(safeRow.bankAccount)
    return res.json({
      bankAccount: storedProfile.bankAccounts[0]?.accountNumber ?? safeRow.bankAccount,
      bankAccounts: storedProfile.bankAccounts,
      isVatPayer: storedProfile.isVatPayer,
      requiresControlStatement: storedProfile.requiresControlStatement,
      logoDataUrl: safeRow.logoDataUrl,
      companyIc: safeRow.companyIc,
    })
  } catch {
    // Compatibility fallback when Prisma Client is stale or columns do not exist yet.
    return res.json({
      bankAccount: null,
      bankAccounts: [],
      isVatPayer: false,
      requiresControlStatement: false,
      logoDataUrl: null,
      companyIc: null,
    })
  }
})

app.put('/api/account', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = updateAccountSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid account payload' })
  }

  try {
    const normalizedAccounts = normalizeStoredBankAccounts(parsed.data.bankAccounts ?? [])
    const fallbackAccount = parsed.data.bankAccount?.trim() || normalizedAccounts[0]?.accountNumber || null
    const serializedBankAccounts = JSON.stringify({
      bankAccounts: normalizedAccounts,
      isVatPayer: Boolean(parsed.data.isVatPayer),
      requiresControlStatement: Boolean(parsed.data.isVatPayer) && Boolean(parsed.data.requiresControlStatement),
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        bankAccount: normalizedAccounts.length > 0 ? serializedBankAccounts : fallbackAccount,
        logoDataUrl: parsed.data.logoDataUrl || null,
        companyIc: parsed.data.companyIc || null,
      },
    })

    return res.json({
      bankAccount: fallbackAccount,
      bankAccounts: normalizedAccounts,
      isVatPayer: Boolean(parsed.data.isVatPayer),
      requiresControlStatement: Boolean(parsed.data.isVatPayer) && Boolean(parsed.data.requiresControlStatement),
      logoDataUrl: parsed.data.logoDataUrl || null,
      companyIc: parsed.data.companyIc || null,
    })
  } catch {
    return res.status(500).json({ message: 'Account storage is not ready yet' })
  }
})

app.get('/api/documents', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const statusQuery = req.query.status as string | undefined
  const parsedStatus = statusQuery ? documentStatusSchema.safeParse(statusQuery) : null
  if (statusQuery && !parsedStatus?.success) {
    return res.status(400).json({ message: 'Invalid status query' })
  }

  const requestedUserId = parseRequestedUserId(req.query.userId)
  const scopedUserId = auth.isAdmin ? requestedUserId : auth.userId

  const documents = await (prisma as any).receivedDocument.findMany({
    where: {
      ...(scopedUserId ? { userId: scopedUserId } : {}),
      ...(parsedStatus?.success ? { status: parsedStatus.data } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json(documents)
})

app.post('/api/documents', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = upsertDocumentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid document payload', issues: parsed.error.flatten() })
  }

  const document = await (prisma as any).receivedDocument.create({
    data: {
      userId,
      status: parsed.data.status ?? 'draft',
      fileName: parsed.data.fileName,
      sourceType: parsed.data.sourceType,
      supplierName: parsed.data.supplierName ?? null,
      supplierIc: parsed.data.supplierIc ?? null,
      invoiceNumber: parsed.data.invoiceNumber ?? null,
      bankAccount: parsed.data.bankAccount ?? null,
      variableSymbol: parsed.data.variableSymbol ?? null,
      constantSymbol: parsed.data.constantSymbol ?? null,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      currency: parsed.data.currency ?? 'CZK',
      baseAmount: parsed.data.baseAmount ?? null,
      vatAmount: parsed.data.vatAmount ?? null,
      totalAmount: parsed.data.totalAmount ?? null,
      vatRate: parsed.data.vatRate ?? null,
      extractedText: parsed.data.extractedText ?? null,
    },
  })

  return res.status(201).json(document)
})

app.put('/api/documents/:id', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid document id' })
  }

  const existing = await (prisma as any).receivedDocument.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ message: 'Document not found' })
  }

  const parsed = upsertDocumentSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid document payload', issues: parsed.error.flatten() })
  }

  const payload = parsed.data
  const document = await (prisma as any).receivedDocument.update({
    where: { id },
    data: {
      status: payload.status,
      fileName: payload.fileName,
      sourceType: payload.sourceType,
      supplierName: payload.supplierName,
      supplierIc: payload.supplierIc,
      invoiceNumber: payload.invoiceNumber,
      bankAccount: payload.bankAccount,
      variableSymbol: payload.variableSymbol,
      constantSymbol: payload.constantSymbol,
      issueDate: payload.issueDate === undefined ? undefined : payload.issueDate ? new Date(payload.issueDate) : null,
      dueDate: payload.dueDate === undefined ? undefined : payload.dueDate ? new Date(payload.dueDate) : null,
      currency: payload.currency,
      baseAmount: payload.baseAmount,
      vatAmount: payload.vatAmount,
      totalAmount: payload.totalAmount,
      vatRate: payload.vatRate,
      extractedText: payload.extractedText,
    },
  })

  return res.json(document)
})

app.delete('/api/documents/:id', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid document id' })
  }

  const existing = await (prisma as any).receivedDocument.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!existing || (!auth.isAdmin && existing.userId !== auth.userId)) {
    return res.status(404).json({ message: 'Document not found' })
  }

  await (prisma as any).receivedDocument.delete({ where: { id } })
  return res.status(204).end()
})

app.get('/api/invoices', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const status = (req.query.status as string) ?? 'draft'
  const requestedUserId = parseRequestedUserId(req.query.userId)
  const scopedUserId = auth.isAdmin ? requestedUserId : auth.userId
  const invoices = await prisma.invoice.findMany({
    where: {
      status,
      ...(scopedUserId ? { userId: scopedUserId } : {}),
    },
    include: {
      customer: true,
      items: {
        include: { project: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(invoices)
})

const createInvoiceSchema = z.object({
  customerId: z.number().int().positive(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  duePreset: z.enum(['14', '30', 'custom']).optional(),
  bankAccount: z.string().optional(),
  taxDate: z.string().datetime().optional(),
  constantSymbol: z.string().optional(),
  specificSymbol: z.string().optional(),
  variableSymbol: z.string().optional(),
  invoiceText: z.string().optional(),
  includeVat: z.boolean().optional(),
  vatRate: z.number().nonnegative().optional(),
  items: z.array(
    z.object({
      projectId: z.number().int().positive().optional(),
      days: z.number().positive().optional(),
      amount: z.number().positive(),
    }),
  ),
})

async function recomputeProjectUsage(userId: number) {
  const usedItems = await prisma.invoiceItem.findMany({
    where: {
      invoice: {
        userId,
        status: { in: ['unpaid', 'paid'] },
      },
      projectId: { not: null },
    },
    select: {
      projectId: true,
      days: true,
      amount: true,
    },
  })

  const usedByProject = new Map<number, { daysUsed: number; budgetUsed: number }>()
  for (const item of usedItems) {
    if (!item.projectId) continue
    const current = usedByProject.get(item.projectId) ?? { daysUsed: 0, budgetUsed: 0 }
    current.daysUsed += item.days ?? 0
    current.budgetUsed += item.amount
    usedByProject.set(item.projectId, current)
  }

  const projects = await prisma.project.findMany({ where: { userId } })
  for (const project of projects) {
    const usage = usedByProject.get(project.id) ?? { daysUsed: 0, budgetUsed: 0 }
    const archiveByDays =
      project.pricingMode === 'md' && typeof project.days === 'number' && usage.daysUsed >= project.days
    const archiveByBudget =
      project.pricingMode === 'budget' && typeof project.budget === 'number' && usage.budgetUsed >= project.budget

    await prisma.project.update({
      where: { id: project.id },
      data: {
        daysUsed: usage.daysUsed,
        budgetUsed: usage.budgetUsed,
        archived: archiveByDays || archiveByBudget,
      },
    })
  }
}

app.post('/api/invoices', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = createInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid invoice payload',
      issues: parsed.error.flatten(),
    })
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, userId },
    select: { id: true },
  })
  if (!customer) {
    return res.status(400).json({ message: 'Invalid customer for this user' })
  }

  const invoice = await prisma.invoice.create({
    data: {
      userId,
      customerId: parsed.data.customerId,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      duePreset: parsed.data.duePreset,
      bankAccount: parsed.data.bankAccount,
      taxDate: parsed.data.taxDate ? new Date(parsed.data.taxDate) : null,
      constantSymbol: parsed.data.constantSymbol,
      specificSymbol: parsed.data.specificSymbol,
      variableSymbol: parsed.data.variableSymbol,
      invoiceText: parsed.data.invoiceText,
      includeVat: parsed.data.includeVat ?? false,
      vatRate: parsed.data.vatRate,
      status: 'draft',
      items: {
        create: parsed.data.items.map((item) => ({
          projectId: item.projectId,
          days: item.days,
          amount: item.amount,
        })),
      },
    },
    include: { customer: true, items: { include: { project: true } } },
  })

  return res.status(201).json(invoice)
})

app.put('/api/invoices/:id', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  const parsed = createInvoiceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid invoice payload',
      issues: parsed.error.flatten(),
    })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  })
  if (!invoice || invoice.userId !== userId) {
    return res.status(404).json({ message: 'Invoice not found' })
  }
  if (invoice.status !== 'draft') {
    return res.status(400).json({ message: 'Only draft invoices can be edited' })
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      customerId: parsed.data.customerId,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      duePreset: parsed.data.duePreset,
      bankAccount: parsed.data.bankAccount,
      taxDate: parsed.data.taxDate ? new Date(parsed.data.taxDate) : null,
      constantSymbol: parsed.data.constantSymbol,
      specificSymbol: parsed.data.specificSymbol,
      variableSymbol: parsed.data.variableSymbol,
      invoiceText: parsed.data.invoiceText,
      includeVat: parsed.data.includeVat ?? false,
      vatRate: parsed.data.vatRate,
      items: {
        deleteMany: {},
        create: parsed.data.items.map((item) => ({
          projectId: item.projectId,
          days: item.days,
          amount: item.amount,
        })),
      },
    },
    include: { customer: true, items: { include: { project: true } } },
  })

  return res.json(updated)
})

app.patch('/api/invoices/:id/status', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  const statusParsed = z.object({ status: z.enum(['draft', 'unpaid', 'paid']) }).safeParse(req.body)
  if (!statusParsed.success) {
    return res.status(400).json({ message: 'Invalid status payload' })
  }
  const { status } = statusParsed.data

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
  })

  if (!auth.isAdmin && invoice.userId !== auth.userId) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status },
    include: { customer: true, items: { include: { project: true } } },
  })

  await recomputeProjectUsage(invoice.userId)

  return res.json(updated)
})

app.delete('/api/invoices/:id', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
  })

  if (!auth.isAdmin && invoice.userId !== auth.userId) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  if (!auth.isAdmin && invoice.status !== 'draft') {
    return res.status(400).json({ message: 'Only draft invoices can be deleted' })
  }

  await prisma.invoice.delete({ where: { id } })
  await recomputeProjectUsage(invoice.userId)
  return res.json({ ok: true })
})

// ---- ARES (Czech company registry) proxy ----

app.get('/api/ares/:ic', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  // Accept raw IC or DIC (e.g. CZ12345678 → 12345678)
  const raw = (req.params.ic ?? '').trim()
  const ic = raw.replace(/^[A-Za-z]+/, '').replace(/\D/g, '')

  if (!ic || ic.length < 6 || ic.length > 10) {
    return res.status(400).json({ message: 'Invalid IC format' })
  }

  type AresResponse = {
    ico?: string
    dic?: string
    obchodniJmeno?: string
    sidlo?: {
      textovaAdresa?: string
      nazevObce?: string
      psc?: number
      nazevUlice?: string
      cisloPopisne?: number
      cisloOrientacni?: number
    }
  }

  try {
    const aresRes = await fetch(`${aresBaseUrl}/${ic}`, { headers: { Accept: 'application/json' } })

    if (aresRes.status === 404) {
      return res.status(404).json({ message: 'Company not found' })
    }
    if (!aresRes.ok) {
      return res.status(502).json({ message: 'ARES lookup failed' })
    }

    const data = (await aresRes.json()) as AresResponse
    const sidlo = data.sidlo ?? {}

    let address = ''
    if (sidlo.nazevUlice && sidlo.cisloPopisne) {
      address = `${sidlo.nazevUlice} ${sidlo.cisloPopisne}`
      if (sidlo.cisloOrientacni) address += `/${sidlo.cisloOrientacni}`
    } else if (sidlo.textovaAdresa) {
      address = sidlo.textovaAdresa
    }

    const psc = sidlo.psc ? String(sidlo.psc).replace(/^(\d{3})(\d{2})$/, '$1 $2') : ''

    return res.json({
      ico: data.ico ?? ic,
      dic: data.dic ?? null,
      name: data.obchodniJmeno ?? null,
      address: address || null,
      city: sidlo.nazevObce ?? null,
      zip: psc || null,
      country: 'CZ',
    })
  } catch {
    return res.status(502).json({ message: 'ARES lookup failed' })
  }
})

// ---- Customers ----

const createCustomerSchema = z.object({
  name: z.string().min(1),
  ic: z.string().optional(),
  dic: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
})

app.get('/api/customers', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const customers = await prisma.customer.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })

  return res.json(customers)
})

app.post('/api/customers', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = createCustomerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid customer payload',
      issues: parsed.error.flatten(),
    })
  }

  const customer = await prisma.customer.create({
    data: { ...parsed.data, userId },
  })

  return res.status(201).json(customer)
})

app.delete('/api/customers/:id', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!customer || customer.userId !== userId) {
    return res.status(404).json({ message: 'Customer not found' })
  }

  try {
    await prisma.customer.delete({ where: { id } })
    return res.json({ ok: true })
  } catch {
    return res.status(400).json({
      message: 'Customer is still used by orders or invoices and cannot be deleted',
    })
  }
})

// ---- Orders ----

const createOrderSchema = z.object({
  customerId: z.number().int().positive(),
  title: z.string().min(1),
  code: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().default('CZK'),
})

app.get('/api/orders', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const archivedQuery = req.query.archived as string | undefined
  const archivedFilter = archivedQuery === 'true' ? true : archivedQuery === 'false' ? false : null
  const requestedUserId = parseRequestedUserId(req.query.userId)
  const scopedUserId = auth.isAdmin ? requestedUserId : auth.userId

  const orders = await prisma.order.findMany({
    where: scopedUserId ? { userId: scopedUserId } : {},
    include: {
      customer: true,
      projects: {
        select: {
          id: true,
          archived: true,
          pricingMode: true,
          days: true,
          daysUsed: true,
          budget: true,
          budgetUsed: true,
          currency: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const enrichedOrders = orders.map((order) => {
    const hasProjects = order.projects.length > 0
    const archived = hasProjects && order.projects.every((project) => project.archived)

    let mdTotal = 0
    let mdUsed = 0
    let budgetTotal = 0
    let budgetUsed = 0

    for (const project of order.projects) {
      if (project.pricingMode === 'md') {
        mdTotal += project.days ?? 0
        mdUsed += project.daysUsed ?? 0
      } else {
        budgetTotal += project.budget ?? 0
        budgetUsed += project.budgetUsed ?? 0
      }
    }

    return {
      id: order.id,
      userId: order.userId,
      customerId: order.customerId,
      customer: order.customer,
      title: order.title,
      code: order.code,
      amount: order.amount,
      currency: order.currency,
      createdAt: order.createdAt,
      archived,
      projectCount: order.projects.length,
      consumption: {
        mdUsed,
        mdTotal,
        budgetUsed,
        budgetTotal,
      },
    }
  })

  const filteredOrders =
    archivedFilter === null
      ? enrichedOrders
      : enrichedOrders.filter((order) => order.archived === archivedFilter)

  return res.json(filteredOrders)
})

app.post('/api/orders', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = createOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid order payload',
      issues: parsed.error.flatten(),
    })
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, userId },
    select: { id: true },
  })
  if (!customer) {
    return res.status(400).json({ message: 'Invalid customer for this user' })
  }

  const order = await prisma.order.create({
    data: {
      userId,
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      code: parsed.data.code,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
    },
    include: { customer: true },
  })

  return res.status(201).json(order)
})

app.delete('/api/orders/:id', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid order id' })
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!order || (!auth.isAdmin && order.userId !== auth.userId)) {
    return res.status(404).json({ message: 'Order not found' })
  }

  await prisma.order.delete({ where: { id } })
  await recomputeProjectUsage(order.userId)
  return res.json({ ok: true })
})

// ---- Projects ----

const createProjectSchema = z.object({
  orderId: z.number().int().positive(),
  name: z.string().min(1),
  pricingMode: z.enum(['md', 'budget']).default('md'),
  days: z.number().int().positive().optional(),
  budget: z.number().positive().optional(),
  mdRate: z.number().positive().optional(),
  currency: z.string().default('CZK'),
}).superRefine((value, ctx) => {
  if (value.pricingMode === 'md' && typeof value.days !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Days are required for MD mode',
      path: ['days'],
    })
  }

  if (value.pricingMode === 'md' && typeof value.mdRate !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'MD rate is required for MD mode',
      path: ['mdRate'],
    })
  }

  if (value.pricingMode === 'budget' && typeof value.budget !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Budget is required for budget mode',
      path: ['budget'],
    })
  }
})

const stockMovementTypeSchema = z.enum(['in', 'out', 'adjust_plus', 'adjust_minus'])

const createStockItemSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(20).default('ks'),
  minQuantity: z.number().min(0).default(0),
  isActive: z.boolean().optional(),
})

const updateStockItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  minQuantity: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

const createStockMovementSchema = z.object({
  stockItemId: z.number().int().positive(),
  type: stockMovementTypeSchema,
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  sourceType: z.string().trim().min(1).max(40).optional(),
  sourceRef: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(500).optional(),
})

function isStockStorageNotReadyError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return /stockitem|stockmovement|p2021|does not exist|doesn't exist|relation .* does not exist/i.test(message)
}

function isUniqueSkuError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

app.get('/api/projects', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const archived = req.query.archived === 'true'
  const requestedUserId = parseRequestedUserId(req.query.userId)
  const scopedUserId = auth.isAdmin ? requestedUserId : auth.userId

  const projects = await prisma.project.findMany({
    where: {
      archived,
      ...(scopedUserId ? { userId: scopedUserId } : {}),
    },
    include: { order: { include: { customer: true } } },
    orderBy: { name: 'asc' },
  })

  return res.json(projects)
})

app.post('/api/projects', async (req, res) => {
  const userId = getAuthUserId(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = createProjectSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid project payload',
      issues: parsed.error.flatten(),
    })
  }

  const linkedOrder = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, userId },
    select: { id: true },
  })
  if (!linkedOrder) {
    return res.status(400).json({ message: 'Invalid order for this user' })
  }

  const project = await prisma.project.create({
    data: { ...parsed.data, userId },
    include: { order: { include: { customer: true } } },
  })

  return res.status(201).json(project)
})

app.delete('/api/projects/:id', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid project id' })
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!project || (!auth.isAdmin && project.userId !== auth.userId)) {
    return res.status(404).json({ message: 'Project not found' })
  }

  await prisma.project.delete({ where: { id } })
  await recomputeProjectUsage(project.userId)
  return res.json({ ok: true })
})

// ---- Stock ----

app.get('/api/stock/items', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const requestedUserId = parseRequestedUserId(req.query.userId)
  const scopedUserId = auth.isAdmin ? requestedUserId : auth.userId

  try {
    const items = await prisma.stockItem.findMany({
      where: {
        ...(scopedUserId ? { userId: scopedUserId } : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    return res.json(items)
  } catch (error) {
    if (isStockStorageNotReadyError(error)) {
      return res.json([])
    }
    return res.status(500).json({ message: 'Could not load stock items' })
  }
})

app.post('/api/stock/items', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = createStockItemSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid stock item payload',
      issues: parsed.error.flatten(),
    })
  }

  const requestedUserId = parseRequestedUserId(req.query.userId)
  const ownerUserId = auth.isAdmin && requestedUserId ? requestedUserId : auth.userId

  try {
    const item = await prisma.stockItem.create({
      data: {
        userId: ownerUserId,
        sku: parsed.data.sku,
        name: parsed.data.name,
        unit: parsed.data.unit,
        minQuantity: parsed.data.minQuantity,
        isActive: parsed.data.isActive ?? true,
      },
    })
    return res.status(201).json(item)
  } catch (error) {
    if (isStockStorageNotReadyError(error)) {
      return res.status(503).json({ message: 'Stock storage is not ready yet. Run database migrations.' })
    }
    if (isUniqueSkuError(error)) {
      return res.status(400).json({ message: 'Stock item with this SKU already exists' })
    }
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.error('Stock item create failed:', error)
    return res.status(500).json({ message: `Could not save stock item: ${details}` })
  }
})

app.patch('/api/stock/items/:id', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid stock item id' })
  }

  const parsed = updateStockItemSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid stock item payload',
      issues: parsed.error.flatten(),
    })
  }

  try {
    const item = await prisma.stockItem.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!item || (!auth.isAdmin && item.userId !== auth.userId)) {
      return res.status(404).json({ message: 'Stock item not found' })
    }

    const updated = await prisma.stockItem.update({
      where: { id },
      data: parsed.data,
    })

    return res.json(updated)
  } catch (error) {
    if (isStockStorageNotReadyError(error)) {
      return res.status(503).json({ message: 'Stock storage is not ready yet. Run database migrations.' })
    }
    return res.status(500).json({ message: 'Could not update stock item' })
  }
})

app.get('/api/stock/movements', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const requestedUserId = parseRequestedUserId(req.query.userId)
  const scopedUserId = auth.isAdmin ? requestedUserId : auth.userId
  const itemId = Number(req.query.stockItemId)

  try {
    const movements = await prisma.stockMovement.findMany({
      where: {
        ...(scopedUserId ? { userId: scopedUserId } : {}),
        ...(Number.isFinite(itemId) && itemId > 0 ? { stockItemId: itemId } : {}),
      },
      include: {
        stockItem: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    })

    return res.json(movements)
  } catch (error) {
    if (isStockStorageNotReadyError(error)) {
      return res.json([])
    }
    return res.status(500).json({ message: 'Could not load stock movements' })
  }
})

app.post('/api/stock/movements', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const parsed = createStockMovementSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid stock movement payload',
      issues: parsed.error.flatten(),
    })
  }

  const requestedUserId = parseRequestedUserId(req.query.userId)
  const ownerUserId = auth.isAdmin && requestedUserId ? requestedUserId : auth.userId

  try {
    const existingItem = await prisma.stockItem.findFirst({
      where: { id: parsed.data.stockItemId, userId: ownerUserId },
    })

    if (!existingItem) {
      return res.status(404).json({ message: 'Stock item not found' })
    }

    const qty = parsed.data.quantity
    const prevQty = existingItem.quantityOnHand
    const prevAvg = existingItem.averageUnitCost
    const movementType = parsed.data.type

    const isIncoming = movementType === 'in' || movementType === 'adjust_plus'
    const isOutgoing = movementType === 'out' || movementType === 'adjust_minus'

    if (isOutgoing && prevQty < qty) {
      return res.status(400).json({ message: 'Insufficient stock. Negative stock is not allowed.' })
    }

    let resolvedUnitCost = parsed.data.unitCost ?? prevAvg
    let newQty = prevQty
    let newAvg = prevAvg

    if (isIncoming) {
      resolvedUnitCost = parsed.data.unitCost ?? prevAvg
      newQty = prevQty + qty
      const currentValue = prevQty * prevAvg
      const incomingValue = qty * resolvedUnitCost
      newAvg = newQty > 0 ? (currentValue + incomingValue) / newQty : 0
    }

    if (isOutgoing) {
      resolvedUnitCost = prevAvg
      newQty = prevQty - qty
      newAvg = newQty > 0 ? prevAvg : 0
    }

    const totalCost = qty * resolvedUnitCost

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.stockItem.update({
        where: { id: existingItem.id },
        data: {
          quantityOnHand: newQty,
          averageUnitCost: newAvg,
        },
      })

      const movement = await tx.stockMovement.create({
        data: {
          userId: ownerUserId,
          stockItemId: existingItem.id,
          type: movementType,
          quantity: qty,
          unitCost: resolvedUnitCost,
          totalCost,
          sourceType: parsed.data.sourceType || null,
          sourceRef: parsed.data.sourceRef || null,
          note: parsed.data.note || null,
        },
        include: {
          stockItem: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
            },
          },
        },
      })

      return { updatedItem, movement }
    })

    return res.status(201).json(result)
  } catch (error) {
    if (isStockStorageNotReadyError(error)) {
      return res.status(503).json({ message: 'Stock storage is not ready yet. Run database migrations.' })
    }
    return res.status(500).json({ message: 'Could not save stock movement' })
  }
})

app.get('/api/stock/alerts', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const requestedUserId = parseRequestedUserId(req.query.userId)
  const scopedUserId = auth.isAdmin ? requestedUserId : auth.userId

  try {
    const alerts = await prisma.stockItem.findMany({
      where: {
        ...(scopedUserId ? { userId: scopedUserId } : {}),
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })

    return res.json(alerts.filter((item) => item.quantityOnHand <= item.minQuantity))
  } catch (error) {
    if (isStockStorageNotReadyError(error)) {
      return res.json([])
    }
    return res.status(500).json({ message: 'Could not load stock alerts' })
  }
})

// ---- Admin ----

app.get('/api/admin/users', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth?.isAdmin) {
    return res.status(403).json({ message: 'Forbidden: admin access required' })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        isBlocked: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json(users)
  } catch (error) {
    return res.status(500).json({ message: 'Could not load users' })
  }
})

app.delete('/api/admin/users/:id', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth?.isAdmin) {
    return res.status(403).json({ message: 'Forbidden: admin access required' })
  }

  const userId = parseInt(req.params.id)
  const { confirm } = req.body as { confirm?: boolean }

  if (!confirm) {
    return res.status(400).json({ message: 'Confirmation required' })
  }

  try {
    // Prevent deleting yourself
    if (userId === auth.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' })
    }

    // Delete user (cascading deletes should handle related data)
    await prisma.user.delete({
      where: { id: userId },
    })

    return res.json({ message: 'User deleted successfully' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' })
    }
    return res.status(500).json({ message: 'Could not delete user' })
  }
})

app.post('/api/admin/users/:id/block', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth?.isAdmin) {
    return res.status(403).json({ message: 'Forbidden: admin access required' })
  }

  const userId = parseInt(req.params.id)
  const { blocked, confirm } = req.body as { blocked?: boolean; confirm?: boolean }

  if (!confirm) {
    return res.status(400).json({ message: 'Confirmation required' })
  }

  try {
    // Prevent blocking yourself
    if (userId === auth.userId) {
      return res.status(400).json({ message: 'Cannot block your own account' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: blocked ?? true },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        isBlocked: true,
      },
    })

    return res.json(updatedUser)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' })
    }
    return res.status(500).json({ message: 'Could not block user' })
  }
})

app.post('/api/admin/users/:id/reset-password', async (req, res) => {
  const auth = await getAuthContext(req)
  if (!auth?.isAdmin) {
    return res.status(403).json({ message: 'Forbidden: admin access required' })
  }

  const userId = parseInt(req.params.id)
  const { confirm } = req.body as { confirm?: boolean }

  if (!confirm) {
    return res.status(400).json({ message: 'Confirmation required' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).slice(2, 15)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpires: expiresAt,
      },
    })

    // Build reset link
    const baseUrl = req.headers['x-forwarded-proto']
      ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
      : `http://localhost:${port}`
    const resetLink = `${baseUrl}/?resetToken=${resetToken}`

    // Send reset email
    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}" style="background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
      <p>Or copy this link: ${resetLink}</p>
      <p>This link expires in 24 hours.</p>
    `

    const emailSent = await sendEmail(user.email, 'Password Reset Request', htmlContent)

    if (!emailSent) {
      return res.status(500).json({ message: 'User found but email could not be sent' })
    }

    return res.json({ message: 'Password reset email sent successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'Could not send reset email' })
  }
})

if (isProduction) {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`API running on ${config.appBaseUrl}`)
})
