import { BarcodeParserService } from './barcode-parser.service';

describe('BarcodeParserService', () => {
  let service: BarcodeParserService;

  beforeEach(() => {
    service = new BarcodeParserService();
  });

  describe('parse', () => {
    it('应解析空格分隔的6段条形码', () => {
      const result = service.parse('109 06 02 260101 3100100 10000');
      expect(result).not.toBeNull();
      expect(result!.parsed).toBe(true);
      expect(result!.prefix).toBe('109');
      expect(result!.productCategoryCode).toBe('06');
      expect(result!.productGradeCode).toBe('02');
      expect(result!.productionDate).toBe('2026-01-01');
      expect(result!.workshopCode).toBe(3);
      expect(result!.workshopName).toContain('电解三车间');
      expect(result!.packCode).toBe(100);
      expect(result!.expectedPackNo).toBe('100');
      expect(result!.batchNoSuffixLetter).toBe('');
      expect(result!.netWeightEncoded).toBe(10000);
      expect(result!.expectedNetWeight).toBe(1000);
    });

    it('应解析连续25位数字条形码', () => {
      const result = service.parse('1090602260101315010110000');
      expect(result).not.toBeNull();
      expect(result!.parsed).toBe(true);
      expect(result!.prefix).toBe('109');
      expect(result!.productCategoryCode).toBe('06');
      expect(result!.productGradeCode).toBe('02');
      expect(result!.productionDate).toBe('2026-01-01');
    });

    it('应拒绝无效格式', () => {
      const result = service.parse('invalid');
      expect(result).not.toBeNull();
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('格式错误');
    });

    it('应拒绝非6段的条形码', () => {
      const result = service.parse('109 06 02');
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('6段');
    });

    it('应拒绝车间代码超出范围', () => {
      const result = service.parse('109 06 02 260101 8001001 15000');
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('车间代码超出范围');
    });

    it('应拒绝包号编码超出800', () => {
      const result = service.parse('109 06 02 260101 3101801 10000');
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('包号编码超出范围');
    });
  });

  describe('decodePackNo', () => {
    it('0-200应为正常包号', () => {
      const r = service.decodePackNo(42);
      expect(r.packNo).toBe('42');
      expect(r.batchNoSuffixLetter).toBe('');
    });

    it('0应返回0', () => {
      const r = service.decodePackNo(0);
      expect(r.packNo).toBe('0');
      expect(r.batchNoSuffixLetter).toBe('');
    });

    it('200边界应返回正常包号', () => {
      const r = service.decodePackNo(200);
      expect(r.packNo).toBe('200');
      expect(r.batchNoSuffixLetter).toBe('');
    });

    it('201-400应为一期机组(包号-200+J)', () => {
      const r = service.decodePackNo(201);
      expect(r.packNo).toBe('1');
      expect(r.batchNoSuffixLetter).toBe('J');
    });

    it('401-600应为二期机组(包号-400+J)', () => {
      const r = service.decodePackNo(403);
      expect(r.packNo).toBe('3');
      expect(r.batchNoSuffixLetter).toBe('J');
    });

    it('431应为二期→包号31+J', () => {
      const r = service.decodePackNo(431);
      expect(r.packNo).toBe('31');
      expect(r.batchNoSuffixLetter).toBe('J');
    });

    it('601-800应为三期机组(包号-600+J)', () => {
      const r = service.decodePackNo(700);
      expect(r.packNo).toBe('100');
      expect(r.batchNoSuffixLetter).toBe('J');
    });

    it('应拒绝超出范围的值', () => {
      expect(() => service.decodePackNo(-1)).toThrow('超出范围');
      expect(() => service.decodePackNo(801)).toThrow('超出范围');
    });
  });

  describe('generateBatchNoFromBarcode', () => {
    it('应从条形码生成批号(正常包号无J)', () => {
      // productCode=3100100 → ①=3, ②③④=100, ⑤⑥⑦=100(≤200→正常包号)
      const batchNo = service.generateBatchNoFromBarcode('109 06 02 260101 3100100 10000');
      expect(batchNo).toBe('26-3-100');
    });

    it('应从条形码生成批号(二期包号+J)', () => {
      // packCode=431 > 400 → 二期 → 包号31, 批号+J
      const batchNo = service.generateBatchNoFromBarcode('109 06 02 260525 3151431 14765');
      expect(batchNo).toBe('26-3-151J');
    });

    it('无效条形码应返回null', () => {
      const batchNo = service.generateBatchNoFromBarcode('invalid');
      expect(batchNo).toBeNull();
    });
  });

  describe('extractBarcodeInfoFromBatchNo', () => {
    it('应从批号提取信息', () => {
      const info = service.extractBarcodeInfoFromBatchNo('26-1-109');
      expect(info).not.toBeNull();
      expect(info!.yearShort).toBe('26');
      expect(info!.workshopCode).toBe(1);
      expect(info!.batchSuffix).toBe('109');
      expect(info!.suffixLetter).toBe('');
    });

    it('应从带J后缀的批号提取信息', () => {
      const info = service.extractBarcodeInfoFromBatchNo('26-3-151J');
      expect(info).not.toBeNull();
      expect(info!.batchSuffix).toBe('151');
      expect(info!.suffixLetter).toBe('J');
    });

    it('无效批号应返回null', () => {
      expect(service.extractBarcodeInfoFromBatchNo('invalid')).toBeNull();
    });
  });

  describe('validateBatchNoVsBarcode', () => {
    it('批号与条码一致(含J)', () => {
      const barcode = '1090602260525315143114765';
      expect(service.validateBatchNoVsBarcode('26-3-151J', barcode)).toBe(true);
    });

    it('批号缺J应不一致', () => {
      const barcode = '1090602260525315143114765';
      expect(service.validateBatchNoVsBarcode('26-3-151', barcode)).toBe(false);
    });

    it('批号后缀字母错误应不一致', () => {
      const barcode = '1090602260525315143114765';
      expect(service.validateBatchNoVsBarcode('26-3-151t', barcode)).toBe(false);
    });

    it('正常包号(无J)应一致', () => {
      const barcode = '109 06 02 260101 3100100 10000';
      expect(service.validateBatchNoVsBarcode('26-3-100', barcode)).toBe(true);
    });
  });
});
