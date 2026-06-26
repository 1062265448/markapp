import { Injectable } from '@nestjs/common';
import { CompareResultItem, CompareSummary } from '../../nickel/types/nickel.types';

interface LabelFieldValue {
  cn: string | null;
  en: string | null;
}

@Injectable()
export class SpraycodeCompareService {
  /**
   * 逐字段对比喷码数据和标签数据
   */
  compare(
    sprayCodeData: Record<string, any>,
    labelData: Record<string, any> | null,
  ): CompareResultItem[] {
    const safeLabelData = labelData || {
      packNo: { cn: null, en: null },
      batchNo: { cn: null, en: null },
      netWeight: { cn: null, en: null },
      productionDate: { cn: null, en: null },
    };

    return [
      this._compareField('packNo', '包号', 'PACK NO.', sprayCodeData.packNo, safeLabelData.packNo, 'exact'),
      this._compareField('batchNo', '批号', 'BATCH NO.', sprayCodeData.batchNo, safeLabelData.batchNo, 'batchNo'),
      this._compareField('netWeight', '净重', 'NET', sprayCodeData.netWeight, safeLabelData.netWeight, 'weight'),
      this._compareField('productionDate', '日期', 'DATE', sprayCodeData.productionDate, safeLabelData.productionDate, 'date'),
    ];
  }

  /**
   * 单字段对比
   */
  private _compareField(
    field: string,
    cnLabel: string,
    enLabel: string,
    sprayValue: any,
    labelValue: any,
    matchType: string,
  ): CompareResultItem {
    const labelCn = labelValue && typeof labelValue === 'object' ? (labelValue.cn ?? null) : labelValue;
    const labelEn = labelValue && typeof labelValue === 'object' ? (labelValue.en ?? null) : labelValue;

    const result: CompareResultItem = {
      field,
      fieldLabelCn: cnLabel,
      fieldLabelEn: enLabel,
      sprayCodeValue: sprayValue,
      labelValueCn: labelCn,
      labelValueEn: labelEn,
      labelValue: labelCn,
      matched: false,
      missingIn: null,
      diffType: null,
    };

    const sprayMissing = sprayValue === null || sprayValue === undefined || sprayValue === '';
    const labelCnMissing = labelCn === null || labelCn === undefined || labelCn === '';
    const labelEnMissing = labelEn === null || labelEn === undefined || labelEn === '';
    const labelMissing = labelCnMissing && labelEnMissing;

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

    const cnMatched = labelCnMissing ? false : this._matchByType(sprayValue, labelCn, matchType);
    const enMatched = labelEnMissing ? false : this._matchByType(sprayValue, labelEn, matchType);
    result.matched = cnMatched || enMatched;

    return result;
  }

  private _matchByType(a: any, b: any, matchType: string): boolean {
    switch (matchType) {
      case 'exact': return this._exactMatch(a, b);
      case 'date': return this._dateMatch(a, b);
      case 'weight': return this._weightMatch(a, b);
      case 'batchNo': return this._batchNoMatch(a, b);
      case 'ignore': return true; // 预留：包号暂不解码时忽略对比（当前已恢复exact）
      default: return this._exactMatch(a, b);
    }
  }

  private _exactMatch(a: any, b: any): boolean {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  private _dateMatch(a: any, b: any): boolean {
    const normalize = (dateStr: any): string => {
      if (!dateStr) return '';
      let s = String(dateStr).trim();
      const digits = s.replace(/\D/g, '');
      if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
      if (digits.length === 6) return `20${digits.slice(0,2)}-${digits.slice(2,4)}-${digits.slice(4,6)}`;
      const parts = s.split(/[-\/.]/);
      if (parts.length === 3) {
        let [y, m, d] = parts.map(p => p.replace(/\D/g, ''));
        if (y.length === 2) y = `20${y}`;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return s;
    };
    return normalize(a) === normalize(b);
  }

  private _weightMatch(a: any, b: any): boolean {
    const extractNum = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim().replace(/[Kk][Gg]/g, '').replace(/[，,]/g, '');
      const num = parseFloat(s);
      return isNaN(num) ? null : num;
    };
    const numA = extractNum(a);
    const numB = extractNum(b);
    if (numA === null || numB === null) return false;
    return Math.abs(numA - numB) <= 0.05;
  }

  private _batchNoMatch(a: any, b: any): boolean {
    const normalize = (s: any): string => {
      // 标准化批号：统一连字符，去掉末尾J/t/s后缀，只比数字组合
      return String(s).trim().replace(/[—–‐]/g, '-').replace(/[JjTtSs]$/, '');
    };
    return normalize(a) === normalize(b);
  }

  /**
   * 汇总对比结果
   */
  summarize(compareResult: CompareResultItem[]): CompareSummary {
    const totalFields = compareResult.length;
    const matched = compareResult.filter(r => r.matched === true).length;
    const mismatched = compareResult.filter(r => r.matched === false && !r.missingIn).length;
    const missingInSpraycode = compareResult.filter(r => r.missingIn === 'spraycode').length;
    const missingInLabel = compareResult.filter(r => r.missingIn === 'label').length;
    const bothMissing = compareResult.filter(r => r.diffType === 'both-missing').length;

    return { totalFields, matched, mismatched, missingInSpraycode, missingInLabel, bothMissing, overallMatch: mismatched === 0 && missingInSpraycode === 0 };
  }
}
