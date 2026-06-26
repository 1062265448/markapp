import { Injectable } from '@nestjs/common';
import { WORKSHOP_MAP } from '../../nickel/types/nickel.types';

export interface BarcodeParseResult {
  barcode: string;
  prefix: string;                // N1N2N3: 企业代码
  productCategoryCode: string;   // N4N5: 产品类别代码
  productGradeCode: string;      // N6N7: 产品品级代码
  productionDate: string;        // 从 N8-N13 解出的完整日期
  productionDateCode: string;     // N8N9N10N11N12N13: 生产日期代码(原始6位)
  workshopCode: number;          // ①: 车间代码
  workshopName: string;
  batchNoSuffix: string;         // ②③④: 批号后三位数字（不含J）
  batchNoSuffixLetter: string;   // J 或空，由包号编码区间决定
  packCode: number;              // ⑤⑥⑦: 包号编码(原始值)
  expectedPackNo: string;        // 解码后的实际包号
  netWeightEncoded: number;      // N21-N25: 捆净重代码
  expectedNetWeight: number;      // 解码后的净重(kg)
  parsed: boolean;
  message: string;
}

@Injectable()
export class BarcodeParserService {
  /**
   * 解析条形码字符串
   *
   * 有色金属冶炼产品统一行业编码（25位）：
   * N1N2N3  N4N5  N6N7  N8N9N10N11N12N13  N14N15N16N17N18N19N20  N21N22N23N24N25
   * 企业代码 产品类别 产品品级 生产日期代码(YYMMDD)  产品唯一生产序号代码     捆净重代码
   *
   * 七位产品生产序号代码 N14-N20：①②③④⑤⑥⑦
   * ①: 车间(1-7)
   * ②③④: 批号后三位（不含J/t/s）
   * ⑤⑥⑦: 包号编码
   *   0-200   → 正常包号
   *   201-400 → 一期机组：包号 = code - 200，批号+J
   *   401-600 → 二期机组：包号 = code - 400，批号+J
   *   601-800 → 三期机组：包号 = code - 600，批号+J
   */
  parse(barcode: string): BarcodeParseResult | null {
    let parts: string[];
    const trimmed = barcode.trim();

    if (trimmed.includes(' ')) {
      parts = trimmed.split(/\s+/);
    } else if (/^\d{25}$/.test(trimmed)) {
      parts = [
        trimmed.slice(0, 3),   // N1N2N3: 企业代码
        trimmed.slice(3, 5),   // N4N5: 产品类别代码
        trimmed.slice(5, 7),   // N6N7: 产品品级代码
        trimmed.slice(7, 13),  // N8-N13: 生产日期代码(YYMMDD)
        trimmed.slice(13, 20), // N14-N20: 产品唯一生产序号代码(7位)
        trimmed.slice(20, 25), // N21-N25: 捆净重代码
      ];
    } else {
      return {
        barcode, prefix: '', productCategoryCode: '', productGradeCode: '',
        productionDate: '', productionDateCode: '',
        workshopCode: 0, workshopName: '',
        batchNoSuffix: '', batchNoSuffixLetter: '',
        packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: '条形码格式错误: 应为空格分隔6段或连续25位数字',
      };
    }

    if (parts.length !== 6) {
      return {
        barcode, prefix: '', productCategoryCode: '', productGradeCode: '',
        productionDate: '', productionDateCode: '',
        workshopCode: 0, workshopName: '',
        batchNoSuffix: '', batchNoSuffixLetter: '',
        packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: '条形码格式错误: 应为6段，以空格分隔',
      };
    }

    const productCode = parts[4]; // N14-N20: 7位产品生产序号
    if (productCode.length !== 7) {
      return {
        barcode, prefix: '', productCategoryCode: '', productGradeCode: '',
        productionDate: '', productionDateCode: '',
        workshopCode: 0, workshopName: '',
        batchNoSuffix: '', batchNoSuffixLetter: '',
        packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: `产品代码长度错误: 应为7位，实际为${productCode.length}位`,
      };
    }

    const packCode = parseInt(productCode.slice(4), 10); // ⑤⑥⑦: 包号编码
    if (packCode < 0 || packCode > 800) {
      return {
        barcode, prefix: '', productCategoryCode: '', productGradeCode: '',
        productionDate: '', productionDateCode: '',
        workshopCode: 0, workshopName: '',
        batchNoSuffix: '', batchNoSuffixLetter: '',
        packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: `包号编码超出范围: ${packCode}(应在0-800)`,
      };
    }

    const workshopCode = parseInt(productCode[0], 10); // ①: 车间代码
    if (workshopCode < 1 || workshopCode > 7) {
      return {
        barcode, prefix: '', productCategoryCode: '', productGradeCode: '',
        productionDate: '', productionDateCode: '',
        workshopCode: 0, workshopName: '',
        batchNoSuffix: '', batchNoSuffixLetter: '',
        packCode: 0, expectedPackNo: '',
        netWeightEncoded: 0, expectedNetWeight: 0,
        parsed: false,
        message: `车间代码超出范围: ${workshopCode}(应在1-7)`,
      };
    }

    // 日期来自 N8-N13 (YYMMDD)
    const productionDateCode = parts[3];
    const yy = productionDateCode.slice(0, 2);
    const mm = productionDateCode.slice(2, 4);
    const dd = productionDateCode.slice(4, 6);

    // 包号暂不解码（条码原始值即为包号，解码规则待后续启用）
    // const { packNo: expectedPackNo, batchNoSuffixLetter } = this.decodePackNo(packCode);
    const expectedPackNo = packCode.toString();
    const batchNoSuffixLetter = ''; // 解码规则未启用，暂不加J后缀

    return {
      barcode,
      prefix: parts[0],
      productCategoryCode: parts[1],
      productGradeCode: parts[2],
      productionDate: `20${yy}-${mm}-${dd}`,
      productionDateCode,
      workshopCode,
      workshopName: WORKSHOP_MAP[workshopCode] || `未知车间(${workshopCode})`,
      batchNoSuffix: productCode.slice(1, 4), // ②③④: 批号后三位数字
      batchNoSuffixLetter,                     // J 或空，由包号编码区间决定
      packCode,
      expectedPackNo,
      netWeightEncoded: parseInt(parts[5], 10),
      expectedNetWeight: parseInt(parts[5], 10) / 10,
      parsed: true,
      message: '解析成功',
    };
  }

  /**
   * 包号编码转换
   * 规则：
   *   0-200   → 正常包号（数字本身），批号无后缀
   *   201-400 → 一期机组：包号 = code - 200，批号+J
   *   401-600 → 二期机组：包号 = code - 400，批号+J
   *   601-800 → 三期机组：包号 = code - 600，批号+J
   */
  decodePackNo(code: number): { packNo: string; batchNoSuffixLetter: string } {
    if (code < 0 || code > 800) {
      throw new Error(`包号编码超出范围: ${code}(应在0-800)`);
    }
    if (code <= 200) {
      return { packNo: code.toString(), batchNoSuffixLetter: '' };
    } else if (code <= 400) {
      return { packNo: (code - 200).toString(), batchNoSuffixLetter: 'J' };
    } else if (code <= 600) {
      return { packNo: (code - 400).toString(), batchNoSuffixLetter: 'J' };
    } else {
      return { packNo: (code - 600).toString(), batchNoSuffixLetter: 'J' };
    }
  }

  /**
   * 验证条形码格式
   */
  validateFormat(barcode: string): { valid: boolean; message?: string } {
    const parts = barcode.trim().split(/\s+/);
    if (parts.length !== 6) {
      return { valid: false, message: '条形码应为6段，以空格分隔' };
    }

    const [prefix, productCategory, productGrade, dateCode, productCode, weightCode] = parts;

    if (!/^\d{3}$/.test(prefix)) return { valid: false, message: '企业代码应为3位数字' };
    if (!/^\d{2}$/.test(productCategory)) return { valid: false, message: '产品类别代码应为2位数字' };
    if (!/^\d{2}$/.test(productGrade)) return { valid: false, message: '产品品级代码应为2位数字' };
    if (!/^\d{6}$/.test(dateCode)) return { valid: false, message: '生产日期代码应为6位数字(YYMMDD)' };
    if (!/^\d{7}$/.test(productCode)) return { valid: false, message: '产品生产序号代码应为7位数字' };
    if (!/^\d{5}$/.test(weightCode)) return { valid: false, message: '捆净重代码应为5位数字' };

    return { valid: true };
  }

  /**
   * 从条形码生成完整批号（含后缀J）
   * 批号格式: YY-N-NNN[J]
   * 后缀J由包号编码区间(>200)决定
   */
  generateBatchNoFromBarcode(barcode: string): string | null {
    const parsed = this.parse(barcode);
    if (!parsed || !parsed.parsed) return null;

    const yearShort = parsed.productionDate ? parsed.productionDate.slice(2, 4) : '';
    const suffix = parsed.batchNoSuffixLetter || '';
    return `${yearShort}-${parsed.workshopCode}-${parsed.batchNoSuffix}${suffix}`;
  }

  /**
   * 从批号提取条形码信息
   * 批号格式: XX-X-XXX[J]
   * @param batchNo - 批号
   * @returns 车间码、批次后缀(数字)、年份(后2位)、后缀字母 或 null
   */
  extractBarcodeInfoFromBatchNo(batchNo: string): { workshopCode: number; batchSuffix: string; yearShort: string; suffixLetter: string } | null {
    const match = batchNo.match(/^(\d{2})-+(\d{1})-+(\d{3})([JjTtSs])?$/);
    if (!match) return null;

    return {
      yearShort: match[1],
      workshopCode: parseInt(match[2], 10),
      batchSuffix: match[3],
      suffixLetter: match[4] ? match[4].toUpperCase() : '',
    };
  }

  /**
   * 验证批号与条形码一致性
   * 批号后缀字母(J)必须与条码包号编码区间一致
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
      batchInfo.batchSuffix === barcodeInfo.batchNoSuffix &&
      batchInfo.suffixLetter === barcodeInfo.batchNoSuffixLetter
    );
  }
}
