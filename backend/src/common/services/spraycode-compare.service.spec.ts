/**
 * SpraycodeCompareService v2.3.6 测试套件
 *
 * 仅对比 batchNo/packNo/productionDate/netWeight 四个字段。
 * 验证：
 * - 完全匹配
 * - 字段不一致
 * - 一方缺失
 * - 双方都缺失
 * - 字段集不包含 brand/standard/productName/grossWeight/pieces
 */

import { SpraycodeCompareService } from './spraycode-compare.service';
import type { SpraycodeResult, NickelLabelData } from '../../nickel/types/nickel.types';

describe('SpraycodeCompareService — v2.3.6 4 字段对比', () => {
  let service: SpraycodeCompareService;

  beforeEach(() => {
    service = new SpraycodeCompareService();
  });

  it('完全一致 → 4 项全部 matched=true', () => {
    const spray: SpraycodeResult = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: 1510, pieces: 1,
      productName: '电解镍', brand: '金川', standard: 'GB/T 6516-2025',
      weightBy: '按净重计价', address: 'a',
    };
    const results = service.compare(spray, label);
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.matched === true)).toBe(true);
  });

  it('批号差 → batchNo.matched=false，其他匹配', () => {
    const spray: SpraycodeResult = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-999', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
      productName: null, brand: null, standard: null, weightBy: null, address: null,
    };
    const results = service.compare(spray, label);
    const batchResult = results.find((r) => r.field === 'batchNo');
    expect(batchResult?.matched).toBe(false);
    expect(results.filter((r) => r.matched === true)).toHaveLength(3);
  });

  it('净重差在 0.05 阈值内 → matched=true', () => {
    const spray: SpraycodeResult = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500.04,
      grossWeight: null, pieces: null,
      productName: null, brand: null, standard: null, weightBy: null, address: null,
    };
    const results = service.compare(spray, label);
    expect(results.find((r) => r.field === 'netWeight')?.matched).toBe(true);
  });

  it('净重差超 0.05 阈值 → matched=false', () => {
    const spray: SpraycodeResult = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1520,
      grossWeight: null, pieces: null,
      productName: null, brand: null, standard: null, weightBy: null, address: null,
    };
    const results = service.compare(spray, label);
    expect(results.find((r) => r.field === 'netWeight')?.matched).toBe(false);
  });

  it('喷码 batchNo 缺失 → missingIn=spraycode', () => {
    const spray: SpraycodeResult = {
      batchNo: null, packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
      productName: null, brand: null, standard: null, weightBy: null, address: null,
    };
    const results = service.compare(spray, label);
    const batchResult = results.find((r) => r.field === 'batchNo');
    expect(batchResult?.missingIn).toBe('spraycode');
    expect(batchResult?.matched).toBe(false);
  });

  it('双方都缺失 → matched=null, diffType=both-missing', () => {
    const spray: SpraycodeResult = {
      batchNo: null, packNo: null, productionDate: null, netWeight: null,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: null, packNo: null, productionDate: null, netWeight: null,
      grossWeight: null, pieces: null,
      productName: null, brand: null, standard: null, weightBy: null, address: null,
    };
    const results = service.compare(spray, label);
    expect(results.every((r) => r.matched === null && r.diffType === 'both-missing')).toBe(true);
  });

  it('批号 J 后缀差异不影响匹配（去后缀比较）', () => {
    const spray: SpraycodeResult = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-000J', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
      productName: null, brand: null, standard: null, weightBy: null, address: null,
    };
    const results = service.compare(spray, label);
    expect(results.find((r) => r.field === 'batchNo')?.matched).toBe(true);
  });

  it('summarize 正确计算 overallMatch', () => {
    const spray: SpraycodeResult = {
      batchNo: '26-1-000', packNo: '50', productionDate: null, netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
      productName: null, brand: null, standard: null, weightBy: null, address: null,
    };
    const results = service.compare(spray, label);
    const summary = service.summarize(results);
    expect(summary.totalFields).toBe(4);
    expect(summary.matched).toBe(3);
    expect(summary.missingInSpraycode).toBe(1); // productionDate 缺失
    expect(summary.missingInLabel).toBe(0);
    expect(summary.overallMatch).toBe(false); // 一方缺失不算总体匹配
  });

  it('字段集不包含 brand/standard/productName/grossWeight/pieces', () => {
    const spray: SpraycodeResult = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: null, pieces: null,
    };
    const label: NickelLabelData = {
      batchNo: '26-1-000', packNo: '50', productionDate: '2026-06-15', netWeight: 1500,
      grossWeight: 9999, // ←故意不同
      pieces: 999,         // ←故意不同
      productName: 'WRONG', brand: 'WRONG', standard: 'WRONG', weightBy: 'WRONG', address: 'WRONG',
    };
    const results = service.compare(spray, label);
    expect(results.map((r) => r.field).sort()).toEqual(
      ['batchNo', 'netWeight', 'packNo', 'productionDate'].sort(),
    );
  });
});
