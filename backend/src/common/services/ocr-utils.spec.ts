import { normalizeDigits, normalizeBatchNo, normalizeDate, normalizeWeight, pickBestBarcode } from './ocr-utils';

describe('ocr-utils', () => {
  describe('normalizeDigits', () => {
    it('应将 O/o 转为 0', () => {
      expect(normalizeDigits('O0O')).toBe('000');
      expect(normalizeDigits('o0o')).toBe('000');
    });

    it('应将 l/I 转为 1', () => {
      expect(normalizeDigits('lI1')).toBe('111');
    });

    it('J/t/s 应保留（镍板批号后缀）', () => {
      expect(normalizeDigits('26-3-151J')).toBe('26-3-151J');
      expect(normalizeDigits('26-3-151t')).toBe('26-3-151t');
      expect(normalizeDigits('26-3-151s')).toBe('26-3-151s');
    });

    it('普通数字应原样保留', () => {
      expect(normalizeDigits('12345')).toBe('12345');
    });
  });

  describe('normalizeBatchNo', () => {
    it('应统一连字符', () => {
      expect(normalizeBatchNo('26–3–151')).toBe('26-3-151');
      expect(normalizeBatchNo('26—3—151')).toBe('26-3-151');
    });

    it('应保留 J 后缀并大写', () => {
      expect(normalizeBatchNo('26-3-151j')).toBe('26-3-151J');
      expect(normalizeBatchNo('26-3-151t')).toBe('26-3-151T');
    });

    it('原样保留数字位', () => {
      // 注意：当前实现只对已识别的数字位做规范化（无操作），不替换字母 O
      // O→0 的纠错由 rule-checker 在 autoCorrect 阶段处理
      expect(normalizeBatchNo('26-3-1O1J')).toBe('26-3-1O1J');
    });
  });

  describe('normalizeDate', () => {
    it('YYYY-MM-DD 格式应原样', () => {
      expect(normalizeDate('2026-05-25')).toBe('2026-05-25');
    });

    it('YY-M-D 应补零为 4位年-2位月-2位日', () => {
      expect(normalizeDate('26-5-5')).toBe('2026-05-05');
    });

    it('YYYY/M/D 应转为 - 分隔并补零', () => {
      expect(normalizeDate('2026/5/25')).toBe('2026-05-25');
    });

    it('OCR 纠错: O→0', () => {
      expect(normalizeDate('2O26-O5-25')).toBe('2026-05-25');
    });
  });

  describe('normalizeWeight', () => {
    it('应去除 Kg/ KG/ kg 单位', () => {
      expect(normalizeWeight('123.45 Kg')).toBe(123.45);
      expect(normalizeWeight('100KG')).toBe(100);
      expect(normalizeWeight('50.5kg')).toBe(50.5);
    });

    it('应去除千分位逗号', () => {
      expect(normalizeWeight('1,234.5')).toBe(1234.5);
    });

    it('O/l 应被纠错为 0/1', () => {
      expect(normalizeWeight('lOO.5 Kg')).toBe(100.5);
    });

    it('非法字符串应返回 null', () => {
      expect(normalizeWeight('abc')).toBeNull();
      expect(normalizeWeight('')).toBeNull();
    });
  });

  describe('pickBestBarcode', () => {
    it('空数组应返回 null', () => {
      expect(pickBestBarcode([])).toBeNull();
    });

    it('25位数字条码应被优先选择', () => {
      const result = pickBestBarcode([
        { text: 'short', format: 'CODE_128' },
        { text: '1090602260525315143114765', format: 'CODE_128' },
      ]);
      expect(result).toBe('1090602260525315143114765');
    });

    it('6段空格分隔条码应被优先选择', () => {
      const result = pickBestBarcode([
        { text: 'short', format: 'CODE_128' },
        { text: '109 06 02 260525 3151431 14765', format: 'CODE_128' },
      ]);
      expect(result).toBe('109 06 02 260525 3151431 14765');
    });

    it('无数字条码时应选最长的', () => {
      const result = pickBestBarcode([
        { text: 'AB', format: 'CODE_128' },
        { text: 'ABCDE', format: 'CODE_128' },
      ]);
      expect(result).toBe('ABCDE');
    });

    it('应去除首尾空格', () => {
      const result = pickBestBarcode([{ text: '  12345  ', format: 'CODE_128' }]);
      expect(result).toBe('12345');
    });
  });
});
