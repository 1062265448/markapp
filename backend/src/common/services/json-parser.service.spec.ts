import { parseWithFallback } from './json-parser.service';

describe('parseWithFallback', () => {
  it('应直接解析合法JSON', () => {
    const result = parseWithFallback('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('应从markdown代码块中提取JSON', () => {
    const content = '```json\n{"key": "value"}\n```';
    const result = parseWithFallback(content);
    expect(result).toEqual({ key: 'value' });
  });

  it('应从无标记代码块中提取JSON', () => {
    const content = '```\n{"key": "value"}\n```';
    const result = parseWithFallback(content);
    expect(result).toEqual({ key: 'value' });
  });

  it('应从包含前后文本的内容中提取JSON', () => {
    const content = 'Here is the result: {"key": "value"} done.';
    const result = parseWithFallback(content);
    expect(result).toEqual({ key: 'value' });
  });

  it('应修复尾部逗号', () => {
    const content = '{"key": "value",}';
    const result = parseWithFallback(content);
    expect(result).toEqual({ key: 'value' });
  });

  it('应修复冒号后的单引号值', () => {
    const content = "{'key': 'value'}";
    const result = parseWithFallback(content);
    expect(result).toEqual({ key: 'value' });
  });

  it('应检测errorKey并抛出错误', () => {
    const content = 'some text ```json\n{"error": "something went wrong"}\n```';
    expect(() => parseWithFallback(content, { errorKey: 'error' })).toThrow('something went wrong');
  });

  it('无法解析时应抛出明确错误', () => {
    expect(() => parseWithFallback('not json at all')).toThrow('AI返回格式异常');
  });

  it('应处理数组JSON', () => {
    const result = parseWithFallback('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('应处理嵌套对象', () => {
    const content = '{"a": {"b": 1}, "c": [1, 2]}';
    const result = parseWithFallback(content);
    expect(result).toEqual({ a: { b: 1 }, c: [1, 2] });
  });
});
