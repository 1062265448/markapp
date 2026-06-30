/**
 * SpraycodeOcrService v2.3.6 测试套件
 *
 * 覆盖三大分支：
 * 1. 扫到 25 位条码 → 字段全部从条码反推
 * 2. 扫到非 25 位条码 → 返回 _warning + 全 null
 * 3. 没扫到条码 → 返回 _warning + 全 null
 */

import { SpraycodeOcrService } from './spraycode-ocr.service';
import { NickelConfigService } from '../../config/config.service';
import { BarcodeParserService } from './barcode-parser.service';
import * as ocrUtils from './ocr-utils';

// 模拟依赖：NickelConfigService 仅 rapidOcrUrl
const configStub = { rapidOcrUrl: 'http://fake-ocr' } as unknown as NickelConfigService;

// 一个有效的 25 位行业编码（按 N1-N25 规则构造）
//   N1N2N3=098(企业) N4N5=02(类别) N6N7=01(品级)
//   N8-N13=260615(26-06-15) N14-N20=1000050(车间1,后三位000,包号编码050→50)
//   N21-N25=15000(捆净重=1500)
const VALID_25_DIGIT = '0980201260615100005015000';

const BARCODE_PARSED = {
  prefix: '098',
  productCategoryCode: '02',
  productGradeCode: '01',
  productionDateCode: '260615',
  productionDate: '2026-06-15',
  workshopCode: 1,
  workshopName: '电解一车间-电解镍',
  batchNoSuffix: '000',
  batchNoSuffixLetter: '',
  packCode: 50,
  expectedPackNo: '50',
  netWeightEncoded: 15000,
  expectedNetWeight: 1500,
  parsed: true,
  message: '解析成功',
};

describe('SpraycodeOcrService — v2.3.6 条码优先', () => {
  let service: SpraycodeOcrService;
  let barcodeParser: BarcodeParserService;

  beforeEach(() => {
    barcodeParser = new BarcodeParserService();
    service = new SpraycodeOcrService(configStub, barcodeParser);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('分支 1：扫到 25 位条码', () => {
    it('应从条码反推全部字段', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [{ text: VALID_25_DIGIT, format: 'CODE_128' }],
        barcodeCount: 1,
        barcodeLatencyMs: 50,
      });

      const result = await service.recognizeSpraycode(Buffer.from('fake'));

      expect(result.batchNo).toBe('26-1-000');
      expect(result.packNo).toBe('50');
      expect(result.productionDate).toBe('2026-06-15');
      expect(result.netWeight).toBe(1500);
      expect(result.grossWeight).toBeNull();
      expect(result.pieces).toBeNull();
      expect(result._warning).toBeUndefined();
      expect(result._barcodeRaw).toBe(VALID_25_DIGIT);
      expect(result._ocrMeta?.engine).toBe('rapid-ocr + zxing-cpp');
    });

    it('包号编码 201-400 → 包号需减 200 且带 J 后缀', async () => {
      // 25 位行业编码：098(企业) + 02(类别) + 01(品级) + 260615(日期) + 1000250(车间=1,后三位=000,packCode=250) + 15000(净重)
      const code250 = '0980201260615100025015000';
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [{ text: code250, format: 'CODE_128' }],
        barcodeCount: 1,
        barcodeLatencyMs: 50,
      });

      const result = await service.recognizeSpraycode(Buffer.from('fake'));
      // packCode=250 → decodedPackNo = 50, batchNoSuffixLetter = 'J'
      expect(result.batchNo).toBe('26-1-000J');
      expect(result.packNo).toBe('50');
    });
  });

  describe('分支 2：扫到非 25 位条码', () => {
    it('返回 _warning 且字段全 null', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [{ text: 'sample', confidence: 0.9 }],
        lineCount: 1,
        ocrLatencyMs: 100,
        barcodes: [{ text: 'not-a-25-digit-code', format: 'EAN_13' }],
        barcodeCount: 1,
        barcodeLatencyMs: 50,
      });

      const result = await service.recognizeSpraycode(Buffer.from('fake'));

      expect(result.batchNo).toBeNull();
      expect(result.packNo).toBeNull();
      expect(result.productionDate).toBeNull();
      expect(result.netWeight).toBeNull();
      expect(result.grossWeight).toBeNull();
      expect(result.pieces).toBeNull();
      expect(result._warning).toMatch(/条码格式无效/);
      expect(result._barcodeRaw).toBe('not-a-25-digit-code');
    });

    it('扫到的 25 位格式错（车间码超范围），应返回 _warning', async () => {
      // N14 第 1 位 = 9（车间码超 1-7）
      const invalidCode = '0980201260615900005015000';
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [{ text: invalidCode, format: 'CODE_128' }],
        barcodeCount: 1,
        barcodeLatencyMs: 50,
      });

      const result = await service.recognizeSpraycode(Buffer.from('fake'));
      expect(result.batchNo).toBeNull();
      expect(result._warning).toMatch(/解析失败/);
      expect(result._barcodeRaw).toBe(invalidCode);
    });
  });

  describe('分支 3：完全没扫到条码', () => {
    it('返回 _warning 提示用户重新拍摄', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [{ text: '14825', confidence: 0.77 }, { text: '02-91991', confidence: 0.73 }],
        lineCount: 2,
        ocrLatencyMs: 100,
        barcodes: [],
        barcodeCount: 0,
        barcodeLatencyMs: 30,
      });

      const result = await service.recognizeSpraycode(Buffer.from('fake'));

      expect(result.batchNo).toBeNull();
      expect(result.packNo).toBeNull();
      expect(result.productionDate).toBeNull();
      expect(result.netWeight).toBeNull();
      expect(result._warning).toMatch(/未检测到 25 位行业编码条码/);
      // OCR 文本绝不出现在 batchNo/packNo 等业务字段
      expect(result.batchNo).not.toBe('02-91991');
      expect(result.packNo).not.toBe('14825');
    });
  });
});
