import { Test, TestingModule } from '@nestjs/testing';
import { ImageStorageService } from './image-storage.service';
import { NickelConfigService } from '../../config/config.service';
import * as fs from 'fs';
import * as path from 'path';

describe('ImageStorageService', () => {
  let service: ImageStorageService;
  let config: any;
  let testDir: string;

  beforeAll(() => {
    testDir = path.join(__dirname, '__test_uploads__');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // 清理测试目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageStorageService,
        {
          provide: NickelConfigService,
          useValue: { imageUploadDir: testDir },
        },
      ],
    }).compile();

    service = module.get<ImageStorageService>(ImageStorageService);
    config = module.get(NickelConfigService);
  });

  afterEach(() => {
    // 清理上传目录内容
    const compareDir = path.join(testDir, 'compare');
    if (fs.existsSync(compareDir)) {
      fs.rmSync(compareDir, { recursive: true, force: true });
    }
  });

  describe('saveImage', () => {
    it('should save image to date-structured directory', async () => {
      const buffer = Buffer.from('fake-image-data');
      const relativePath = await service.saveImage(
        buffer,
        'image/jpeg',
        'test-record-id',
        'spraycode',
      );

      expect(relativePath).toMatch(/compare\/\d{4}\/\d{2}\/\d{2}\/test-record-id_spraycode\.jpg/);

      const absolutePath = service.getAbsolutePath(relativePath);
      expect(fs.existsSync(absolutePath)).toBe(true);
      expect(fs.readFileSync(absolutePath)).toEqual(buffer);
    });

    it('should handle png images', async () => {
      const buffer = Buffer.from('png-data');
      const relativePath = await service.saveImage(
        buffer,
        'image/png',
        'test-record-id',
        'label',
      );

      expect(relativePath).toMatch(/\.png$/);
    });

    it('should default to .jpg for unknown mime types', async () => {
      const buffer = Buffer.from('data');
      const relativePath = await service.saveImage(
        buffer,
        'image/unknown',
        'test-record-id',
        'spraycode',
      );

      expect(relativePath).toMatch(/\.jpg$/);
    });
  });

  describe('deleteImage', () => {
    it('should delete existing image file', async () => {
      const buffer = Buffer.from('to-delete');
      const relativePath = await service.saveImage(
        buffer,
        'image/jpeg',
        'delete-test',
        'spraycode',
      );

      expect(service.imageExists(relativePath)).toBe(true);

      const result = await service.deleteImage(relativePath);

      expect(result).toBe(true);
      expect(service.imageExists(relativePath)).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const result = await service.deleteImage('non/existent/path.jpg');

      expect(result).toBe(false);
    });
  });

  describe('imageExists', () => {
    it('should return true for existing file', async () => {
      const buffer = Buffer.from('exists-test');
      const relativePath = await service.saveImage(
        buffer,
        'image/jpeg',
        'exists-test',
        'spraycode',
      );

      expect(service.imageExists(relativePath)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      expect(service.imageExists('no/such/file.jpg')).toBe(false);
    });
  });

  describe('getAbsolutePath', () => {
    it('should resolve relative path to absolute', () => {
      const abs = service.getAbsolutePath('compare/2026/06/15/test.jpg');

      expect(abs).toContain(testDir);
      // Windows uses backslashes, so check the path is properly resolved
      expect(abs).toMatch(/compare[\\\/]\d{4}[\\\/]\d{2}[\\\/]\d{2}[\\\/]test\.jpg/);
    });
  });

  describe('cleanupExpiredImages', () => {
    it('should delete specified files and return count', async () => {
      const buffer = Buffer.from('expired');
      const path1 = await service.saveImage(buffer, 'image/jpeg', 'expired-1', 'spraycode');
      const path2 = await service.saveImage(buffer, 'image/jpeg', 'expired-2', 'spraycode');

      const count = await service.cleanupExpiredImages([path1, path2]);

      expect(count).toBe(2);
      expect(service.imageExists(path1)).toBe(false);
      expect(service.imageExists(path2)).toBe(false);
    });

    it('should handle mix of existing and non-existing files', async () => {
      const buffer = Buffer.from('mixed');
      const path1 = await service.saveImage(buffer, 'image/jpeg', 'mixed-1', 'spraycode');

      const count = await service.cleanupExpiredImages([path1, 'non/existent.jpg']);

      expect(count).toBe(1);
    });
  });
});
