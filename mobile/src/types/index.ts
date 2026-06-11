// 识别结果数据结构
export interface NickelLabelData {
  brand: string | null
  standard: string | null
  productName: string | null
  specification: string | null
  batchNo: string | null
  packNo: string | null
  netWeight: number | null
  grossWeight: number | null
  pieces: number | null
  productionDate: string | null
  weightBy: string | null
  address: string | null
  barcode: string | null
  _fieldLabels?: Record<string, string>
}

export interface CheckResult {
  field: string
  ruleType: string
  passed: boolean
  severity: 'error' | 'warning' | 'info'
  original?: string | null
  corrected?: string | null
  message: string
}

export interface CorrectionRecord {
  field: string
  original: string | null
  corrected: string
  rule: string
}

export interface AIMeta {
  model: string
  primaryLatency: number
  volcLatency: number
  qwenLatency: number
  glmLatency: number
  retry: boolean
  secondaryModel: { model: string; latency: number } | null
  tertiaryModel: { model: string; latency: number } | null
  secondaryError: string | null
  tertiaryError: string | null
  tertiarySkipped: boolean
}

export interface BarcodeParsed {
  barcode: string
  prefix: string
  month: string
  day: string
  productionDateCode: string
  productionDate: string
  workshopCode: number
  workshopName: string
  batchNoSuffix: string
  packCode: number
  expectedPackNo: string
  netWeightEncoded: string
  expectedNetWeight: number
  parsed: boolean
  message: string
}

export interface MergeStats {
  consistent: number
  volcFilled: number
  conflicts: number
  details: Array<{
    field: string
    primary?: string
    secondary?: string
    tertiary?: string
    action: string
    winner?: string
  }>
}

export interface ConfidenceScore {
  overall: number
  fields: Record<string, number>
  level: 'high' | 'medium' | 'low'
  summary: string
}

export interface RecognitionData {
  rawData: NickelLabelData | null
  secondaryRawData: NickelLabelData | null
  tertiaryRawData: NickelLabelData | null
  correctedData: NickelLabelData | null
  corrections: CorrectionRecord[]
  checkResults: CheckResult[]
  barcodeParsed: BarcodeParsed | null
  allPassed: boolean
  errorCount: number
  warningCount: number
  confidence: ConfidenceScore | null
  mergeStats: MergeStats | null
  _aiMeta: AIMeta
}

export interface RecognitionResult {
  success: boolean
  data: RecognitionData
  message: string
  timestamp: string
}

export interface CompareResultItem {
  field: string
  sprayValue: string | number | null
  labelValue: string | number | null
  match: boolean
  message: string
}

export interface CompareSummary {
  total: number
  matched: number
  mismatched: number
  missing: number
  passRate: number
  overallMatch: boolean
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
    _aiMeta?: { ocrEngine: string; ocrLineCount: number; ocrLatency: number }
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
  result: RecognitionResult | SpraycodeResult | any
}
