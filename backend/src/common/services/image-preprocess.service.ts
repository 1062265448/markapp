import { Injectable, Logger } from '@nestjs/common';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class ImagePreprocessService {
  private readonly logger = new Logger(ImagePreprocessService.name);

  /**
   * 图片预处理: 验证和基本处理
   */
  async preprocess(imageBuffer: Buffer): Promise<Buffer> {
    try {
      if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new Error('无效的图片数据');
      }

      if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
        this.logger.warn(`图片较大，可能影响AI识别性能: ${imageBuffer.length} bytes`);
      }

      return imageBuffer;
    } catch (error) {
      this.logger.error(`图片预处理失败: ${(error as Error).message}`);
      throw new Error(`图片预处理失败: ${(error as Error).message}`);
    }
  }

  /**
   * 将Buffer转换为Base64
   */
  bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /**
   * 验证图片格式
   */
  validateImageFormat(mimetype: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(mimetype);
  }

  /**
   * 验证图片大小
   */
  validateImageSize(size: number, maxSizeMB = 10): boolean {
    const maxSize = maxSizeMB * 1024 * 1024;
    return size <= maxSize;
  }
}
