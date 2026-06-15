import { ImagePreprocessService } from './image-preprocess.service';

describe('ImagePreprocessService', () => {
  let service: ImagePreprocessService;

  beforeEach(() => {
    service = new ImagePreprocessService();
  });

  describe('validateImageFormat', () => {
    it('应接受 JPEG', () => {
      expect(service.validateImageFormat('image/jpeg')).toBe(true);
    });

    it('应接受 PNG', () => {
      expect(service.validateImageFormat('image/png')).toBe(true);
    });

    it('应接受 GIF', () => {
      expect(service.validateImageFormat('image/gif')).toBe(true);
    });

    it('应接受 WebP', () => {
      expect(service.validateImageFormat('image/webp')).toBe(true);
    });

    it('应拒绝 SVG', () => {
      expect(service.validateImageFormat('image/svg+xml')).toBe(false);
    });

    it('应拒绝 PDF', () => {
      expect(service.validateImageFormat('application/pdf')).toBe(false);
    });

    it('应拒绝空字符串', () => {
      expect(service.validateImageFormat('')).toBe(false);
    });
  });

  describe('validateImageSize', () => {
    it('应接受 1MB', () => {
      expect(service.validateImageSize(1024 * 1024)).toBe(true);
    });

    it('应接受恰好 10MB', () => {
      expect(service.validateImageSize(10 * 1024 * 1024)).toBe(true);
    });

    it('应拒绝超过 10MB', () => {
      expect(service.validateImageSize(11 * 1024 * 1024)).toBe(false);
    });

    it('应接受 0 字节', () => {
      expect(service.validateImageSize(0)).toBe(true);
    });

    it('应支持自定义大小限制', () => {
      expect(service.validateImageSize(2 * 1024 * 1024, 1)).toBe(false);
    });
  });

  describe('preprocess', () => {
    it('应返回有效的Buffer', async () => {
      const buffer = Buffer.from('test image data');
      const result = await service.preprocess(buffer);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(buffer.length);
    });

    it('应拒绝空Buffer', async () => {
      await expect(service.preprocess(Buffer.alloc(0))).rejects.toThrow('无效的图片数据');
    });

    it('应拒绝非Buffer输入', async () => {
      await expect(service.preprocess(null as any)).rejects.toThrow();
    });
  });

  describe('bufferToBase64', () => {
    it('应正确转换为base64', () => {
      const buffer = Buffer.from('hello');
      expect(service.bufferToBase64(buffer)).toBe(Buffer.from('hello').toString('base64'));
    });
  });
});
