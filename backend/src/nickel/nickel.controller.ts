import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { NickelService } from './nickel.service';
import { RecognizeDto, CompareDto } from './dto/recognize.dto';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Controller('api/nickel')
export class NickelController {
  constructor(private readonly nickelService: NickelService) {}

  /**
   * POST /api/nickel/recognize - 标签识别（三模型并行）
   */
  @Post('recognize')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(ApiKeyGuard)
  @UseGuards(RateLimitGuard)
  async recognize(
    @UploadedFile() file: any,
    @Body() recognizeDto: RecognizeDto,
  ) {
    // recognizeDto.enableGLM is boolean | undefined, check truthiness
    const enableGLM = recognizeDto.enableGLM !== false;

    return this.nickelService.recognize(
      {
        buffer: file?.buffer,
        mimetype: file?.mimetype,
        size: file?.size || 0,
      },
      recognizeDto.barcode,
      enableGLM,
    );
  }

  /**
   * POST /api/nickel/spraycode - 喷码OCR识别
   */
  @Post('spraycode')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async recognizeSpraycode(@UploadedFile() file: any) {
    return this.nickelService.recognizeSpraycode({
      buffer: file?.buffer,
      mimetype: file?.mimetype,
      size: file?.size || 0,
    });
  }

  /**
   * POST /api/nickel/compare - 喷码对比
   * 支持上传两张图片或一张图片
   */
  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 2))
  async compare(
    @UploadedFiles() files: any[],
    @Body() compareDto: CompareDto,
  ) {
    if (!files || files.length === 0) {
      return { success: false, message: '请上传图片', data: null, timestamp: new Date().toISOString() };
    }

    if (files.length === 1) {
      return this.nickelService.compare(
        { buffer: files[0].buffer, mimetype: files[0].mimetype, size: files[0].size || 0 },
        undefined,
        undefined,
      );
    }

    return this.nickelService.compare(
      { buffer: files[0].buffer, mimetype: files[0].mimetype, size: files[0].size || 0 },
      { buffer: files[1].buffer, mimetype: files[1].mimetype, size: files[1].size || 0 },
    );
  }

  /**
   * GET /api/nickel/history - 识别历史（预留）
   */
  @Get('history')
  async getHistory() {
    return {
      success: true,
      data: [],
      message: '历史记录功能待实现（需接入数据库）',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/nickel/health - 健康检查
   */
  @Get('health')
  async health() {
    return this.nickelService.health();
  }
}
