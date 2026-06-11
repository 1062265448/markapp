// 镍板标签数据结构
export interface NickelLabelData {
  productName: string | null;
  brand: string | null;
  standard: string | null;
  batchNo: string | null;
  packNo: string | null;
  pieces: number | null;
  netWeight: number | null;
  grossWeight: number | null;
  productionDate: string | null;
  weightBy: string | null;
  address: string | null;
  barcode?: string | null;
  _fieldLabels?: Record<string, string>;
}

// 规则检查结果
export interface CheckResult {
  field: string;
  ruleType: 'format' | 'range' | 'consistency' | 'crossField' | 'labelFormat';
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
  original?: string | null;
  corrected?: string;
  barcodeCorrection?: string;
  message: string;
}

// 纠正记录
export interface CorrectionRecord {
  field: string;
  original: string;
  corrected: string;
  rule: string;
}

// AI元数据
export interface AIMeta {
  model: string;
  primaryLatency: number;
  volcLatency: number;
  qwenLatency: number;
  glmLatency: number;
  retry: boolean;
  secondaryModel: { model: string; latency: number } | null;
  tertiaryModel: { model: string; latency: number } | null;
  secondaryError: string | null;
  tertiaryError: string | null;
  tertiarySkipped: boolean;
}

// 条形码解析结果
export interface BarcodeParsed {
  barcode: string;
  prefix: string;
  month: string;
  day: string;
  productionDateCode: string;
  productionDate?: string;
  workshopCode: number;
  workshopName: string;
  batchNoSuffix: string;
  packCode: number;
  expectedPackNo: string;
  netWeightEncoded: number;
  expectedNetWeight: number;
  parsed: boolean;
  message?: string;
}

// 合并统计
export interface MergeStats {
  consistent: number;
  volcFilled: number;
  conflicts: number;
  details: Array<{
    field: string;
    primary?: string;
    secondary?: string;
    tertiary?: string;
    action: string;
    winner?: string;
  }>;
}

// 置信度评分
export interface ConfidenceScore {
  score: number;
  level: 'high' | 'medium' | 'low';
  deductions: Array<{
    type: string;
    count: number;
    deduction: number;
    fields?: string[];
    details?: Array<{ field: string; aiValue: any; barcodeValue: any }>;
  }>;
}

// 识别结果数据
export interface RecognitionData {
  rawData: NickelLabelData | null;
  secondaryRawData: NickelLabelData | null;
  tertiaryRawData: NickelLabelData | null;
  correctedData: NickelLabelData | null;
  corrections: CorrectionRecord[];
  checkResults: CheckResult[];
  barcodeParsed: BarcodeParsed | null;
  allPassed: boolean;
  errorCount: number;
  warningCount: number;
  confidence: ConfidenceScore | null;
  mergeStats: MergeStats | null;
  _aiMeta: AIMeta;
}

// 喷码识别结果
export interface SpraycodeResult {
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  pieces: number | null;
  _aiMeta?: {
    ocrEngine: string;
    ocrLineCount: number;
    ocrLatency: number;
  };
}

// 喷码对比结果
export interface CompareResultItem {
  field: string;
  fieldLabelCn: string;
  fieldLabelEn: string;
  sprayCodeValue: any;
  labelValueCn: any;
  labelValueEn: any;
  labelValue: any;
  matched: boolean | null;
  missingIn: string | null;
  diffType: string | null;
}

// API响应格式
export interface RecognitionResult {
  success: boolean;
  data: RecognitionData;
  message: string;
  timestamp: string;
}

// 喷码API响应
export interface SpraycodeResultResponse {
  success: boolean;
  data: SpraycodeResult;
  message: string;
  timestamp: string;
}

// 喷码对比API响应
export interface CompareResultResponse {
  success: boolean;
  data: {
    compareResults: CompareResultItem[];
    summary: {
      totalFields: number;
      matched: number;
      mismatched: number;
      missingInSpraycode: number;
      missingInLabel: number;
      bothMissing: number;
    };
    sprayCodeData: SpraycodeResult;
  };
  message: string;
  timestamp: string;
}

// 历史记录条目
export interface HistoryEntry {
  id: string;
  timestamp: string;
  imagePath?: string;
  batchNo?: string;
  packNo?: string;
  productName?: string;
  allPassed: boolean;
  confidence: ConfidenceScore | null;
}

// 车间代码映射表
export const WORKSHOP_MAP: Record<number, string> = {
  1: '电解一车间-电解镍',
  2: '电解二车间-电解镍',
  3: '电解三车间-电解镍',
  4: '电积一车间(128槽)-电解镍',
  5: '电解三车间-电积镍',
  6: '电积一车间-电积镍',
  7: '电积二车间-电积镍',
};
