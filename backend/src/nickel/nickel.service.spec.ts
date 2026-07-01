import { BadRequestException } from '@nestjs/common';
import { NickelService } from './nickel.service';
import { BarcodeParsed, CheckResult, OcrMeta, NickelLabelData } from './types/nickel.types';

/**
 * nickel.service.spec.ts — 核心业务编排的集成测试
 *
 * 策略：mock 所有 7 个依赖服务，让测试聚焦于：
 *   1. 输入校验（文件大小/格式）
 *   2. 数据流编排（哪一步调用哪个服务）
 *   3. 错误传播（BadRequestException 透传 / 其他异常包成 success:false）
 *   4. 输出形状（success/data/message/timestamp 统一结构）
 */

// ============ 测试夹具 ============

const VALID_25_BARCODE = '1010126061512345678901234'; // 25位数字（示例）
const BARCODED_PARSED: BarcodeParsed = {
  barcode: VALID_25_BARCODE,
  prefix: '101',
  productCategoryCode: '01',
  productGradeCode: '26',
  productionDate: '2026-06-15',
  productionDateCode: '260615',
  workshopCode: 1,
  workshopName: '电解一车间-电解镍',
  batchNoSuffix: '234',
  batchNoSuffixLetter: '',
  packCode: 567,
  expectedPackNo: '567',
  netWeightEncoded: 12345,
  expectedNetWeight: 1234.5,
  parsed: true,
  message: '解析成功',
};

const GOOD_FILE = { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg', size: 1024 };

// ============ Mock 工厂 ============

const makeMocks = () => {
  const imagePreprocessService = {
    validateImageFormat: jest.fn(() => true),
    validateImageSize: jest.fn(() => true),
    preprocess: jest.fn(async (buf: Buffer) => buf),
  };

  const labelOcrService = {
    recognizeLabel: jest.fn(async (): Promise<{
      labelData: NickelLabelData;
      barcodeParsed: BarcodeParsed | null;
      _ocrMeta: OcrMeta;
    }> => ({
      labelData: {
        productName: '电解镍',
        brand: '金川',
        standard: 'GB/T 6516-2025',
        batchNo: '26-1-234',
        packNo: '567',
        pieces: null,
        netWeight: 1234.5,
        grossWeight: null,
        productionDate: '2026-06-15',
        weightBy: '按净重计价',
        address: '甘肃省金昌市金川区北京路10号',
        barcode: VALID_25_BARCODE,
        _barcodeRaw: VALID_25_BARCODE,
      },
      barcodeParsed: BARCODED_PARSED,
      _ocrMeta: {
        engine: 'rapid-ocr + zxing-cpp',
        ocrLatency: 100,
        barcodeLatency: 50,
        lineCount: 5,
        barcodeCount: 1,
        barcodeFormat: 'CODE_128' as string | null,
      },
    })),
  };

  const ruleCheckerService = {
    autoCorrect: jest.fn((data, _barcode) => ({ corrected: data, corrections: [] })),
    check: jest.fn((): CheckResult[] => [
      { field: 'batchNo', ruleType: 'format', passed: true, severity: 'info', message: 'OK' },
    ]),
  };

  const barcodeParserService = {
    parse: jest.fn((b: string) => (b === VALID_25_BARCODE ? BARCODED_PARSED : null)),
  };

  const confidenceService = {
    calculate: jest.fn(() => ({ score: 95, level: 'high' as const, deductions: [] })),
  };

  const spraycodeOcrService = {
    recognizeSpraycode: jest.fn(async () => ({
      batchNo: '26-1-234',
      packNo: '567',
      productionDate: '2026-06-15',
      netWeight: 1234.5,
      grossWeight: null,
      pieces: null,
      _barcodeRaw: VALID_25_BARCODE,
    })),
  };

  const spraycodeCompareService = {
    compare: jest.fn(() => []),
    summarize: jest.fn(() => ({
      totalFields: 4,
      matched: 4,
      mismatched: 0,
      missingInSpraycode: 0,
      missingInLabel: 0,
      bothMissing: 0,
      overallMatch: true,
    })),
  };

  return {
    imagePreprocessService,
    labelOcrService,
    ruleCheckerService,
    barcodeParserService,
    confidenceService,
    spraycodeOcrService,
    spraycodeCompareService,
  };
};

type Mocks = ReturnType<typeof makeMocks>;

// ============ 构造被测对象 ============

const buildService = (mocks: Mocks) =>
  new NickelService(
    mocks.imagePreprocessService as any,
    mocks.labelOcrService as any,
    mocks.ruleCheckerService as any,
    mocks.barcodeParserService as any,
    mocks.confidenceService as any,
    mocks.spraycodeOcrService as any,
    mocks.spraycodeCompareService as any,
  );

// ============ 测试 ============

describe('NickelService', () => {
  let mocks: Mocks;
  let service: NickelService;

  beforeEach(() => {
    mocks = makeMocks();
    service = buildService(mocks);
  });

  // ---------- recognize ----------

  describe('recognize()', () => {
    it('happy path: 合法图片 → success:true + 全字段填充 + 置信度', async () => {
      const result = await service.recognize(GOOD_FILE);

      expect(result.success).toBe(true);
      expect(result.data.correctedData?.batchNo).toBe('26-1-234');
      expect(result.data.barcodeParsed?.workshopCode).toBe(1);
      expect(result.data.confidence?.score).toBe(95);
      expect(result.data.allPassed).toBe(true);
      expect(result.data.errorCount).toBe(0);
      expect(result.data.warningCount).toBe(0);
      expect(result.message).toMatch(/识别成功/);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('校验通过时调用了 7 个依赖服务的完整链路', async () => {
      await service.recognize(GOOD_FILE);
      expect(mocks.imagePreprocessService.preprocess).toHaveBeenCalledTimes(1);
      expect(mocks.labelOcrService.recognizeLabel).toHaveBeenCalledTimes(1);
      expect(mocks.ruleCheckerService.autoCorrect).toHaveBeenCalledTimes(1);
      expect(mocks.ruleCheckerService.check).toHaveBeenCalledTimes(1);
      expect(mocks.confidenceService.calculate).toHaveBeenCalledTimes(1);
    });

    it('用户传入 barcode 时透传', async () => {
      await service.recognize(GOOD_FILE, VALID_25_BARCODE);
      expect(mocks.labelOcrService.recognizeLabel).toHaveBeenCalledWith(
        expect.any(Buffer),
        VALID_25_BARCODE,
      );
    });

    it('不识别的文件类型应抛 400', async () => {
      mocks.imagePreprocessService.validateImageFormat.mockReturnValue(false);
      await expect(service.recognize(GOOD_FILE)).rejects.toThrow(BadRequestException);
      await expect(service.recognize(GOOD_FILE)).rejects.toThrow(/不支持的文件类型/);
    });

    it('超大文件应抛 400', async () => {
      mocks.imagePreprocessService.validateImageSize.mockReturnValue(false);
      await expect(service.recognize(GOOD_FILE)).rejects.toThrow(/不能超过 10MB/);
    });

    it('无效的 file 对象应抛 400', async () => {
      await expect(service.recognize(null as any)).rejects.toThrow(BadRequestException);
    });

    it('文件缺字段应抛 400', async () => {
      const badFile = { buffer: Buffer.from(''), mimetype: '', size: undefined as any };
      await expect(service.recognize(badFile)).rejects.toThrow(/无效的文件上传格式/);
    });

    it('下游抛非 BadRequest 异常时返回 success:false + errorCount:1', async () => {
      mocks.labelOcrService.recognizeLabel.mockRejectedValue(new Error('RapidOCR 连接超时'));
      const result = await service.recognize(GOOD_FILE);

      expect(result.success).toBe(false);
      expect(result.data.errorCount).toBe(1);
      expect(result.data.correctedData).toBeNull();
      expect(result.data.confidence).toBeNull();
      expect(result.message).toMatch(/RapidOCR 连接超时/);
    });

    it('条码扫描失败但 OCR 成功时 message 携带 _warning', async () => {
      mocks.labelOcrService.recognizeLabel.mockResolvedValueOnce({
        labelData: {
          productName: null, brand: null, standard: null,
          batchNo: null, packNo: null, pieces: null,
          netWeight: null, grossWeight: null,
          productionDate: null, weightBy: null, address: null,
          barcode: null, _warning: '未扫到条码',
        } as unknown as NickelLabelData,
        barcodeParsed: null,
        _ocrMeta: { engine: 'rapid-ocr + zxing-cpp', ocrLatency: 0, barcodeLatency: 0, lineCount: 0, barcodeCount: 0, barcodeFormat: null },
      });
      const result = await service.recognize(GOOD_FILE);

      expect(result.success).toBe(true);
      expect(result.message).toBe('未扫到条码');
    });

    it('校验有 error/warning 时 message 统计错误数', async () => {
      const mixed: CheckResult[] = [
        { field: 'batchNo', ruleType: 'format', passed: false, severity: 'error', message: 'bad' },
        { field: 'packNo', ruleType: 'range', passed: false, severity: 'warning', message: 'warn' },
      ];
      mocks.ruleCheckerService.check.mockReturnValueOnce(mixed);
      const result = await service.recognize(GOOD_FILE);

      expect(result.data.errorCount).toBe(1);
      expect(result.data.warningCount).toBe(1);
      expect(result.data.allPassed).toBe(false);
      expect(result.message).toMatch(/1 个错误和 1 个警告/);
    });
  });

  // ---------- recognizeSpraycode ----------

  describe('recognizeSpraycode()', () => {
    it('happy path 直接抛 BadRequestException 风格的错误', async () => {
      mocks.imagePreprocessService.validateImageFormat.mockReturnValue(false);
      await expect(service.recognizeSpraycode(GOOD_FILE)).rejects.toThrow(/不支持的文件类型/);
    });

    it('合法喷码图返回 success:true + spraycode 数据', async () => {
      const result = await service.recognizeSpraycode(GOOD_FILE);
      expect(result.success).toBe(true);
      expect(result.data.batchNo).toBe('26-1-234');
      expect(mocks.spraycodeOcrService.recognizeSpraycode).toHaveBeenCalledTimes(1);
    });

    it('null file 抛 400', async () => {
      await expect(service.recognizeSpraycode(null as any)).rejects.toThrow(BadRequestException);
    });

    it('缺字段抛 400', async () => {
      await expect(
        service.recognizeSpraycode({ buffer: undefined as any, mimetype: 'image/jpeg', size: 0 }),
      ).rejects.toThrow(/无效的文件上传格式/);
    });
  });

  // ---------- compare ----------

  describe('compare()', () => {
    it('只传喷码图：仅喷码侧识别', async () => {
      const result = await service.compare(GOOD_FILE);
      expect(result.success).toBe(true);
      expect(mocks.spraycodeOcrService.recognizeSpraycode).toHaveBeenCalledTimes(1);
      expect(mocks.labelOcrService.recognizeLabel).not.toHaveBeenCalled();
      expect(result.data.labelCodeData).toBeNull();
    });

    it('传 喷码+标签 图：两边都识别 + 字段对比', async () => {
      const result = await service.compare(GOOD_FILE, GOOD_FILE);
      expect(result.success).toBe(true);
      expect(mocks.spraycodeOcrService.recognizeSpraycode).toHaveBeenCalledTimes(1);
      expect(mocks.labelOcrService.recognizeLabel).toHaveBeenCalledTimes(1);
      expect(mocks.spraycodeCompareService.compare).toHaveBeenCalledTimes(1);
      expect(mocks.spraycodeCompareService.summarize).toHaveBeenCalledTimes(1);
      expect(result.data.summary.overallMatch).toBe(true);
    });

    it('喷码图类型不支持抛 400', async () => {
      mocks.imagePreprocessService.validateImageFormat.mockReturnValue(false);
      await expect(service.compare(GOOD_FILE)).rejects.toThrow(/不支持的喷码图片类型/);
    });

    it('标签图类型不支持抛 400', async () => {
      // 第一次 validateFormat 返回 true（喷码通过），第二次 false（标签拒绝）
      mocks.imagePreprocessService.validateImageFormat
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      await expect(service.compare(GOOD_FILE, GOOD_FILE)).rejects.toThrow(/不支持的标签图片类型/);
    });

    it('null sprayFile 抛 400', async () => {
      await expect(service.compare(null as any)).rejects.toThrow(BadRequestException);
    });

    it('labelFile 字段不全抛 400', async () => {
      const badLabel = { buffer: undefined as any, mimetype: 'image/jpeg', size: 0 };
      await expect(service.compare(GOOD_FILE, badLabel)).rejects.toThrow(/无效的标签图片上传格式/);
    });
  });

  // ---------- health ----------

  describe('health()', () => {
    it('返回 success:true + status:ok + 时间戳', () => {
      const result = service.health();
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ok');
      expect(typeof result.data.version).toBe('string');
      expect(result.message).toMatch(/运行正常/);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});