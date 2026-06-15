import { RuleCheckerService } from './rule-checker.service';
import { BarcodeParserService } from './barcode-parser.service';
import { NickelLabelData } from '../../nickel/types/nickel.types';

describe('RuleCheckerService', () => {
  let service: RuleCheckerService;

  beforeEach(() => {
    service = new RuleCheckerService(new BarcodeParserService());
  });

  const makeValidData = (): NickelLabelData => ({
    productName: '电解镍',
    brand: 'JINTUO GRADE 1',
    standard: 'GB/T6516-2025',
    batchNo: '26-1-109',
    packNo: '42',
    pieces: 6,
    netWeight: 1500,
    grossWeight: 1520,
    productionDate: '2026-01-01',
    weightBy: 'JINCHUAN',
    address: '甘肃省金昌市金川区北京路',
    barcode: '100 01 01 260101 1109042 15000',
  });

  describe('checkBatchNo', () => {
    it('有效批号应通过', () => {
      const r = service.checkBatchNo('26-1-109');
      expect(r.passed).toBe(true);
    });

    it('带J后缀应通过', () => {
      const r = service.checkBatchNo('26-1-109J');
      expect(r.passed).toBe(true);
    });

    it('null应报错', () => {
      const r = service.checkBatchNo(null);
      expect(r.passed).toBe(false);
      expect(r.severity).toBe('error');
    });

    it('无效格式应报错', () => {
      const r = service.checkBatchNo('2601109');
      expect(r.passed).toBe(false);
      expect(r.message).toContain('格式');
    });

    it('车间代码超出范围应报错', () => {
      const r = service.checkBatchNo('26-8-109');
      expect(r.passed).toBe(false);
      expect(r.message).toContain('车间代码');
    });
  });

  describe('checkPackNo', () => {
    it('有效包号应通过', () => {
      expect(service.checkPackNo('42').passed).toBe(true);
    });

    it('带J后缀应通过', () => {
      expect(service.checkPackNo('42J').passed).toBe(true);
    });

    it('null应报错', () => {
      expect(service.checkPackNo(null).passed).toBe(false);
    });

    it('超出范围应报错', () => {
      expect(service.checkPackNo('10000').passed).toBe(false);
    });
  });

  describe('checkDate', () => {
    it('有效日期应通过', () => {
      expect(service.checkDate('2026-01-01').passed).toBe(true);
    });

    it('斜线分隔应通过', () => {
      expect(service.checkDate('2026/01/01').passed).toBe(true);
    });

    it('null应报错', () => {
      expect(service.checkDate(null).passed).toBe(false);
    });

    it('无效日期应报错', () => {
      expect(service.checkDate('2026-13-01').passed).toBe(false);
    });

    it('不存在的日期应报错', () => {
      expect(service.checkDate('2026-02-30').passed).toBe(false);
    });
  });

  describe('checkWeight', () => {
    it('正常净重应通过', () => {
      const results = service.checkWeight(1500, null);
      expect(results[0].passed).toBe(true);
    });

    it('null净重应报错', () => {
      const results = service.checkWeight(null, null);
      expect(results[0].passed).toBe(false);
    });

    it('小数点错位应警告', () => {
      const results = service.checkWeight(1.5, null);
      expect(results[0].passed).toBe(false);
      expect(results[0].severity).toBe('warning');
      expect(results[0].corrected).toBe('1500');
    });

    it('毛重正常应通过', () => {
      const results = service.checkWeight(1500, 1520);
      expect(results).toHaveLength(2);
      expect(results[1].passed).toBe(true);
    });
  });

  describe('checkGrossVsNet', () => {
    it('毛重>=净重应通过', () => {
      expect(service.checkGrossVsNet(1500, 1520).passed).toBe(true);
    });

    it('毛重<净重应报错', () => {
      const r = service.checkGrossVsNet(1500, 1400);
      expect(r.passed).toBe(false);
      expect(r.severity).toBe('error');
    });

    it('null值应警告', () => {
      expect(service.checkGrossVsNet(null, 1520).passed).toBe(false);
    });
  });

  describe('checkBrandConsistency', () => {
    it('匹配品牌应通过', () => {
      expect(service.checkBrandConsistency('电解镍', 'JINTUO GRADE 1').passed).toBe(true);
    });

    it('电积镍应有EW后缀', () => {
      expect(service.checkBrandConsistency('电积镍', 'JINTUO GRADE 1(EW)').passed).toBe(true);
    });

    it('null应警告', () => {
      expect(service.checkBrandConsistency(null, 'JINTUO GRADE 1').passed).toBe(false);
    });
  });

  describe('checkStandardFormat', () => {
    it('有效标准号应通过', () => {
      expect(service.checkStandardFormat('GB/T6516-2025').passed).toBe(true);
    });

    it('null应警告', () => {
      expect(service.checkStandardFormat(null).passed).toBe(false);
      expect(service.checkStandardFormat(null).severity).toBe('warning');
    });

    it('错误格式应报错', () => {
      const r = service.checkStandardFormat('GB 6516');
      expect(r.passed).toBe(false);
      expect(r.severity).toBe('error');
    });
  });

  describe('autoCorrect', () => {
    it('应纠正O→0', () => {
      const data = { ...makeValidData(), batchNo: '26-1-1O9' };
      const { corrected, corrections } = service.autoCorrect(data);
      expect(corrected.batchNo).toBe('26-1-109');
      expect(corrections).toHaveLength(1);
      expect(corrections[0].field).toBe('batchNo');
    });

    it('应纠正l/I→1', () => {
      const data = { ...makeValidData(), packNo: '4l' };
      const { corrected } = service.autoCorrect(data);
      expect(corrected.packNo).toBe('41');
    });

    it('应纠正全角括号为半角', () => {
      const data = { ...makeValidData(), brand: 'JINTUO GRADE 1（EW）' };
      const { corrected, corrections } = service.autoCorrect(data);
      // 全角括号应被替换（可能被 correctBrandSpelling 进一步处理）
      expect(corrected.brand).not.toContain('（');
      expect(corrected.brand).not.toContain('）');
      expect(corrections.some(c => c.field === 'brand')).toBe(true);
    });

    it('应纠正日期斜线', () => {
      const data = { ...makeValidData(), productionDate: '2026/01/01' };
      const { corrected } = service.autoCorrect(data);
      expect(corrected.productionDate).toBe('2026-01-01');
    });

    it('应纠正小数点错位的净重', () => {
      const data = { ...makeValidData(), netWeight: 1.5 };
      const { corrected, corrections } = service.autoCorrect(data);
      expect(corrected.netWeight).toBe(1500);
      expect(corrections.some(c => c.field === 'netWeight' && c.rule === 'weightRange')).toBe(true);
    });

    it('正确数据不应产生纠正', () => {
      const data = makeValidData();
      const { corrections } = service.autoCorrect(data);
      expect(corrections).toHaveLength(0);
    });
  });

  describe('check (完整校验)', () => {
    it('完美数据应全部通过', () => {
      const results = service.check(makeValidData(), '100 01 01 260101 1109042 15000');
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('缺失字段应产生错误', () => {
      const data = makeValidData();
      data.batchNo = null;
      data.packNo = null;
      const results = service.check(data);
      const errors = results.filter(r => r.severity === 'error');
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
