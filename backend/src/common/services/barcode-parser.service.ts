import { Injectable } from '@nestjs/common';
import { WORKSHOP_MAP } from '../../nickel/types/nickel.types';

export interface BarcodeParseResult {
  barcode: string;
  prefix: string;
  month: string;
  day: string;
  productionDate: string;
  workshopCode: number;
  workshopName: string;
  batchNoSuffix: string;
  packCode: number;
  expectedPackNo: string;
  netWeightEncoded: number;
  expectedNetWeight: number;
  parsed: boolean;
  message: string;
}

@Injectable()
export class BarcodeParserService {
  /**
   * 解析条形码字符串
   * 支持两种格式:
   *   - 空格分隔6段
   *   - 连续25位数字
   */
  parse(barcode: string): BarcodeParseResult | null {
    let parts: string[];
    const trimmed = barcode.trim();

    if (trimmed.includes(' ')) {
      parts = trimmed.split(/\s+/);
    } else if (/^\d{25}$/.test(trimmed)) {
      parts = [
        trimmed.slice(0, 3),
        trimmed.slice(3, 5),
        trimmed.slice(5, 7),
        trimmed.slice(7, 13),
        trimmed.slice(13, 20),
        trimmed.slice(20, 25),
      ];
    } else {
      return {
        barcode, prefix: '', month: '', day: '',
        productionDate: '', workshopCode: 0, workshopName: '',
        batchNoSuffix: '', packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: '条形码格式错误: 应为空格分隔6段或连续25位数字',
      };
    }

    if (parts.length !== 6) {
      return {
        barcode, prefix: '', month: '', day: '',
        productionDate: '', workshopCode: 0, workshopName: '',
        batchNoSuffix: '', packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: '条形码格式错误: 应为6段，以空格分隔',
      };
    }

    const productCode = parts[4];
    if (productCode.length !== 7) {
      return {
        barcode, prefix: '', month: '', day: '',
        productionDate: '', workshopCode: 0, workshopName: '',
        batchNoSuffix: '', packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: `产品代码长度错误: 应为7位，实际为${productCode.length}位`,
      };
    }

    const packCode = parseInt(productCode.slice(4));
    if (packCode < 0 || packCode > 999) {
      return {
        barcode, prefix: '', month: '', day: '',
        productionDate: '', workshopCode: 0, workshopName: '',
        batchNoSuffix: '', packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: `包号编码超出范围: ${packCode}(应在0-999)`,
      };
    }

    const workshopCode = parseInt(productCode[0]);
    if (workshopCode < 1 || workshopCode > 7) {
      return {
        barcode, prefix: '', month: '', day: '',
        productionDate: '', workshopCode: 0, workshopName: '',
        batchNoSuffix: '', packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: `车间代码超出范围: ${workshopCode}(应在1-7)`,
      };
    }

    const yy = parts[3].slice(0, 2);
    const mm = parts[3].slice(2, 4);
    const dd = parts[3].slice(4, 6);

    return {
      barcode,
      prefix: parts[0],
      month: parts[1],
      day: parts[2],
      productionDate: `20${yy}-${mm}-${dd}`,
      workshopCode,
      workshopName: WORKSHOP_MAP[workshopCode] || `未知车间(${workshopCode})`,
      batchNoSuffix: productCode.slice(1, 4),
      packCode,
      expectedPackNo: this.decodePackNo(packCode),
      netWeightEncoded: parseInt(parts[5]),
      expectedNetWeight: parseInt(parts[5]) / 10,
      parsed: true,
      message: '解析成功',
    };
  }

  /**
   * 包号编码转换
   */
  decodePackNo(code: number): string {
    if (code < 0 || code > 999) {
      throw new Error(`包号编码超出范围: ${code}(应在0-999)`);
    }
    return code.toString();
  }

  /**
   * 验证条形码格式
   */
  validateFormat(barcode: string): { valid: boolean; message?: string } {
    const parts = barcode.trim().split(/\s+/);
    if (parts.length !== 6) {
      return { valid: false, message: '条形码应为6段，以空格分隔' };
    }

    const [prefix, month, day, dateCode, productCode, weightCode] = parts;

    if (!/^\d{3}$/.test(prefix)) return { valid: false, message: '前缀应为3位数字' };
    if (!/^\d{2}$/.test(month)) return { valid: false, message: '月应为2位数字' };
    if (!/^\d{2}$/.test(day)) return { valid: false, message: '日应为2位数字' };
    if (!/^\d{6}$/.test(dateCode)) return { valid: false, message: '日期代码应为6位数字(YYMMDD)' };
    if (!/^\d{7}$/.test(productCode)) return { valid: false, message: '产品代码应为7位数字' };
    if (!/^\d{5}$/.test(weightCode)) return { valid: false, message: '重量代码应为5位数字' };

    return { valid: true };
  }

  /**
   * 从条形码生成批号
   */
  generateBatchNoFromBarcode(barcode: string): string | null {
    const parsed = this.parse(barcode);
    if (!parsed || !parsed.parsed) return null;

    const yearShort = parsed.productionDate ? parsed.productionDate.slice(2, 4) : '';
    return `${yearShort}-${parsed.workshopCode}-${parsed.batchNoSuffix}`;
  }

  /**
   * 从批号提取条形码信息
   * 批号格式: XX-X-XXX[J]
   * @param batchNo - 批号
   * @returns 车间码、批次后缀、年份(后2位) 或 null
   */
  extractBarcodeInfoFromBatchNo(batchNo: string): { workshopCode: number; batchSuffix: string; yearShort: string } | null {
    const match = batchNo.match(/^(\d{2})-+(\d{1})-+(\d{3})J?$/);
    if (!match) return null;

    return {
      yearShort: match[1],
      workshopCode: parseInt(match[2]),
      batchSuffix: match[3],
    };
  }

  /**
   * 验证批号与条形码一致性
   * @param batchNo - 批号
   * @param barcode - 条形码
   * @returns 是否一致
   */
  validateBatchNoVsBarcode(batchNo: string, barcode: string): boolean {
    const batchInfo = this.extractBarcodeInfoFromBatchNo(batchNo);
    const barcodeInfo = this.parse(barcode);

    if (!batchInfo || !barcodeInfo || !barcodeInfo.parsed) return false;

    return (
      batchInfo.workshopCode === barcodeInfo.workshopCode &&
      batchInfo.batchSuffix === barcodeInfo.batchNoSuffix
    );
  }
}
