import { Injectable } from '@nestjs/common';
import { BarcodeParserService } from './barcode-parser.service';
import { NickelLabelData, CheckResult, CorrectionRecord } from '../../nickel/types/nickel.types';

@Injectable()
export class RuleCheckerService {
  constructor(private readonly barcodeParserService: BarcodeParserService) {}

  /**
   * 执行完整规则检查
   */
  check(data: NickelLabelData, barcode?: string): CheckResult[] {
    const results: CheckResult[] = [];

    // P1: 格式校验
    results.push(this.checkBatchNo(data.batchNo));
    results.push(this.checkPackNo(data.packNo));
    results.push(this.checkDate(data.productionDate));
    if (data.pieces !== null) results.push(this.checkPieces(data.pieces));
    results.push(...this.checkWeight(data.netWeight, data.grossWeight));
    results.push(this.checkStandardFormat(data.standard));
    results.push(this.checkGrossVsNet(data.netWeight, data.grossWeight));
    results.push(this.checkBrandConsistency(data.productName, data.brand));
    results.push(this.checkEnglishCase(data.brand));
    results.push(this.checkSymbolHalfFullWidth(data.brand, data.standard));
    results.push(this.checkAddressFormat(data.address));

    // 条形码交叉验证
    if (barcode) {
      const parsed = this.barcodeParserService.parse(barcode);
      if (parsed && parsed.parsed) {
        results.push(this.checkBatchVsBarcode(data.batchNo, parsed));
        results.push(this.checkPackVsBarcode(data.packNo, parsed));
        results.push(this.checkDateVsBarcode(data.productionDate, parsed));
        results.push(this.checkWeightVsBarcode(data.netWeight, parsed));

        const workshopCode = this.extractWorkshopCodeFromBatchNo(data.batchNo);
        if (workshopCode !== null) {
          results.push(this.checkWorkshopProductConsistency(workshopCode, data.productName, data.batchNo));
        }
      }
    }

    return results;
  }

  checkBatchNo(batchNo: string | null): CheckResult {
    if (!batchNo) {
      return { field: 'batchNo', ruleType: 'format', passed: false, severity: 'error', original: null, message: '批号未识别' };
    }

    const regex = /^\d{2}-+\d{1}-+\d{3}J?$/;
    if (!regex.test(batchNo)) {
      return { field: 'batchNo', ruleType: 'format', passed: false, severity: 'error', original: batchNo, message: '批号格式应为 XX-X-XXX[J]（如 26-1-109 或 26-1-109J），连字符不可省略' };
    }

    const match = batchNo.match(/^\d{2}-+(\d{1})-+\d{3}J?$/);
    if (match) {
      const ws = parseInt(match[1], 10);
      if (ws < 1 || ws > 7) {
        return { field: 'batchNo', ruleType: 'range', passed: false, severity: 'error', original: batchNo, message: `车间代码 ${ws} 不在有效范围(1-7)内（提示：1和7容易混淆，请确认是否为误识别）` };
      }
    }

    const yearMatch = batchNo.match(/^(\d{2})-+\d{1}-+\d{3}J?$/);
    if (yearMatch) {
      const yearShort = parseInt(yearMatch[1], 10);
      if (yearShort < 20 || yearShort > 30) {
        return { field: 'batchNo', ruleType: 'range', passed: false, severity: 'warning', original: batchNo, message: `年份 ${yearShort} 不在预期范围(20-30)内` };
      }
    }

    return { field: 'batchNo', ruleType: 'format', passed: true, severity: 'info', message: '批号格式正确' };
  }

  checkPackNo(packNo: string | null): CheckResult {
    if (!packNo) {
      return { field: 'packNo', ruleType: 'format', passed: false, severity: 'error', original: null, message: '包号未识别' };
    }

    const regex = /^\d+(J)?$/;
    if (!regex.test(packNo)) {
      return { field: 'packNo', ruleType: 'format', passed: false, severity: 'error', original: packNo, message: '包号格式应为正整数或正整数+J后缀' };
    }

    const num = parseInt(packNo.replace(/J/, ''), 10);
    if (num < 1 || num > 9999) {
      return { field: 'packNo', ruleType: 'range', passed: false, severity: 'error', original: packNo, message: `包号数值 ${num} 超出有效范围(1-9999)` };
    }

    return { field: 'packNo', ruleType: 'format', passed: true, severity: 'info', message: '包号格式正确' };
  }

  checkDate(dateStr: string | null): CheckResult {
    if (!dateStr) {
      return { field: 'productionDate', ruleType: 'format', passed: false, severity: 'error', original: null, message: '日期未识别' };
    }

    const regex = /^\d{4}[-\/]\d{2}[-\/]\d{2}$/;
    if (!regex.test(dateStr)) {
      return { field: 'productionDate', ruleType: 'format', passed: false, severity: 'error', original: dateStr, message: '日期格式应为 YYYY-MM-DD（月份和日期必须为两位数字）' };
    }

    const parts = dateStr.split(/[-\/]/);
    if (parts.length !== 3 || parts[1].length !== 2 || parts[2].length !== 2) {
      return { field: 'productionDate', ruleType: 'format', passed: false, severity: 'error', original: dateStr, message: '日期格式应为 YYYY-MM-DD' };
    }

    const normalized = dateStr.replace(/\//g, '-');
    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
      return { field: 'productionDate', ruleType: 'range', passed: false, severity: 'error', original: dateStr, message: '无效日期' };
    }

    const [inputYear, inputMonth, inputDay] = normalized.split('-').map(Number);
    const parsedYear = date.getFullYear();
    const parsedMonth = date.getMonth() + 1;
    const parsedDay = date.getDate();

    if (parsedYear !== inputYear || parsedMonth !== inputMonth || parsedDay !== inputDay) {
      return { field: 'productionDate', ruleType: 'range', passed: false, severity: 'error', original: dateStr, message: `无效日期: ${inputYear}-${inputMonth}-${inputDay} 不存在` };
    }

    if (inputYear < 2020 || inputYear > 2030) {
      return { field: 'productionDate', ruleType: 'range', passed: false, severity: 'warning', original: dateStr, message: `年份 ${inputYear} 不在预期范围(2020-2030)内` };
    }

    return { field: 'productionDate', ruleType: 'format', passed: true, severity: 'info', message: '日期格式正确' };
  }

  checkPieces(pieces: number | null): CheckResult {
    if (pieces === null || pieces === undefined || pieces < 1 || pieces > 999) {
      return { field: 'pieces', ruleType: 'range', passed: false, severity: 'error', original: String(pieces), message: '块数应在 1-999 范围内' };
    }
    return { field: 'pieces', ruleType: 'range', passed: true, severity: 'info', message: '块数正常' };
  }

  checkStandardFormat(standard: string | null): CheckResult {
    if (!standard) {
      return { field: 'standard', ruleType: 'format', passed: false, severity: 'warning', original: null, message: '标准号未识别' };
    }
    // v2.3.6：支持 GB/T6516-2025 与 GB/T 6516-2025（兼容空格）
    if (/^GB\/T\s?6516-\d{4}$/.test(standard)) {
      return { field: 'standard', ruleType: 'format', passed: true, severity: 'info', message: '标准号格式正确' };
    }
    return {
      field: 'standard', ruleType: 'format', passed: false, severity: 'error', original: standard,
      corrected: 'GB/T6516-2025',
      message: `标准号 "${standard}" 格式有误，预期为 "GB/T6516-2025"`,
    };
  }

  checkWeight(net: number | null, gross: number | null): CheckResult[] {
    const results: CheckResult[] = [];

    if (net === null) {
      results.push({ field: 'netWeight', ruleType: 'format', passed: false, severity: 'error', original: null, message: '净重未识别' });
    } else if (net < 1000 || net > 2500) {
      const multiplied = net * 1000;
      const hint = (multiplied >= 1000 && multiplied <= 2500)
        ? `（提示：${net} 可能是 ${multiplied} 的OCR小数点错位）`
        : '（合理范围 1000-2500kg）';
      results.push({
        field: 'netWeight', ruleType: 'range', passed: false,
        severity: (multiplied >= 1000 && multiplied <= 2500) ? 'warning' : 'error',
        original: String(net),
        corrected: (multiplied >= 1000 && multiplied <= 2500) ? String(multiplied) : undefined,
        message: `净重 ${net}Kg 超出合理范围${hint}`,
      });
    } else {
      results.push({ field: 'netWeight', ruleType: 'range', passed: true, severity: 'info', message: '净重正常' });
    }

    if (gross !== null) {
      if (gross < 1000 || gross > 2500) {
        const multiplied = gross * 1000;
        const hint = (multiplied >= 1000 && multiplied <= 2500)
          ? `（提示：${gross} 可能是 ${multiplied} 的OCR小数点错位）`
          : '（合理范围 1000-2500kg）';
        results.push({
          field: 'grossWeight', ruleType: 'range', passed: false,
          severity: (multiplied >= 1000 && multiplied <= 2500) ? 'warning' : 'error',
          original: String(gross),
          corrected: (multiplied >= 1000 && multiplied <= 2500) ? String(multiplied) : undefined,
          message: `毛重 ${gross}Kg 超出合理范围${hint}`,
        });
      } else {
        results.push({ field: 'grossWeight', ruleType: 'range', passed: true, severity: 'info', message: '毛重正常' });
      }
    }

    return results;
  }

  checkGrossVsNet(net: number | null, gross: number | null): CheckResult {
    if (net === null || gross === null) {
      return { field: 'grossVsNet', ruleType: 'consistency', passed: false, severity: 'warning', original: null, message: '无法比较(数据缺失)' };
    }
    if (gross < net) {
      return { field: 'grossWeight', ruleType: 'consistency', passed: false, severity: 'error', original: `毛重${gross} < 净重${net}`, message: '毛重不能小于净重(物理约束)' };
    }
    return { field: 'grossVsNet', ruleType: 'consistency', passed: true, severity: 'info', message: '毛重≥净重，正常' };
  }

  checkBrandConsistency(productName: string | null, brand: string | null): CheckResult {
    if (!productName || !brand) {
      return { field: 'brand', ruleType: 'consistency', passed: false, severity: 'warning', original: null, message: '产品名称或品牌未识别' };
    }

    // v2.3.6：业务常量场景 — 中文品牌"金川"或英文品牌都接受
    if (brand === '金川') {
      return { field: 'brand', ruleType: 'consistency', passed: true, severity: 'info', message: '品牌（中文常量）校验通过' };
    }

    const expectedBrand = productName.includes('电积')
      ? 'JINTUO GRADE 1(EW)'
      : 'JINTUO GRADE 1';

    const normalizedBrand = brand.replace(/[（）()]/g, '').replace(/I/g, '1').trim();
    const normalizedExpected = expectedBrand.replace(/[（）()]/g, '').replace(/I/g, '1').trim();

    if (normalizedBrand !== normalizedExpected) {
      return { field: 'brand', ruleType: 'consistency', passed: false, severity: 'error', original: brand, corrected: expectedBrand, message: `品牌 "${brand}" 与产品类型 "${productName}" 不匹配，预期为 "${expectedBrand}"` };
    }

    return { field: 'brand', ruleType: 'consistency', passed: true, severity: 'info', message: '品牌一致性校验通过' };
  }

  checkEnglishCase(brand: string | null): CheckResult {
    if (!brand) {
      return { field: 'brand', ruleType: 'format', passed: false, severity: 'warning', original: brand, message: '品牌未识别' };
    }
    // v2.3.6：中文常量不算"英文大小写错误"
    if (/^[一-鿿]+$/.test(brand)) {
      return { field: 'brand', ruleType: 'format', passed: true, severity: 'info', message: '品牌（中文字符）跳过英文大小写检查' };
    }
    const englishPart = brand.replace(/[（）()]/g, '');
    const upperEnglish = englishPart.toUpperCase();
    if (englishPart !== upperEnglish) {
      const corrected = brand.replace(englishPart, upperEnglish);
      return { field: 'brand', ruleType: 'format', passed: false, severity: 'warning', original: brand, corrected, message: '品牌应为全大写字母' };
    }
    return { field: 'brand', ruleType: 'format', passed: true, severity: 'info', message: '品牌大小写正确' };
  }

  checkAddressFormat(address: string | null): CheckResult {
    if (!address) {
      return { field: 'address', ruleType: 'format', passed: false, severity: 'warning', original: address, message: '地址未识别' };
    }

    const expectedKeywords = ['金昌市', '金川区', '北京路'];
    const missingKeywords = expectedKeywords.filter(keyword => !address.includes(keyword));

    if (missingKeywords.length > 0) {
      return { field: 'address', ruleType: 'format', passed: false, severity: 'warning', original: address, message: `地址可能不完整，缺少关键信息: ${missingKeywords.join('、')}` };
    }

    const hasEnglish = address.includes('Beijing Road') || address.includes('Jinchuan District') || address.includes('Jinchang');

    return { field: 'address', ruleType: 'format', passed: true, severity: 'info', message: hasEnglish ? '地址格式正确(含中英文)' : '地址中文部分正确' };
  }

  /**
   * 符号全半角检查
   * 品牌：括号应为半角
   * 标准：短横线应为半角
   */
  checkSymbolHalfFullWidth(brand: string | null, standard: string | null): CheckResult {
    const results: CheckResult[] = [];

    // 品牌括号检查
    if (brand) {
      const hasFullWidthParen = brand.includes('\uFF08') || brand.includes('\uFF09');
      const hasHalfWidthParen = brand.includes('(') || brand.includes(')');

      if (hasFullWidthParen) {
        const corrected = brand.replace(/\uFF08/g, '(').replace(/\uFF09/g, ')');
        results.push({
          field: 'brand', ruleType: 'format', passed: true, severity: 'info',
          original: brand, corrected,
          message: '品牌括号为全角，已自动纠正为半角',
        });
      } else if (hasHalfWidthParen) {
        results.push({ field: 'brand', ruleType: 'format', passed: true, severity: 'info', message: '品牌括号正确(半角)' });
      }
    }

    // 标准短横线检查
    if (standard) {
      const hasFullWidthDash = standard.includes('\uFF0D') || standard.includes('\u2014');
      const hasHalfWidthDash = standard.includes('-');

      if (hasFullWidthDash) {
        const corrected = standard.replace(/\uFF0D/g, '-').replace(/\u2014/g, '-');
        results.push({
          field: 'standard', ruleType: 'format', passed: false, severity: 'error',
          original: standard, corrected,
          message: '标准短横线应为半角（英文）短横线。OCR易将全角短横线误识别为全角破折号，已自动纠正',
        });
      } else if (hasHalfWidthDash) {
        results.push({ field: 'standard', ruleType: 'format', passed: true, severity: 'info', message: '标准短横线正确(半角)' });
      }
    }

    if (results.length > 0) {
      const errorResult = results.find(r => r.severity === 'error');
      if (errorResult) return errorResult;
      const warningResult = results.find(r => r.severity === 'warning');
      if (warningResult) return warningResult;
      return results[0];
    }

    return { field: 'symbol', ruleType: 'format', passed: true, severity: 'info', message: '符号格式正确' };
  }

  checkBatchVsBarcode(batchNo: string | null, barcode: any): CheckResult {
    if (!batchNo) {
      return { field: 'batchNo', ruleType: 'crossField', passed: false, severity: 'error', original: batchNo, message: '批号未识别，无法与条形码比较' };
    }
    const match = batchNo.match(/^(\d{2})-+(\d{1})-+(\d{3})(J?)$/);
    if (!match) {
      return { field: 'batchNo', ruleType: 'crossField', passed: false, severity: 'error', original: batchNo, message: '批号格式无效，无法与条形码比较' };
    }
    const wsFromBatch = parseInt(match[2], 10);
    const suffixFromBatch = match[3];
    const wsMatch = wsFromBatch === barcode.workshopCode;
    const suffixMatch = suffixFromBatch === barcode.batchNoSuffix;

    if (!wsMatch || !suffixMatch) {
      return { field: 'barcode', ruleType: 'crossField', passed: false, severity: 'error', original: batchNo, message: `条形码与批号不一致:车间代码(批号${wsFromBatch} vs 条码${barcode.workshopCode})，后三位(批号${suffixFromBatch} vs 条码${barcode.batchNoSuffix})` };
    }
    return { field: 'batchNo', ruleType: 'crossField', passed: true, severity: 'info', message: '批号与条形码一致' };
  }

  checkPackVsBarcode(packNo: string | null, barcode: any): CheckResult {
    if (!packNo) {
      return { field: 'packNo', ruleType: 'crossField', passed: false, severity: 'error', original: null, message: '包号未识别' };
    }
    const { packNo: expectedPack, batchNoSuffixLetter } = this.barcodeParserService.decodePackNo(barcode.packCode);
    if (packNo !== expectedPack) {
      return { field: 'packNo', ruleType: 'crossField', passed: false, severity: 'error', original: packNo, corrected: expectedPack, message: `包号与条形码不一致:识别为 "${packNo}"，条形码编码 ${barcode.packCode} 对应 "${expectedPack}"` };
    }
    return { field: 'packNo', ruleType: 'crossField', passed: true, severity: 'info', message: '包号与条形码一致' };
  }

  checkDateVsBarcode(dateStr: string | null, barcode: any): CheckResult {
    if (!dateStr) {
      return { field: 'barcode', ruleType: 'crossField', passed: false, severity: 'error', original: null, message: '日期未识别' };
    }
    const normalized = dateStr.replace(/\//g, '-');

    // 支持 productionDateCode 或 productionDate 两种来源
    let dateFromBarcode: string;
    if (barcode.productionDateCode) {
      const code = barcode.productionDateCode;
      dateFromBarcode = `20${code.slice(0,2)}-${code.slice(2,4)}-${code.slice(4,6)}`;
    } else if (barcode.productionDate) {
      dateFromBarcode = barcode.productionDate;
    } else {
      return { field: 'barcode', ruleType: 'crossField', passed: false, severity: 'warning', original: dateStr, message: '条形码中无日期信息，无法比较' };
    }

    if (normalized !== dateFromBarcode) {
      return { field: 'barcode', ruleType: 'crossField', passed: false, severity: 'error', original: dateStr, message: `日期与条形码不一致:OCR识别为 "${dateStr}"，条码中为 "${dateFromBarcode}"` };
    }
    return { field: 'productionDate', ruleType: 'crossField', passed: true, severity: 'info', message: '日期与条形码一致' };
  }

  checkWeightVsBarcode(netWeight: number | null, barcode: any): CheckResult {
    if (netWeight === null) {
      return { field: 'netWeight', ruleType: 'crossField', passed: false, severity: 'error', original: null, message: '净重未识别' };
    }
    const encodedWeight = parseInt(barcode.netWeightEncoded, 10);
    const expectedWeight = encodedWeight / 10;

    if (Math.abs(netWeight - expectedWeight) > 0.1) {
      return { field: 'barcode', ruleType: 'crossField', passed: false, severity: 'error', original: String(netWeight), message: `净重与条形码不一致:OCR识别为 ${netWeight}Kg，条码编码 ${barcode.netWeightEncoded} 对应 ${expectedWeight}Kg` };
    }
    return { field: 'netWeight', ruleType: 'crossField', passed: true, severity: 'info', message: '净重与条形码一致' };
  }

  extractWorkshopCodeFromBatchNo(batchNo: string | null): number | null {
    if (!batchNo) return null;
    const match = batchNo.match(/^\d{2}-+(\d{1})-+\d{3}J?$/);
    return match ? parseInt(match[1], 10) : null;
  }

  checkWorkshopProductConsistency(workshopCode: number, productName: string | null, batchNo: string | null): CheckResult {
    if (!productName) {
      return { field: 'productName', ruleType: 'consistency', passed: false, severity: 'warning', original: null, message: '产品名称未识别' };
    }

    const isElectrolytic = productName.includes('电解');
    const isElectrowinning = productName.includes('电积');

    switch (workshopCode) {
      case 1:
      case 2:
      case 3:
        if (!isElectrolytic) {
          return { field: 'productName', ruleType: 'consistency', passed: false, severity: 'error', original: productName, message: `车间${workshopCode}生产电解镍，但识别为${productName}` };
        }
        return { field: 'productName', ruleType: 'consistency', passed: true, severity: 'info', message: `车间${workshopCode}:电解一/二/三车间电解镍` };
      case 4:
        if (!isElectrolytic) {
          return { field: 'productName', ruleType: 'consistency', passed: false, severity: 'error', original: productName, message: `车间4生产电解镍(128槽)，但识别为${productName}` };
        }
        return { field: 'productName', ruleType: 'consistency', passed: true, severity: 'info', message: '车间4:电积一车间电解镍(128槽)' };
      case 5:
        if (!isElectrowinning) {
          return { field: 'productName', ruleType: 'consistency', passed: false, severity: 'warning', original: productName, message: `车间5生产电积镍(已停产)，但识别为${productName}` };
        }
        return { field: 'productName', ruleType: 'consistency', passed: true, severity: 'info', message: '车间5:电解三车间电积镍(停产)' };
      case 6:
      case 7:
        if (!isElectrowinning) {
          return { field: 'productName', ruleType: 'consistency', passed: false, severity: 'error', original: productName, message: `车间${workshopCode}生产电积镍，但识别为${productName}` };
        }
        return { field: 'productName', ruleType: 'consistency', passed: true, severity: 'info', message: `车间${workshopCode}:电积一/二车间` };
      default:
        return { field: 'batchNo', ruleType: 'consistency', passed: false, severity: 'error', original: batchNo, message: `车间代码${workshopCode}不在有效范围(1-7)内` };
    }
  }

  /**
   * 自动纠正常见OCR错误
   */
  autoCorrect(data: any, barcode?: string): { corrected: any; corrections: CorrectionRecord[]; correctedBarcode?: string } {
    const corrections: CorrectionRecord[] = [];
    const corrected = { ...data };
    let correctedBarcode = barcode;

    if (corrected.batchNo) {
      const before = corrected.batchNo;
      corrected.batchNo = corrected.batchNo
        .replace(/[Oo]/g, '0')
        .replace(/[lI]/g, '1')
        .replace(/[Ss]/g, '5')
        .replace(/(\d{2}-+\d{1}-+\d{3})1$/, '$1J');
      if (before !== corrected.batchNo) {
        corrections.push({ field: 'batchNo', original: before, corrected: corrected.batchNo, rule: 'charConfusion' });
      }
    }

    if (corrected.packNo) {
      const before = corrected.packNo;
      corrected.packNo = corrected.packNo.replace(/[Oo]/g, '0').replace(/[lI]/g, '1').replace(/[Ss]/g, '5');
      if (before !== corrected.packNo) {
        corrections.push({ field: 'packNo', original: before, corrected: corrected.packNo, rule: 'charConfusion' });
      }
    }

    if (corrected.productionDate) {
      const before = corrected.productionDate;
      corrected.productionDate = corrected.productionDate.replace(/[Oo]/g, '0').replace(/[lI]/g, '1').replace(/\//g, '-');
      if (before !== corrected.productionDate) {
        corrections.push({ field: 'productionDate', original: before, corrected: corrected.productionDate, rule: 'charConfusion' });
      }
    }

    if (typeof corrected.pieces === 'string') {
      const before = corrected.pieces;
      corrected.pieces = parseInt(corrected.pieces.replace(/[Ss]/g, '5'), 10);
      if (before !== String(corrected.pieces)) {
        corrections.push({ field: 'pieces', original: before, corrected: String(corrected.pieces), rule: 'charConfusion' });
      }
    }

    // 车间-品名一致性自动纠正
    if (corrected.batchNo && correctedBarcode) {
      const batchMatch = corrected.batchNo.match(/^\d{2}-+(\d{1})-+\d{3}J?$/);
      if (batchMatch) {
        const workshopFromBatch = parseInt(batchMatch[1], 10);
        const barcodeParts = correctedBarcode.trim().split(/\s+/);
        if (barcodeParts.length === 6) {
          const productCode = barcodeParts[4];
          if (productCode && productCode.length === 7) {
            const wsFromBarcode = parseInt(productCode[0], 10);
            if (wsFromBarcode !== workshopFromBatch && workshopFromBatch >= 1 && workshopFromBatch <= 7) {
              const correctedProductCode = String(workshopFromBatch) + productCode.slice(1);
              correctedBarcode = [
                barcodeParts[0], barcodeParts[1], barcodeParts[2],
                barcodeParts[3], correctedProductCode, barcodeParts[5],
              ].join(' ');
              corrections.push({ field: 'barcode', original: barcode || '', corrected: correctedBarcode, rule: 'workshopConsistency' });
            }
          }
        }
      }
    }

    // 从批号提取车间代码（增强版：批号+条码双向验证）
    if (corrected.productName && corrected.batchNo) {
      const batchMatch = corrected.batchNo.match(/^\d{2}-+(\d{1})-+\d{3}J?$/);
      if (batchMatch) {
        const workshopFromBatch = parseInt(batchMatch[1], 10);

        // 从条形码提取车间代码（可选，有则加入交叉验证）
        let workshopFromBarcode: number | null = null;
        if (correctedBarcode) {
          const barcodeParts = correctedBarcode.trim().split(/\s+/);
          if (barcodeParts.length === 6) {
            const productCode = barcodeParts[4];
            if (productCode && productCode.length === 7) {
              const bc = parseInt(productCode[0], 10);
              if (bc >= 1 && bc <= 7) {
                workshopFromBarcode = bc;
              }
            }
          }
        }

        // 收集所有可用的车间来源
        const workshopSources = [workshopFromBatch];
        if (workshopFromBarcode !== null) {
          workshopSources.push(workshopFromBarcode);
        }

        // 所有来源一致时才进行品名纠正
        const allSame = workshopSources.every(w => w === workshopSources[0]);
        if (allSame) {
          const workshopCode = workshopSources[0];
          const isElectrowinning = corrected.productName.includes('电积');
          let expectedProductType: string | null = null;
          let expectedIsEW = false;

          if ([1, 2, 3, 4].includes(workshopCode)) { expectedProductType = '电解镍'; expectedIsEW = false; }
          else if ([5, 6, 7].includes(workshopCode)) { expectedProductType = '电积镍'; expectedIsEW = true; }

          if (expectedProductType && isElectrowinning !== expectedIsEW) {
            const before = corrected.productName;
            corrected.productName = expectedProductType;
            corrections.push({ field: 'productName', original: before, corrected: corrected.productName, rule: 'workshopConsistency' });

            if (corrected.brand) {
              const expectedBrand = expectedIsEW ? 'JINTUO GRADE 1(EW)' : 'JINTUO GRADE 1';
              if (corrected.brand !== expectedBrand) {
                const brandBefore = corrected.brand;
                corrected.brand = expectedBrand;
                corrections.push({ field: 'brand', original: brandBefore, corrected: corrected.brand, rule: 'workshopConsistency' });
              }
            }
          }
        }
      }
    }

    if (typeof corrected.netWeight === 'string') {
      const before = corrected.netWeight;
      corrected.netWeight = parseFloat(corrected.netWeight.replace(/[Oo]/g, '0'));
      if (before !== String(corrected.netWeight)) {
        corrections.push({ field: 'netWeight', original: before, corrected: String(corrected.netWeight), rule: 'charConfusion' });
      }
    }

    if (typeof corrected.grossWeight === 'string') {
      const before = corrected.grossWeight;
      corrected.grossWeight = parseFloat(corrected.grossWeight.replace(/[Oo]/g, '0'));
      if (before !== String(corrected.grossWeight)) {
        corrections.push({ field: 'grossWeight', original: before, corrected: String(corrected.grossWeight), rule: 'charConfusion' });
      }
    }

    // 重量范围纠错
    if (corrected.netWeight !== null && corrected.netWeight !== undefined) {
      const nw = parseFloat(corrected.netWeight);
      if (!isNaN(nw) && (nw < 1000 || nw > 2500)) {
        const multiplied = nw * 1000;
        if (multiplied >= 1000 && multiplied <= 2500) {
          const before = corrected.netWeight;
          corrected.netWeight = multiplied;
          corrections.push({ field: 'netWeight', original: String(before), corrected: String(multiplied), rule: 'weightRange' });
        }
      }
    }

    if (corrected.grossWeight !== null && corrected.grossWeight !== undefined) {
      const gw = parseFloat(corrected.grossWeight);
      if (!isNaN(gw) && (gw < 1000 || gw > 2500)) {
        const multiplied = gw * 1000;
        if (multiplied >= 1000 && multiplied <= 2500) {
          const before = corrected.grossWeight;
          corrected.grossWeight = multiplied;
          corrections.push({ field: 'grossWeight', original: String(before), corrected: String(multiplied), rule: 'weightRange' });
        }
      }
    }

    if (corrected.brand) {
      const before = corrected.brand;
      // 先修符号：全角括号→半角
      corrected.brand = corrected.brand.replace(/（/g, '(').replace(/）/g, ')');
      // 英文拼写OCR纠错：基于已知正确值匹配修复
      corrected.brand = this.correctBrandSpelling(corrected.brand, corrected.productName);
      if (before !== corrected.brand) {
        const isSymbolOnly = corrected.brand === before.replace(/（/g, '(').replace(/）/g, ')');
        corrections.push({ field: 'brand', original: before, corrected: corrected.brand, rule: isSymbolOnly ? 'symbolWidth' : 'charConfusion' });
      }
    }

    if (corrected.standard) {
      const before = corrected.standard;
      // 先修符号：全角短横线→半角
      corrected.standard = corrected.standard.replace(/－/g, '-').replace(/—/g, '-');
      // 英文拼写OCR纠错：基于已知正确值匹配修复
      corrected.standard = this.correctStandardSpelling(corrected.standard);
      if (before !== corrected.standard) {
        const isSymbolOnly = corrected.standard === before.replace(/－/g, '-').replace(/—/g, '-');
        corrections.push({ field: 'standard', original: before, corrected: corrected.standard, rule: isSymbolOnly ? 'symbolWidth' : 'charConfusion' });
      }
    }

    return { corrected, corrections, correctedBarcode };
  }

  /**
   * 品牌英文拼写OCR纠错
   */
  correctBrandSpelling(brand: string, productName?: string): string {
    if (!brand) return brand;

    let fixed = brand
      .replace(/J0NTU0/gi, 'JINTUO')
      .replace(/J1NTU0/gi, 'JINTUO')
      .replace(/JINTV0/gi, 'JINTUO')
      .replace(/J1NTV0/gi, 'JINTUO')
      .replace(/J0NTUO/gi, 'JINTUO')
      .replace(/J1NTUO/gi, 'JINTUO')
      .replace(/JINTVO/gi, 'JINTUO')
      .replace(/JHNTUO/gi, 'JINTUO')
      .replace(/JMNTUO/gi, 'JINTUO')
      .replace(/6RADE/gi, 'GRADE')
      .replace(/6R4DE/gi, 'GRADE')
      .replace(/GR4DE/gi, 'GRADE')
      .replace(/GRA0E/gi, 'GRADE')
      .replace(/GRAQE/gi, 'GRADE')
      .replace(/GRADF/gi, 'GRADE')
      .replace(/GRADE\s*l\b/gi, 'GRADE 1')
      .replace(/GRADE\s*I\b/gi, 'GRADE 1')
      .replace(/GRADE\s*7\b/gi, 'GRADE 1')
      .replace(/GRADE\s*L\b/gi, 'GRADE 1')
      .replace(/^jintuo\s+grade\s+1/i, 'JINTUO GRADE 1');

    const expectedBrand = productName && productName.includes('电积')
      ? 'JINTUO GRADE 1(EW)'
      : 'JINTUO GRADE 1';

    const fixedNoParens = fixed.replace(/[（）()]/g, '').trim().toUpperCase();
    const expectedNoParens = expectedBrand.replace(/[（）()]/g, '').trim();

    if (fixedNoParens === expectedNoParens) {
      // Fix bracket format
      if (expectedBrand.includes('(EW)')) {
        fixed = fixed.replace(/[（(]EW[）)]/i, '(EW)');
        return fixed.includes('(EW)') ? fixed : fixed + '(EW)';
      }
      return fixed.replace(/[（(]EW[）)]/gi, '').trim();
    }

    if (fixedNoParens.includes('GRADE') && fixedNoParens.match(/GRADE\s*\d/)) {
      return expectedBrand;
    }

    if (this._levenshtein(fixedNoParens, expectedNoParens) <= 3) {
      return expectedBrand;
    }

    return fixed;
  }

  /**
   * 标准号拼写OCR纠错
   */
  correctStandardSpelling(standard: string): string {
    if (!standard) return standard;

    let fixed = standard
      .replace(/^6B\//, 'GB/')
      .replace(/^6D\//, 'GB/')
      .replace(/^GD\//, 'GB/')
      .replace(/^68\//, 'GB/')
      .replace(/GB\/t/i, 'GB/T')
      .replace(/GB\/7/, 'GB/T')
      .replace(/65l6/g, '6516')
      .replace(/65I6/g, '6516')
      .replace(/65O6/g, '6506')
      .replace(/65S6/g, '6556')
      .replace(/-20Z5/g, '-2025')
      .replace(/-2O25/g, '-2025')
      .replace(/-2o25/g, '-2025');

    if (/^GB\/T\s?6516-\d{4}$/.test(fixed)) return fixed;

    const expected = 'GB/T6516-2025';
    if (this._levenshtein(fixed.toUpperCase().replace(/\s+/g, ''), expected) <= 2) return expected;

    return fixed;
  }

  private _levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
      const row = new Array(n + 1).fill(0);
      row[0] = i;
      return row;
    });
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }
}
