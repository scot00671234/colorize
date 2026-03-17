import { pool } from '../db'
import { getSignedReadUrl } from './storage'
import { uploadBuffer } from './storage'
import { runColorize } from './replicate'

export async function processJob(jobId: string): Promise<void> {
  if (!pool) return
  try {
    const row = await pool.query(
      'SELECT id, user_id, type, input_url, status FROM photo_jobs WHERE id = $1',
      [jobId]
    )
    const job = row.rows[0]
    if (!job || job.status !== 'pending') return

    await pool.query(
      "UPDATE photo_jobs SET status = 'processing', updated_at = now() WHERE id = $1",
      [jobId]
    )

    const inputUrl = await getSignedReadUrl(job.input_url, 3600)
    const outputImageUrl = await runColorize(inputUrl)

    const res = await fetch(outputImageUrl)
    if (!res.ok) throw new Error(`Replicate output fetch failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/png'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const outputKey = `uploads/${job.user_id}/${jobId}_out.${ext}`
    await uploadBuffer(outputKey, buf, contentType)

    await pool.query(
      "UPDATE photo_jobs SET output_url = $1, status = 'completed', updated_at = now(), error_message = NULL WHERE id = $2",
      [outputKey, jobId]
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    console.error('Job processor error:', jobId, message)
    try {
      await pool!.query(
        "UPDATE photo_jobs SET status = 'failed', error_message = $1, updated_at = now() WHERE id = $2",
        [message.slice(0, 500), jobId]
      )
    } catch (e) {
      console.error('Failed to update job status:', e)
    }
  }
}
