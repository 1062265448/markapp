// 识别结果数据结构
export interface NickelLabelData {
  productName: string | null
  brand: string | null
  standard: string | null
  batchNo: string | null
  packNo: string | null
  pieces: number | null
  netWeight: number | null
  grossWeight: number | null
  productionDate: string | null
  weightBy: string | null
  address: string | null
  barcode?: string | null
  _fieldLabels?: Record<string, string>
}

export interface CheckResult {
  field: string
  ruleType: 'format' | 'range' | 'consistency' | 'crossField' | 'labelFormat'
  passed: boolean
  severity: 'error' | 'warning' | 'info'
  original?: string
  corrected?: string
  barcodeCorrection?: string
  message: string
}

export interface CorrectionRecord {
  field: string
  original: string
  corrected: string
  rule: string
}

// OCR元数据（替代原AIMeta）
export interface OcrMeta {
  engine: string              // "rapid-ocr + zxing-cpp"
  ocrLatency: number          // OCR 文本识别耗时(ms)
  barcodeLatency: number      // 条码扫描耗时(ms)
  lineCount: number           // OCR 识别行数
  barcodeCount: number        // 扫描到的条码数
  barcodeFormat: string | null // 条码格式: "CODE_128" | "QR_CODE" | etc.
}

export interface BarcodeParsed {
  barcode: string
  prefix: string
  month: string
  day: string
  productionDateCode: string
  productionDate?: string
  workshopCode: number
  workshopName: string
  batchNoSuffix: string
  packCode: number
  expectedPackNo: string
  netWeightEncoded: number
  expectedNetWeight: number
  parsed: boolean
  message?: string
}

export interface ConfidenceScore {
  score: number
  level: 'high' | 'medium' | 'low'
  deductions: Array<{
    type: string
    count: number
    deduction: number
    fields?: string[]
    details?: Array<{ field: string; aiValue: string | number; barcodeValue: string | number }>
  }>
}

export interface RecognitionData {
  rawData: NickelLabelData | null
  correctedData: NickelLabelData | null
  corrections: CorrectionRecord[]
  checkResults: CheckResult[]
  barcodeParsed: BarcodeParsed | null
  allPassed: boolean
  errorCount: number
  warningCount: number
  confidence: ConfidenceScore | null
  _ocrMeta: OcrMeta
}

export interface RecognitionResult {
  success: boolean
  data: RecognitionData
  message: string
  timestamp: string
}

export interface CompareResultItem {
  field: string
  fieldLabelCn: string
  fieldLabelEn: string
  sprayCodeValue: string | number | null
  labelValueCn: string | number | null
  labelValueEn: string | number | null
  labelValue: string | number | null
  matched: boolean | null
  missingIn: string | null
  diffType: string | null
}

export interface CompareSummary {
  totalFields: number
  matched: number
  mismatched: number
  missingInSpraycode: number
  missingInLabel: number
  bothMissing: number
  overallMatch: boolean
}

export interface CompareLabelData {
  batchNo: { cn: string | null; en: string | null } | null
  packNo: { cn: string | null; en: string | null } | null
  netWeight: { cn: string | number | null; en: string | number | null } | null
  productionDate: { cn: string | null; en: string | null } | null
}

export interface CompareResult {
  success: boolean
  data: {
    id: string
    compareResults: CompareResultItem[]
    summary: CompareSummary
    sprayCodeData: {
      batchNo: string | null
      packNo: string | null
      productionDate: string | null
      netWeight: number | null
      grossWeight: number | null
      pieces: number | null
      _ocrMeta?: OcrMeta
    }
    labelCodeData?: CompareLabelData | null
  }
  message: string
  timestamp: string
}

export interface SpraycodeResult {
  success: boolean
  data: {
    batchNo: string | null
    packNo: string | null
    productionDate: string | null
    netWeight: number | null
    grossWeight: number | null
    pieces: number | null
    _ocrMeta?: OcrMeta
  }
  message: string
  timestamp: string
}

// 服务端历史记录列表项
export interface HistoryListItem {
  id: string
  batchNo: string | null
  packNo: string | null
  productionDate: string | null
  overallMatch: boolean | null
  matchedCount: number | null
  totalFields: number | null
  spraycodeImageUrl: string | null
  labelImageUrl: string | null
  createdAt: string
}

export interface HistoryListResponse {
  success: boolean
  data: {
    items: HistoryListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
  message: string
  timestamp: string
}

export interface RecordDetailResponse {
  success: boolean
  data: {
    id: string
    compareResults: CompareResultItem[]
    summary: CompareSummary
    sprayCodeData: Record<string, unknown>
    labelCodeData: Record<string, unknown> | null
    message: string
    images: Array<{
      imageType: 'spraycode' | 'label'
      url: string
      mimeType: string
      fileSize: number
      exists: boolean
    }>
    createdAt: string
  }
  message: string
  timestamp: string
}

export interface HistoryRecord {
  id: string
  type: 'recognize' | 'spraycode' | 'compare'
  timestamp: string
  thumbnail?: string
  summary: string
  overallMatch?: boolean | null
  matchedCount?: number | null
  totalFields?: number | null
  result?: RecognitionResult | SpraycodeResult | CompareResult
}
