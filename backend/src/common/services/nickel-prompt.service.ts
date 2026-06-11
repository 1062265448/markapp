import { Injectable } from '@nestjs/common';

@Injectable()
export class NickelPromptService {
  /**
   * 构建镍板标签识别prompt
   */
  buildNickelPrompt(): string {
    return `你是一个专业的镍板标签识别专家，专门识别金川集团镍板标签。

## 第一步:标签类型判断
请先判断这张图片是否为金川集团镍板标签(包含"金川集团镍钴股份有限公司"字样)。
如果不是，请返回:{"error": "not_nickel_label", "message": "非金川集团镍板标签"}

## 第二步:字段提取
如果是镍板标签，按以下固定英文标识提取对应字段值:

| 英文标识 | 提取字段 | 格式要求 |
|---------|---------|---------|
| PRODUCT | 产品中文名 | 电解镍 或 电积镍 |
| BRAND | 品牌 | 电解镍→JINTUO GRADE 1，电积镍→JINTUO GRADE 1(EW) |
| STANDARD | 标准号 | GB/T6516-2025 |
| BATCH NO | 批号 | XX-X-XXX[J]格式，两位年份+车间(1-7)+三位批号，可选J后缀，如 26-1-109 或 26-1-109J |
| PACK NO | 包号 | 数字或数字+J后缀 |
| PIECES | 块数 | 整数 |
| NET | 净重 | 数值，单位千克 |
| GROSS | 毛重 | 数值，单位千克 |
| DATE | 生产日期 | YYYY-MM-DD |
| WEIGHT BY | 计量员 | 1-2位数字 |
| ADDR | 地址 | 甘肃省金昌市金川区北京路31号 |
| BARCODE | 条形码数字 | 标签底部的一串数字，格式为 XXX XX XX YYYYMMDD NNNNNNN NNNNN |

## 识别注意事项
1. **字符混淆纠正**:自动纠正 0↔O、1↔l↔I、J↔1、5↔S、1↔7
   - **特别注意：标签上的大写J与小写j均容易被识别为数字1**
   - 批号末尾（如 XX-X-XXXJ）和包号末尾（如 XXJ）应优先识别为J而非1
   - **车间代码（批号首位数字1-7）中的1和7容易互相混淆，需特别注意：1是竖线，7带横折**
2. **批号格式**:保持 XX-X-XXX[J] 格式，连字符可有1个或多个，仅允许大写J后缀
3. **日期格式**:统一转为 YYYY-MM-DD
4. **重量**:保留1位小数，单位为千克
5. **条形码识别要点**:
   - 条形码数字位于标签底部，字号极小、对比度低、可能有反光
   - 逐字符检查，特别注意数字与字母的界限
   - 各段之间以空格分隔，段数固定为6段
   - 第4段(产品代码)为7位，第1位是车间代码(1-7)
6. **不确定时**:用 null 表示不确定的字段，不要猜测

## 输出JSON格式
{
  "productName": "电解镍",
  "brand": "JINTUO GRADE 1",
  "standard": "GB/T6516-2025",
  "batchNo": "26-1-109J",
  "packNo": "47",
  "pieces": 25,
  "netWeight": 1482.0,
  "grossWeight": 1488.0,
  "productionDate": "2026-04-19",
  "weightBy": "5",
  "address": "甘肃省金昌市金川区北京路31号",
  "barcode": "109 06 02 260419 1109047 14820",
  "_fieldLabels": {
    "batchNo": "BATCH NO",
    "packNo": "PACK NO",
    "pieces": "PIECES",
    "netWeight": "NET",
    "grossWeight": "GROSS",
    "productionDate": "DATE",
    "weightBy": "WEIGHT BY",
    "brand": "BRAND",
    "standard": "STANDARD"
  }
}

**_fieldLabels 说明**: 记录标签上印刷的每个字段的英文标识原文（区分大小写和标点），如标签印 "No." 就记录 "No."，印 "BATCH NO" 就记录 "BATCH NO"。此字段用于大小写/标点纠错校验。`;
  }

  /**
   * 构建喷码OCR prompt
   */
  buildSpraycodePrompt(): string {
    return `你是一个专业的喷码识别专家。请识别图片中的喷码文字内容。

请提取以下字段：
- batchNo: 批号 (格式 XX-X-XXX[J])
- packNo: 包号 (数字)
- productionDate: 生产日期 (YYYY-MM-DD)
- netWeight: 净重 (数值)
- grossWeight: 毛重 (数值)
- pieces: 块数 (整数)

注意：不确定的字段用 null。只返回JSON。`;
  }
}
