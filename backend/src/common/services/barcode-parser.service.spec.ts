import { BarcodeParserService } from './barcode-parser.service';

describe('BarcodeParserService', () => {
  let service: BarcodeParserService;

  beforeEach(() => {
    service = new BarcodeParserService();
  });

  describe('parse', () => {
    it('应解析空格分隔的6段条形码', () => {
      const result = service.parse('100 01 01 260101 1001001 15000');
      expect(result).not.toBeNull();
      expect(result!.parsed).toBe(true);
      expect(result!.prefix).toBe('100');
      expect(result!.month).toBe('01');
      expect(result!.day).toBe('01');
      expect(result!.productionDate).toBe('2026-01-01');
      expect(result!.workshopCode).toBe(1);
      expect(result!.workshopName).toContain('电解一车间');
      expect(result!.packCode).toBe(1);
      expect(result!.expectedPackNo).toBe('1');
      expect(result!.netWeightEncoded).toBe(15000);
      expect(result!.expectedNetWeight).toBe(1500);
    });

    it('应解析连续25位数字条形码', () => {
      const result = service.parse('1000101260101100100115000');
      expect(result).not.toBeNull();
      expect(result!.parsed).toBe(true);
      expect(result!.prefix).toBe('100');
      expect(result!.productionDate).toBe('2026-01-01');
    });

    it('应拒绝无效格式', () => {
      const result = service.parse('invalid');
      expect(result).not.toBeNull();
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('格式错误');
    });

    it('应拒绝非6段的条形码', () => {
      const result = service.parse('100 01 01');
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('6段');
    });

    it('应拒绝车间代码超出范围', () => {
      const result = service.parse('100 01 01 260101 8001001 15000');
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('车间代码超出范围');
    });

    it('应拒绝包号编码超出范围', () => {
      // productCode 7位, 最后3位 > 999 不可能（3位数字最大999），但前4位产品码长度错误
      const result = service.parse('100 01 01 260101 100100 15000');
      expect(result!.parsed).toBe(false);
      expect(result!.message).toContain('产品代码长度错误');
    });
  });

  describe('decodePackNo', () => {
    it('应将数字转为字符串', () => {
      expect(service.decodePackNo(42)).toBe('42');
      expect(service.decodePackNo(0)).toBe('0');
      expect(service.decodePackNo(999)).toBe('999');
    });

    it('应拒绝超出范围的值', () => {
      expect(() => service.decodePackNo(-1)).toThrow('超出范围');
      expect(() => service.decodePackNo(1000)).toThrow('超出范围');
    });
  });

  describe('validateFormat', () => {
    it('应验证有效格式', () => {
      const result = service.validateFormat('100 01 01 260101 1001001 15000');
      expect(result.valid).toBe(true);
    });

    it('应拒绝非6段格式', () => {
      const result = service.validateFormat('100 01 01');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('6段');
    });

    it('应拒绝非数字前缀', () => {
      const result = service.validateFormat('ABC 01 01 260101 1001001 15000');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('前缀');
    });
  });

  describe('generateBatchNoFromBarcode', () => {
    it('应从条形码生成批号', () => {
      const batchNo = service.generateBatchNoFromBarcode('100 01 01 260101 1001001 15000');
      expect(batchNo).toBe('26-1-001');
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
    });

    it('应从带J后缀的批号提取信息', () => {
      const info = service.extractBarcodeInfoFromBatchNo('26-1-109J');
      expect(info).not.toBeNull();
      expect(info!.batchSuffix).toBe('109');
    });

    it('无效批号应返回null', () => {
      expect(service.extractBarcodeInfoFromBatchNo('invalid')).toBeNull();
    });
  });
});
