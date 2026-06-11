import request from './request'
import type { RecognitionResult, SpraycodeResult } from '@/types'

/**
 * 识别镍板标签
 */
export async function recognizeLabel(
  file: File | Blob,
  barcode?: string,
  enableGLM: boolean = true,
): Promise<RecognitionResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (barcode) formData.append('barcode', barcode)
  formData.append('enableGLM', enableGLM ? 'true' : 'false')

  return request.post<RecognitionResult>('/api/nickel/recognize', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

/**
 * 喷码OCR识别
 */
export async function recognizeSpraycode(
  file: File | Blob,
): Promise<SpraycodeResult> {
  const formData = new FormData()
  formData.append('file', file)

  return request.post<SpraycodeResult>('/api/nickel/spraycode', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

/**
 * 喷码对比
 */
export async function compareSpraycode(
  sprayFile: File | Blob,
  labelFile?: File | Blob,
  barcode?: string,
): Promise<any> {
  const formData = new FormData()
  formData.append('files', sprayFile)
  if (labelFile) formData.append('files', labelFile)
  if (barcode) formData.append('barcode', barcode)

  return request.post('/api/nickel/compare', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
  return request.get('/api/nickel/health')
}
