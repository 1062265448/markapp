import { Injectable } from '@nestjs/common';
import {
  NickelLabelData,
  CorrectionRecord,
  CheckResult,
  BarcodeParsed,
  ConfidenceScore,
} from '../../nickel/types/nickel.types';

const SCORE_RULES = {
  BASE_SCORE: 100,
  NULL_FIELD: -10,
  AUTO_CORRECTION: -5,
  VALIDATION_ERROR: -15,
  VALIDATION_WARNING: -5,
  BARCODE_CONFLICT: -10,
};

@Injectable()
export class ConfidenceService {
  /**
   * 计算识别结果的置信度分数
   */
  calculate(
    rawData: NickelLabelData | null,
    corrections: CorrectionRecord[],
    checkResults: CheckResult[],
    barcodeParsed: BarcodeParsed | null,
  ): ConfidenceScore {
    let score = SCORE_RULES.BASE_SCORE;
    const deductions: ConfidenceScore['deductions'] = [];

    // 1. null字段
    const nullFields = this.getNullFields(rawData);
    if (nullFields.length > 0) {
      const deduction = nullFields.length * SCORE_RULES.NULL_FIELD;
      score += deduction;
      deductions.push({ type: 'null_field', count: nullFields.length, fields: nullFields as string[], deduction });
    }

    // 2. 自动纠正扣分
    if (corrections?.length > 0) {
      const deduction = corrections.length * SCORE_RULES.AUTO_CORRECTION;
      score += deduction;
      deductions.push({ type: 'auto_correction', count: corrections.length, deduction });
    }

    // 3. 校验错误
    const errors = checkResults.filter(r => r.severity === 'error');
    if (errors.length > 0) {
      const deduction = errors.length * SCORE_RULES.VALIDATION_ERROR;
      score += deduction;
      deductions.push({ type: 'validation_error', count: errors.length, deduction });
    }

    // 4. 校验警告
    const warnings = checkResults.filter(r => r.severity === 'warning');
    if (warnings.length > 0) {
      const deduction = warnings.length * SCORE_RULES.VALIDATION_WARNING;
      score += deduction;
      deductions.push({ type: 'validation_warning', count: warnings.length, deduction });
    }

    // 5. 条形码冲突
    if (barcodeParsed && rawData) {
      const conflicts = this.checkBarcodeConflicts(rawData, barcodeParsed);
      if (conflicts.length > 0) {
        const deduction = conflicts.length * SCORE_RULES.BARCODE_CONFLICT;
        score += deduction;
        deductions.push({ type: 'barcode_conflict', count: conflicts.length, details: conflicts, deduction });
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      level: score >= 80 ? 'high' : (score >= 60 ? 'medium' : 'low'),
      deductions,
    };
  }

  private getNullFields(rawData: NickelLabelData | null): string[] {
    if (!rawData) return [];
    return Object.entries(rawData)
      .filter(([, value]) => value === null || value === undefined || value === '')
      .map(([key]) => key);
  }

  private checkBarcodeConflicts(
    rawData: NickelLabelData,
    barcodeParsed: BarcodeParsed,
  ): Array<{ field: string; aiValue: string | number; barcodeValue: string | number }> {
    const conflicts: Array<{ field: string; aiValue: string | number; barcodeValue: string | number }> = [];

    // 包号
    const packNo = rawData.packNo || '';
    const expectedPack = barcodeParsed.expectedPackNo || '';
    if (expectedPack && packNo) {
      const cleanPack = String(packNo).replace(/[^0-9]/g, '');
      const cleanExpected = String(expectedPack).replace(/[^0-9]/g, '');
      if (cleanPack !== cleanExpected) {
        conflicts.push({ field: 'packNo', aiValue: packNo, barcodeValue: expectedPack });
      }
    }

    // 净重
    const netWeight = rawData.netWeight;
    const encodedWeight = barcodeParsed.expectedNetWeight;
    if (netWeight !== null && encodedWeight !== null) {
      const diff = Math.abs(parseFloat(String(netWeight)) - parseFloat(String(encodedWeight)));
      if (diff > 10) {
        conflicts.push({ field: 'netWeight', aiValue: netWeight, barcodeValue: `${encodedWeight}kg` });
      }
    }

    return conflicts;
  }
}
