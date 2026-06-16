import { Global, Module } from '@nestjs/common';
import { NickelConfigModule } from '../config/config.module';
import { ImagePreprocessService } from './services/image-preprocess.service';
import { LabelOcrService } from './services/label-ocr.service';
import { RuleCheckerService } from './services/rule-checker.service';
import { BarcodeParserService } from './services/barcode-parser.service';
import { ConfidenceService } from './services/confidence.service';
import { SpraycodeOcrService } from './services/spraycode-ocr.service';
import { SpraycodeCompareService } from './services/spraycode-compare.service';
import { JsonParserService } from './services/json-parser.service';
import { ImageStorageService } from './services/image-storage.service';

@Global()
@Module({
  imports: [NickelConfigModule],
  providers: [
    ImagePreprocessService,
    LabelOcrService,
    RuleCheckerService,
    BarcodeParserService,
    ConfidenceService,
    SpraycodeOcrService,
    SpraycodeCompareService,
    JsonParserService,
    ImageStorageService,
  ],
  exports: [
    ImagePreprocessService,
    LabelOcrService,
    RuleCheckerService,
    BarcodeParserService,
    ConfidenceService,
    SpraycodeOcrService,
    SpraycodeCompareService,
    JsonParserService,
    ImageStorageService,
  ],
})
export class CommonModule {}
