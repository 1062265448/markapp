import { Global, Module } from '@nestjs/common';
import { NickelConfigModule } from '../config/config.module';
import { ImagePreprocessService } from './services/image-preprocess.service';
import { QwenAIService } from './services/qwen-ai.service';
import { VolcAIService } from './services/volc-ai.service';
import { GlmAIService } from './services/glm-ai.service';
import { RuleCheckerService } from './services/rule-checker.service';
import { BarcodeParserService } from './services/barcode-parser.service';
import { ConfidenceService } from './services/confidence.service';
import { SpraycodeOcrService } from './services/spraycode-ocr.service';
import { SpraycodeCompareService } from './services/spraycode-compare.service';
import { NickelPromptService } from './services/nickel-prompt.service';
import { JsonParserService } from './services/json-parser.service';
import { ImageStorageService } from './services/image-storage.service';

@Global()
@Module({
  imports: [NickelConfigModule],
  providers: [
    ImagePreprocessService,
    QwenAIService,
    VolcAIService,
    GlmAIService,
    RuleCheckerService,
    BarcodeParserService,
    ConfidenceService,
    SpraycodeOcrService,
    SpraycodeCompareService,
    NickelPromptService,
    JsonParserService,
    ImageStorageService,
  ],
  exports: [
    ImagePreprocessService,
    QwenAIService,
    VolcAIService,
    GlmAIService,
    RuleCheckerService,
    BarcodeParserService,
    ConfidenceService,
    SpraycodeOcrService,
    SpraycodeCompareService,
    NickelPromptService,
    JsonParserService,
    ImageStorageService,
  ],
})
export class CommonModule {}
