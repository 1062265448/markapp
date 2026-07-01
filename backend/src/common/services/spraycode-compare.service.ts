import { Injectable } from '@nestjs/common';
import { CompareResultItem, CompareSummary, NickelLabelData, SpraycodeResult } from '../../nickel/types/nickel.types';

/**
 * 字段定义 — 仅对比条码能映射的 4 个字段
 *
 * 业务约束：喷码 vs 标签 一致性对比只关注这些字段。
 * 其他（brand/standard/productName/grossWeight/pieces）不参与对比。
 */
interface ComparableField {
  field: string;
  cnLabel: string;
  enLabel: string;
  matchType: 'exact' | 'date' | 'weight' | 'batchNo';
}

const COMPARABLE_FIELDS: ComparableField[] = [
  { field: 'batchNo', cnLabel: '批号', enLabel: 'BATCH NO.', matchType: 'batchNo' },
  { field: 'packNo', cnLabel: '包号', enLabel: 'PACK NO.', matchType: 'exact' },
  { field: 'productionDate', cnLabel: '生产日期', enLabel: 'DATE', matchType: 'date' },
  { field: 'netWeight', cnLabel: '净重', enLabel: 'NET', matchType: 'weight' },
];

@Injectable()
export class SpraycodeCompareService {
  /**
   * v2.3.6：扁平字段对比（v1 的 cn/en 双语结构已废除）
   *
   * 喷码字段来自 SpraycodeResult、标签字段来自 NickelLabelData
   * 都已是条码反推的扁平字符串/数字
   */
  compare(
    sprayCodeData: SpraycodeResult,
    labelData: NickelLabelData | null,
  ): CompareResultItem[] {
    return COMPARABLE_FIELDS.map((def) =>
      this.compareField(def, sprayCodeData?.[def.field as keyof SpraycodeResult], labelData?.[def.field as keyof NickelLabelData]),
    );
  }

  private compareField(
    def: ComparableField,
    sprayValue: unknown,
    labelValue: unknown,
  ): CompareResultItem {
    const result: CompareResultItem = {
      field: def.field,
      fieldLabelCn: def.cnLabel,
      fieldLabelEn: def.enLabel,
      sprayCodeValue: (sprayValue ?? null) as string | number | null,
      labelValueCn: (labelValue ?? null) as string | number | null,
      labelValueEn: (labelValue ?? null) as string | number | null,
      labelValue: (labelValue ?? null) as string | number | null,
      matched: false,
      missingIn: null,
      diffType: null,
    };

    const sprayMissing = sprayValue === null || sprayValue === undefined || sprayValue === '';
    const labelMissing = labelValue === null || labelValue === undefined || labelValue === '';

    if (sprayMissing && labelMissing) {
      result.matched = null;
      result.diffType = 'both-missing';
      return result;
    }

    if (sprayMissing) {
      result.missingIn = 'spraycode';
      result.diffType = 'missing';
      return result;
    }

    if (labelMissing) {
      result.missingIn = 'label';
      result.diffType = 'missing';
      return result;
    }

    result.matched = this.matchByType(sprayValue, labelValue, def.matchType);
    return result;
  }

  private matchByType(a: unknown, b: unknown, matchType: ComparableField['matchType']): boolean {
    switch (matchType) {
      case 'exact':
        return String(a).trim() === String(b).trim();
      case 'date':
        return this.dateMatch(a, b);
      case 'weight':
        return this.weightMatch(a, b);
      case 'batchNo':
        return this.batchNoMatch(a, b);
      default:
        return String(a).trim() === String(b).trim();
    }
  }

  private dateMatch(a: unknown, b: unknown): boolean {
    const normalize = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const digits = String(v).replace(/\D/g, '');
      if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
      if (digits.length === 6) return `20${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
      const s = String(v).trim();
      const parts = s.split(/[-\/.]/);
      if (parts.length === 3) {
        const cleaned = parts.map((p) => p.replace(/\D/g, ''));
        let y = cleaned[0];
        const m = cleaned[1];
        const d = cleaned[2];
        if (y.length === 2) y = `20${y}`;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return s;
    };
    return normalize(a) === normalize(b);
  }

  private weightMatch(a: unknown, b: unknown): boolean {
    const num = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      const n = parseFloat(String(v).replace(/[Kk][Gg]/g, '').replace(/[，,]/g, ''));
      return isNaN(n) ? null : n;
    };
    const na = num(a);
    const nb = num(b);
    if (na === null || nb === null) return false;
    return Math.abs(na - nb) <= 0.05;
  }

  private batchNoMatch(a: unknown, b: unknown): boolean {
    // 标准化批号：统一 Unicode dash 为半角，移除末尾 J/t/s 后缀，仅比数字组合
    const normalize = (v: unknown): string =>
      String(v)
        .trim()
        .replace(/\p{Pd}/gu, '-')
        .replace(/[JjTtSs]$/, '');
    return normalize(a) === normalize(b);
  }

  /**
   * 汇总对比结果
   */
  summarize(compareResult: CompareResultItem[]): CompareSummary {
    const totalFields = compareResult.length;
    const matched = compareResult.filter((r) => r.matched === true).length;
    const mismatched = compareResult.filter((r) => r.matched === false && !r.missingIn).length;
    const missingInSpraycode = compareResult.filter((r) => r.missingIn === 'spraycode').length;
    const missingInLabel = compareResult.filter((r) => r.missingIn === 'label').length;
    const bothMissing = compareResult.filter((r) => r.diffType === 'both-missing').length;

    return {
      totalFields,
      matched,
      mismatched,
      missingInSpraycode,
      missingInLabel,
      bothMissing,
      overallMatch: mismatched === 0 && missingInSpraycode === 0,
    };
  }
}
