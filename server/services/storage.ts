import fs from 'fs/promises'
import path from 'path'
import { createHmac, timingSafeEqual } from 'crypto'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config'

const bucket = config.storage.bucket
const region = config.storage.region
const accessKeyId = config.storage.accessKeyId
const secretAccessKey = config.storage.secretAccessKey
const endpoint = config.storage.endpoint
const localPath = config.storage.localPath

function getClient(): S3Client | null {
  if (!bucket || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint ? { endpoint } : {}),
  })
}

const client = getClient()

function isLocalMode(): boolean {
  return !client && !!localPath
}

/** Sign a key+expires for local storage URLs (so Replicate can fetch without auth). */
function signLocalKey(key: string, expires: number): string {
  const secret = process.env.JWT_SECRET || 'change-me-in-production'
  const hmac = createHmac('sha256', secret)
  hmac.update(`${expires}\n${key}`)
  return hmac.digest('hex')
}

/** Verify token for local file URL. Returns true if valid. */
export function verifyLocalFileToken(key: string, token: string, expires: number): boolean {
  if (Math.floor(Date.now() / 1000) > expires) return false
  const expected = signLocalKey(key, expires)
  if (token.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

/** Upload buffer to S3 or local disk; returns storage key (e.g. uploads/userId/jobId.ext). */
export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (isLocalMode()) {
    const fullPath = path.join(localPath, key)
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(fullPath, body)
    return key
  }
  if (!client) throw new Error('Storage not configured. Set STORAGE_LOCAL_PATH or STORAGE_* / AWS_* env vars.')
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

/** Get a signed URL for reading the object (for Replicate or client download). */
export async function getSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (isLocalMode()) {
    const baseUrl = config.app.baseUrl || 'http://localhost:3001'
    const expires = Math.floor(Date.now() / 1000) + expiresIn
    const token = signLocalKey(key, expires)
    return `${baseUrl}/api/files?key=${encodeURIComponent(key)}&token=${token}&expires=${expires}`
  }
  if (!client) throw new Error('Storage not configured')
  const cmd = new GetObjectCommand({ Bucket: bucket!, Key: key })
  return getSignedUrl(client, cmd, { expiresIn })
}

/** Delete object by key. No-op if file missing (e.g. already deleted). */
export async function deleteObject(key: string): Promise<void> {
  if (isLocalMode()) {
    const fullPath = path.join(localPath, key)
    await fs.unlink(fullPath).catch(() => {})
    return
  }
  if (!client) return
  await client.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key })).catch(() => {})
}

export function isStorageConfigured(): boolean {
  return !!client || !!localPath
}
