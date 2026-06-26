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

// OCR元数据（替代原AIMeta）
export interface OcrMeta {
  engine: string;              // "rapid-ocr + zxing-cpp"
  ocrLatency: number;         // OCR 文本识别耗时(ms)
  barcodeLatency: number;     // 条码扫描耗时(ms)
  lineCount: number;          // OCR 识别行数
  barcodeCount: number;       // 扫描到的条码数
  barcodeFormat: string | null; // 条码格式: "CODE_128" | "QR_CODE" | etc.
}

// 条形码解析结果
export interface BarcodeParsed {
  barcode: string;
  prefix: string;                // N1N2N3: 企业代码
  productCategoryCode: string;   // N4N5: 产品类别代码
  productGradeCode: string;      // N6N7: 产品品级代码
  productionDateCode: string;    // N8-N13: 生产日期代码(原始6位)
  productionDate?: string;      // 完整日期
  workshopCode: number;          // ①车间
  workshopName: string;
  batchNoSuffix: string;         // ②③④批号后三位数字
  batchNoSuffixLetter: string;   // J或空(由包号编码区间决定)
  packCode: number;              // ⑤⑥⑦包号编码
  expectedPackNo: string;        // 解码后实际包号
  netWeightEncoded: number;      // N21-N25捆净重代码
  expectedNetWeight: number;      // 解码后净重(kg)
  parsed: boolean;
  message?: string;
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
    details?: Array<{ field: string; aiValue: string | number; barcodeValue: string | number }>;
  }>;
}

// 识别结果数据
export interface RecognitionData {
  rawData: NickelLabelData | null;
  correctedData: NickelLabelData | null;
  corrections: CorrectionRecord[];
  checkResults: CheckResult[];
  barcodeParsed: BarcodeParsed | null;
  allPassed: boolean;
  errorCount: number;
  warningCount: number;
  confidence: ConfidenceScore | null;
  _ocrMeta: OcrMeta;
}

// 喷码识别结果
export interface SpraycodeResult {
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  pieces: number | null;
  _ocrMeta?: OcrMeta;
}

// 喷码对比结果
export interface CompareResultItem {
  field: string;
  fieldLabelCn: string;
  fieldLabelEn: string;
  sprayCodeValue: string | number | null;
  labelValueCn: string | number | null;
  labelValueEn: string | number | null;
  labelValue: string | number | null;
  matched: boolean | null;
  missingIn: string | null;
  diffType: string | null;
}

// 对比摘要
export interface CompareSummary {
  totalFields: number;
  matched: number;
  mismatched: number;
  missingInSpraycode: number;
  missingInLabel: number;
  bothMissing: number;
  overallMatch: boolean;
}

// 喷码数据（用于 Entity JSON 列）
export interface SpraycodeData {
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  pieces: number | null;
  _ocrMeta?: OcrMeta;
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
    summary: CompareSummary;
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
