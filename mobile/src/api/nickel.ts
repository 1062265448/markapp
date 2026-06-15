import request from './request'
import type { RecognitionResult, SpraycodeResult, CompareResult, HistoryListResponse, RecordDetailResponse } from '@/types'

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
): Promise<CompareResult> {
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
 * 获取历史记录列表
 */
export async function fetchHistory(
  page: number = 1,
  limit: number = 20,
): Promise<HistoryListResponse> {
  return request.get('/api/nickel/history', { params: { page, limit } })
}

/**
 * 获取记录详情
 */
export async function fetchRecordDetail(id: string): Promise<RecordDetailResponse> {
  return request.get(`/api/nickel/history/${id}`)
}

/**
 * 删除历史记录
 */
export async function deleteHistoryRecord(id: string): Promise<{ success: boolean; message: string }> {
  return request.delete(`/api/nickel/history/${id}`)
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
  return request.get('/api/nickel/health')
}
