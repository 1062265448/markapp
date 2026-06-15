import { ConfidenceService } from './confidence.service';
import { NickelLabelData, CheckResult, CorrectionRecord, BarcodeParsed } from '../../nickel/types/nickel.types';

describe('ConfidenceService', () => {
  let service: ConfidenceService;

  beforeEach(() => {
    service = new ConfidenceService();
  });

  const makeFullData = (): NickelLabelData => ({
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
    address: '金昌市金川区北京路',
    barcode: '100 01 01 260101 1042042 15000',
  });

  it('完美数据应得高分', () => {
    const result = service.calculate(makeFullData(), [], [], null);
    expect(result.score).toBe(100);
    expect(result.level).toBe('high');
    expect(result.deductions).toHaveLength(0);
  });

  it('null字段应扣分', () => {
    const data = makeFullData();
    data.brand = null;
    data.standard = null;
    const result = service.calculate(data, [], [], null);
    expect(result.score).toBeLessThan(100);
    expect(result.deductions.some(d => d.type === 'null_field')).toBe(true);
  });

  it('自动纠正应扣分', () => {
    const corrections: CorrectionRecord[] = [
      { field: 'batchNo', original: '26-1-1O9', corrected: '26-1-109', rule: 'charConfusion' },
    ];
    const result = service.calculate(makeFullData(), corrections, [], null);
    expect(result.score).toBe(95);
    expect(result.deductions.some(d => d.type === 'auto_correction')).toBe(true);
  });

  it('校验错误应扣分', () => {
    const checks: CheckResult[] = [
      { field: 'batchNo', ruleType: 'format', passed: false, severity: 'error', message: '格式错误' },
    ];
    const result = service.calculate(makeFullData(), [], checks, null);
    expect(result.score).toBeLessThan(100);
    expect(result.deductions.some(d => d.type === 'validation_error')).toBe(true);
  });

  it('校验警告应扣分', () => {
    const checks: CheckResult[] = [
      { field: 'brand', ruleType: 'format', passed: false, severity: 'warning', message: '大小写' },
    ];
    const result = service.calculate(makeFullData(), [], checks, null);
    expect(result.score).toBe(95);
    expect(result.deductions.some(d => d.type === 'validation_warning')).toBe(true);
  });

  it('分数不应低于0', () => {
    const data = makeFullData();
    data.brand = null;
    data.standard = null;
    data.batchNo = null;
    data.packNo = null;
    data.pieces = null;
    data.netWeight = null;
    data.grossWeight = null;
    data.productionDate = null;
    data.weightBy = null;
    data.address = null;
    data.productName = null;
    const checks: CheckResult[] = Array(10).fill({
      field: 'x', ruleType: 'format', passed: false, severity: 'error', message: 'err',
    });
    const result = service.calculate(data, [], checks, null);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.level).toBe('low');
  });

  it('null rawData 应返回基础分', () => {
    const result = service.calculate(null, [], [], null);
    expect(result.score).toBe(100);
    expect(result.level).toBe('high');
  });
});
