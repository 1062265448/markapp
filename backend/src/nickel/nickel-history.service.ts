import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { CompareRecord } from './entities/compare-record.entity';
import { CompareImage } from './entities/compare-image.entity';
import { ImageStorageService } from '../common/services/image-storage.service';
import { NickelConfigService } from '../config/config.service';
import { CompareResultResponse } from './types/nickel.types';

export interface HistoryItem {
  id: string;
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  overallMatch: boolean | null;
  matchedCount: number | null;
  totalFields: number | null;
  spraycodeImageUrl: string | null;
  labelImageUrl: string | null;
  createdAt: string;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class NickelHistoryService {
  private readonly logger = new Logger(NickelHistoryService.name);

  constructor(
    @InjectRepository(CompareRecord)
    private recordRepo: Repository<CompareRecord>,
    @InjectRepository(CompareImage)
    private imageRepo: Repository<CompareImage>,
    private imageStorage: ImageStorageService,
    private config: NickelConfigService,
  ) {}

  /**
   * 保存对比记录和图片
   */
  async saveCompareRecord(
    result: CompareResultResponse,
    sprayFile?: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
    labelFile?: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
  ): Promise<string> {
    const id = randomUUID();
    const { data } = result;

    // 保存图片到磁盘
    const images: Partial<CompareImage>[] = [];

    if (sprayFile?.buffer) {
      const filePath = await this.imageStorage.saveImage(
        sprayFile.buffer,
        sprayFile.mimetype,
        id,
        'spraycode',
      );
      images.push({
        recordId: id,
        imageType: 'spraycode',
        filePath,
        originalName: sprayFile.originalname || null,
        mimeType: sprayFile.mimetype,
        fileSize: sprayFile.size,
      });
    }

    if (labelFile?.buffer) {
      const filePath = await this.imageStorage.saveImage(
        labelFile.buffer,
        labelFile.mimetype,
        id,
        'label',
      );
      images.push({
        recordId: id,
        imageType: 'label',
        filePath,
        originalName: labelFile.originalname || null,
        mimeType: labelFile.mimetype,
        fileSize: labelFile.size,
      });
    }

    // 提取摘要字段用于列表查询
    const sprayCodeData = data.sprayCodeData || {};
    const summary = data.summary || {};

    const record = this.recordRepo.create({
      id,
      batchNo: sprayCodeData.batchNo ?? null,
      packNo: sprayCodeData.packNo ?? null,
      productionDate: sprayCodeData.productionDate ?? null,
      overallMatch: summary.overallMatch ?? null,
      matchedCount: summary.matched ?? null,
      totalFields: summary.totalFields ?? null,
      compareResults: data.compareResults ?? null,
      summary: summary ?? null,
      sprayCodeData: sprayCodeData ?? null,
      labelCodeData: data.labelCodeData ?? null,
      message: result.message || '',
    });

    await this.recordRepo.save(record);

    // 保存图片记录
    if (images.length > 0) {
      const imageEntities = images.map((img) =>
        this.imageRepo.create(img as CompareImage),
      );
      await this.imageRepo.save(imageEntities);
    }

    this.logger.log(`对比记录已保存: ${id}`);
    return id;
  }

  /**
   * 获取历史记录列表（分页）
   */
  async getHistory(page = 1, limit = 20): Promise<HistoryListResponse> {
    limit = Math.min(Math.max(limit, 1), 100);
    page = Math.max(page, 1);

    const [records, total] = await this.recordRepo.findAndCount({
      select: {
        id: true,
        batchNo: true,
        packNo: true,
        productionDate: true,
        overallMatch: true,
        matchedCount: true,
        totalFields: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 查询关联图片
    const recordIds = records.map((r) => r.id);
    const images = recordIds.length > 0
      ? await this.imageRepo.find({ where: { recordId: In(recordIds) } })
      : [];

    const imageMap = new Map<string, Map<string, CompareImage>>();
    for (const img of images) {
      if (!imageMap.has(img.recordId)) {
        imageMap.set(img.recordId, new Map());
      }
      imageMap.get(img.recordId)!.set(img.imageType, img);
    }

    const items: HistoryItem[] = records.map((r) => {
      const imgMap = imageMap.get(r.id);
      const sprayImg = imgMap?.get('spraycode');
      const labelImg = imgMap?.get('label');

      return {
        id: r.id,
        batchNo: r.batchNo,
        packNo: r.packNo,
        productionDate: r.productionDate,
        overallMatch: r.overallMatch,
        matchedCount: r.matchedCount,
        totalFields: r.totalFields,
        spraycodeImageUrl: sprayImg ? `/api/nickel/images/${r.id}/spraycode` : null,
        labelImageUrl: labelImg ? `/api/nickel/images/${r.id}/label` : null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取单条记录详情
   */
  async getRecordDetail(id: string) {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`记录不存在: ${id}`);
    }

    const images = await this.imageRepo.find({ where: { recordId: id } });

    return {
      id: record.id,
      compareResults: record.compareResults,
      summary: record.summary,
      sprayCodeData: record.sprayCodeData,
      labelCodeData: record.labelCodeData,
      message: record.message,
      images: await Promise.all(images.map(async (img) => ({
        imageType: img.imageType,
        url: `/api/nickel/images/${id}/${img.imageType}`,
        mimeType: img.mimeType,
        fileSize: img.fileSize,
        exists: await this.imageStorage.imageExists(img.filePath),
      }))),
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * 获取图片信息（用于流式返回）
   */
  async getImageInfo(recordId: string, imageType: string) {
    const image = await this.imageRepo.findOne({
      where: { recordId, imageType: imageType as 'spraycode' | 'label' },
    });

    if (!image) {
      throw new NotFoundException('图片不存在');
    }

    const absolutePath = this.imageStorage.getAbsolutePath(image.filePath);
    if (!(await this.imageStorage.imageExists(image.filePath))) {
      throw new NotFoundException('图片文件已过期或被清理');
    }

    return {
      absolutePath,
      mimeType: image.mimeType,
      fileSize: image.fileSize,
    };
  }

  /**
   * 删除记录及关联图片
   */
  async deleteRecord(id: string): Promise<boolean> {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`记录不存在: ${id}`);
    }

    // 先删除磁盘上的图片文件
    const images = await this.imageRepo.find({ where: { recordId: id } });
    for (const img of images) {
      await this.imageStorage.deleteImage(img.filePath);
    }

    // 删除数据库记录（CASCADE 会自动删除 compare_image）
    await this.recordRepo.remove(record);
    this.logger.log(`记录已删除: ${id}`);
    return true;
  }

  /**
   * 定时清理过期图片（每天凌晨2:30执行）
   */
  @Cron('30 2 * * *')
  async cleanupExpiredImages() {
    try {
      const retentionDays = this.config.imageRetentionDays;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      this.logger.log(`开始清理 ${retentionDays} 天前的过期图片 (截止: ${cutoff.toISOString()})`);

      const expiredImages = await this.imageRepo.find({
        where: { createdAt: LessThan(cutoff) },
      });

      if (expiredImages.length === 0) {
        this.logger.log('无过期图片需要清理');
        return;
      }

      // 删除磁盘文件
      const filePaths = expiredImages.map((img) => img.filePath);
      const deleted = await this.imageStorage.cleanupExpiredImages(filePaths);

      // 删除数据库中的图片记录（不删除 compare_record）
      await this.imageRepo.remove(expiredImages);

      this.logger.log(
        `过期图片清理完成: 文件删除 ${deleted}/${expiredImages.length}, DB记录删除 ${expiredImages.length}`,
      );
    } catch (error) {
      this.logger.error(`过期图片清理失败: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}
