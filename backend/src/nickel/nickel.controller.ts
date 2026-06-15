import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { NickelService } from './nickel.service';
import { NickelHistoryService } from './nickel-history.service';
import { RecognizeDto, CompareDto } from './dto/recognize.dto';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('api/nickel')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class NickelController {
  constructor(
    private readonly nickelService: NickelService,
    private readonly historyService: NickelHistoryService,
  ) {}

  /**
   * POST /api/nickel/recognize - 标签识别（三模型并行）
   */
  @Post('recognize')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async recognize(
    @UploadedFile() file: Express.Multer.File,
    @Body() recognizeDto: RecognizeDto,
  ) {
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
  async recognizeSpraycode(@UploadedFile() file: Express.Multer.File) {
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
    @UploadedFiles() files: Express.Multer.File[],
    @Body() compareDto: CompareDto,
  ) {
    if (!files || files.length === 0) {
      return { success: false, message: '请上传图片', data: null, timestamp: new Date().toISOString() };
    }

    const sprayFile = { buffer: files[0].buffer, mimetype: files[0].mimetype, size: files[0].size || 0, originalname: files[0].originalname };
    const labelFile = files.length > 1
      ? { buffer: files[1].buffer, mimetype: files[1].mimetype, size: files[1].size || 0, originalname: files[1].originalname }
      : undefined;

    const result = files.length === 1
      ? await this.nickelService.compare(sprayFile, undefined, undefined)
      : await this.nickelService.compare(sprayFile, labelFile, undefined);

    // 保存记录到数据库
    const recordId = await this.historyService.saveCompareRecord(
      result,
      sprayFile,
      labelFile,
    );

    // 在返回数据中附加记录ID
    result.data.id = recordId;

    return result;
  }

  /**
   * GET /api/nickel/history - 历史记录列表（分页）
   */
  @Get('history')
  async getHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const data = await this.historyService.getHistory(pageNum, limitNum);

    return {
      success: true,
      data,
      message: '获取历史记录成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/nickel/history/:id - 记录详情
   */
  @Get('history/:id')
  async getRecordDetail(@Param('id') id: string) {
    const data = await this.historyService.getRecordDetail(id);

    return {
      success: true,
      data,
      message: '获取记录详情成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/nickel/images/:recordId/:imageType - 获取图片
   */
  @Get('images/:recordId/:imageType')
  async getImage(
    @Param('recordId') recordId: string,
    @Param('imageType') imageType: string,
    @Res() res: Response,
  ) {
    const imageInfo = await this.historyService.getImageInfo(recordId, imageType);

    res.setHeader('Content-Type', imageInfo.mimeType);
    res.setHeader('Content-Length', imageInfo.fileSize.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = fs.createReadStream(imageInfo.absolutePath);
    stream.pipe(res);
  }

  /**
   * DELETE /api/nickel/history/:id - 删除记录
   */
  @Delete('history/:id')
  async deleteRecord(@Param('id') id: string) {
    await this.historyService.deleteRecord(id);

    return {
      success: true,
      data: null,
      message: '记录已删除',
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
