/**
 * LabelOcrService v2.3.6 测试套件
 *
 * 覆盖三大分支：
 * 1. 扫到 25 位条码 → 全部业务字段从条码反推
 * 2. 用户手动输入 userBarcode → 跳过 zxing
 * 3. 都没拿到 → 返回空 + _warning
 */

import { LabelOcrService } from './label-ocr.service';
import { NickelConfigService } from '../../config/config.service';
import { BarcodeParserService } from './barcode-parser.service';
import * as ocrUtils from './ocr-utils';

const configStub = { rapidOcrUrl: 'http://fake-ocr' } as unknown as NickelConfigService;
const VALID_25_DIGIT = '0980201260615100005015000';

describe('LabelOcrService — v2.3.6 条码优先', () => {
  let service: LabelOcrService;
  let barcodeParser: BarcodeParserService;

  beforeEach(() => {
    barcodeParser = new BarcodeParserService();
    service = new LabelOcrService(configStub, barcodeParser);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('分支 1：zxing 扫到 25 位条码', () => {
    it('应从条码反推全部业务字段 + 业务常量', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [{ text: VALID_25_DIGIT, format: 'CODE_128' }],
        barcodeCount: 1,
        barcodeLatencyMs: 50,
      });

      const result = await service.recognizeLabel(Buffer.from('fake'));

      // 条码反推字段
      expect(result.labelData.batchNo).toBe('26-1-000');
      expect(result.labelData.packNo).toBe('50');
      expect(result.labelData.productionDate).toBe('2026-06-15');
      expect(result.labelData.netWeight).toBe(1500);
      expect(result.labelData.productName).toBe('电解镍'); // 车间 1 取最后段
      // 条码未编码字段
      expect(result.labelData.grossWeight).toBeNull();
      expect(result.labelData.pieces).toBeNull();
      // 业务常量
      expect(result.labelData.brand).toBe('金川');
      expect(result.labelData.standard).toBe('GB/T 6516-2025');
      expect(result.labelData.weightBy).toBe('按净重计价');
      expect(result.labelData.address).toBe('甘肃省金昌市金川区北京路10号');
      // barcodeParsed 必须有
      expect(result.barcodeParsed?.parsed).toBe(true);
      expect(result.barcodeParsed?.workshopCode).toBe(1);
      // 无 warning
      expect(result.labelData._warning).toBeUndefined();
    });
  });

  describe('分支 2：用户手动输入 userBarcode（跳过 zxing）', () => {
    it('应直接使用 userBarcode 解析', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [], // 即便 zxing 没扫到
        barcodeCount: 0,
        barcodeLatencyMs: 30,
      });

      const result = await service.recognizeLabel(Buffer.from('fake'), VALID_25_DIGIT);

      expect(result.labelData.batchNo).toBe('26-1-000');
      expect(result.labelData.packNo).toBe('50');
      expect(result.labelData.barcode).toBe(VALID_25_DIGIT);
      expect(result.labelData._warning).toBeUndefined();
    });

    it('userBarcode 含空格分隔也应归一化为 25 位数字', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [],
        barcodeCount: 0,
        barcodeLatencyMs: 30,
      });

      const spaced = '098 02 01 260615 1000050 15000';
      const result = await service.recognizeLabel(Buffer.from('fake'), spaced);

      expect(result.labelData.batchNo).toBe('26-1-000');
      expect(result.labelData._barcodeRaw).toBe(VALID_25_DIGIT);
    });

    it('userBarcode 非 25 位 → 失败分支', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [],
        barcodeCount: 0,
        barcodeLatencyMs: 30,
      });

      const result = await service.recognizeLabel(Buffer.from('fake'), '12345');

      expect(result.labelData.batchNo).toBeNull();
      expect(result.labelData._warning).toMatch(/条码格式无效/);
    });
  });

  describe('分支 3：扫码 + userBarcode 都失败', () => {
    it('zxing 无结果 + 无 userBarcode → 返回 _warning', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [
          { text: '金川集团股份有限公司', confidence: 0.58 },
          { text: '14825', confidence: 0.77 },
        ],
        lineCount: 2,
        ocrLatencyMs: 100,
        barcodes: [],
        barcodeCount: 0,
        barcodeLatencyMs: 30,
      });

      const result = await service.recognizeLabel(Buffer.from('fake'));

      // 业务字段全 null
      expect(result.labelData.batchNo).toBeNull();
      expect(result.labelData.packNo).toBeNull();
      expect(result.labelData.netWeight).toBeNull();
      expect(result.labelData.productionDate).toBeNull();
      expect(result.labelData.productName).toBeNull();
      // 业务常量也不应有（因为是失败路径）
      expect(result.labelData.brand).toBeNull();
      // _warning 必须有
      expect(result.labelData._warning).toMatch(/未扫到条码/);
      // OCR 文本绝不出现在业务字段
      expect(result.labelData.batchNo).not.toBe('14825');
      expect(result.barcodeParsed).toBeNull();
    });

    it('zxing 扫到非 25 位 → 返回 _warning', async () => {
      jest.spyOn(ocrUtils, 'callOcrFull').mockResolvedValue({
        lines: [],
        lineCount: 0,
        ocrLatencyMs: 100,
        barcodes: [{ text: '6901234567890', format: 'EAN_13' }], // 商品 GTIN，非 25 位
        barcodeCount: 1,
        barcodeLatencyMs: 30,
      });

      const result = await service.recognizeLabel(Buffer.from('fake'));

      expect(result.labelData.batchNo).toBeNull();
      expect(result.labelData._warning).toMatch(/条码格式无效/);
      expect(result.barcodeParsed).toBeNull();
    });
  });
});
