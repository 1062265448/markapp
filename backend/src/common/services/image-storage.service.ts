import { Injectable, Logger } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly uploadDir: string;

  constructor(private config: NickelConfigService) {
    this.uploadDir = path.resolve(config.imageUploadDir);
  }

  /**
   * 保存图片到本地文件系统（异步）
   * @returns 相对路径 (如 compare/2026/06/15/uuid_spraycode.jpg)
   */
  async saveImage(
    buffer: Buffer,
    mimeType: string,
    recordId: string,
    imageType: 'spraycode' | 'label',
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    const ext = this.extFromMime(mimeType);
    const fileName = `${recordId}_${imageType}${ext}`;
    const relativeDir = path.join('compare', year, month, day);
    const absoluteDir = path.join(this.uploadDir, relativeDir);

    // 确保目录存在（异步）
    await fs.promises.mkdir(absoluteDir, { recursive: true });

    const relativePath = path.join(relativeDir, fileName);
    const absolutePath = path.join(this.uploadDir, relativePath);

    // 写入文件（异步）
    await fs.promises.writeFile(absolutePath, buffer);
    this.logger.log(`图片已保存: ${relativePath} (${buffer.length} bytes)`);

    return relativePath.replace(/\\/g, '/');
  }

  /**
   * 删除单个图片文件（异步）
   */
  async deleteImage(relativePath: string): Promise<boolean> {
    const absolutePath = path.join(this.uploadDir, relativePath);
    try {
      await fs.promises.access(absolutePath, fs.constants.F_OK);
      await fs.promises.unlink(absolutePath);
      this.logger.log(`图片已删除: ${relativePath}`);
      return true;
    } catch (e) {
      // 文件不存在或删除失败
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`图片删除失败: ${relativePath} - ${(e as Error).message}`);
      }
      return false;
    }
  }

  /**
   * 获取图片的绝对路径
   */
  getAbsolutePath(relativePath: string): string {
    const resolved = path.resolve(this.uploadDir, relativePath);
    // 防止路径穿越：确保解析后的路径在 uploadDir 内
    if (!resolved.startsWith(this.uploadDir)) {
      throw new Error('非法的图片路径');
    }
    return resolved;
  }

  /**
   * 检查图片文件是否存在（异步）
   */
  async imageExists(relativePath: string): Promise<boolean> {
    try {
      await fs.promises.access(path.join(this.uploadDir, relativePath), fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理超过指定天数的图片文件
   * @returns 已删除的文件数
   */
  async cleanupExpiredImages(
    filePaths: string[],
  ): Promise<number> {
    let deleted = 0;
    for (const fp of filePaths) {
      const ok = await this.deleteImage(fp);
      if (ok) deleted++;
    }
    this.logger.log(`过期图片清理完成: 删除 ${deleted}/${filePaths.length} 个文件`);
    return deleted;
  }

  /**
   * 从 MIME 类型推导文件扩展名
   */
  private extFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/heic': '.heic',
      'image/heif': '.heif',
    };
    return map[mimeType] || '.jpg';
  }
}
