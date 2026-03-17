import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config'

const bucket = config.storage.bucket
const region = config.storage.region
const accessKeyId = config.storage.accessKeyId
const secretAccessKey = config.storage.secretAccessKey
const endpoint = config.storage.endpoint

function getClient(): S3Client | null {
  if (!bucket || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint ? { endpoint } : {}),
  })
}

const client = getClient()

/** Upload buffer to S3; returns storage key (e.g. uploads/userId/jobId.ext). */
export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!client) throw new Error('Storage not configured. Set STORAGE_* or AWS_* env vars.')
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

/** Get a signed URL for reading the object (e.g. for Replicate or client download). */
export async function getSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!client) throw new Error('Storage not configured')
  const cmd = new GetObjectCommand({ Bucket: bucket!, Key: key })
  return getSignedUrl(client, cmd, { expiresIn })
}

export function isStorageConfigured(): boolean {
  return !!client
}
