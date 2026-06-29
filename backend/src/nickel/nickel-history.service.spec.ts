import { Test, TestingModule } from '@nestjs/testing';
import { NickelHistoryService } from './nickel-history.service';
import { ImageStorageService } from '../common/services/image-storage.service';
import { NickelConfigService } from '../config/config.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompareRecord } from './entities/compare-record.entity';
import { CompareImage } from './entities/compare-image.entity';

describe('NickelHistoryService', () => {
  let service: NickelHistoryService;
  let recordRepo: any;
  let imageRepo: any;
  let imageStorage: any;
  let config: any;

  const mockRecordRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockImageRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockImageStorage = {
    saveImage: jest.fn(),
    deleteImage: jest.fn(),
    getAbsolutePath: jest.fn(),
    imageExists: jest.fn(),
    cleanupExpiredImages: jest.fn(),
  };

  const mockConfig = {
    imageRetentionDays: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NickelHistoryService,
        { provide: getRepositoryToken(CompareRecord), useValue: mockRecordRepo },
        { provide: getRepositoryToken(CompareImage), useValue: mockImageRepo },
        { provide: ImageStorageService, useValue: mockImageStorage },
        { provide: NickelConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<NickelHistoryService>(NickelHistoryService);
    recordRepo = module.get(getRepositoryToken(CompareRecord));
    imageRepo = module.get(getRepositoryToken(CompareImage));
    imageStorage = module.get(ImageStorageService);
    config = module.get(NickelConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCompareRecord', () => {
    it('should save record and images successfully', async () => {
      const result = {
        success: true,
        data: {
          compareResults: [{ field: 'packNo', fieldLabelCn: '包号', fieldLabelEn: 'PACK NO.', sprayCodeValue: '1', labelValueCn: '1', labelValueEn: '1', labelValue: '1', matched: true, missingIn: null, diffType: null }],
          summary: { totalFields: 4, matched: 3, mismatched: 0, missingInSpraycode: 0, missingInLabel: 1, bothMissing: 0, overallMatch: true },
          sprayCodeData: { batchNo: '26-1-001J', packNo: '1', productionDate: '2026-06-15', netWeight: 1500, grossWeight: 1520, pieces: 50 },
        },
        message: '喷码对比完成',
        timestamp: new Date().toISOString(),
      };

      const sprayFile = {
        buffer: Buffer.from('spray-data'),
        mimetype: 'image/jpeg',
        size: 1024,
        originalname: 'spray.jpg',
      };

      mockImageStorage.saveImage.mockResolvedValue('compare/2026/06/15/uuid_spraycode.jpg');
      mockRecordRepo.create.mockReturnValue({ id: 'test-uuid' });
      mockRecordRepo.save.mockResolvedValue({ id: 'test-uuid' });
      mockImageRepo.create.mockReturnValue({ recordId: 'test-uuid', imageType: 'spraycode' });
      mockImageRepo.save.mockResolvedValue([{ recordId: 'test-uuid', imageType: 'spraycode' }]);

      const id = await service.saveCompareRecord(result, sprayFile);

      expect(id).toBeDefined();
      expect(mockImageStorage.saveImage).toHaveBeenCalledWith(
        sprayFile.buffer,
        sprayFile.mimetype,
        expect.any(String),
        'spraycode',
      );
      expect(mockRecordRepo.save).toHaveBeenCalled();
      expect(mockImageRepo.save).toHaveBeenCalled();
    });

    it('should save record without images if no files provided', async () => {
      const result = {
        success: true,
        data: {
          compareResults: [],
          summary: { totalFields: 4, matched: 0, mismatched: 0, missingInSpraycode: 0, missingInLabel: 4, bothMissing: 0, overallMatch: false },
          sprayCodeData: { batchNo: null, packNo: null, productionDate: null, netWeight: null, grossWeight: null, pieces: null },
        },
        message: '喷码对比完成',
        timestamp: new Date().toISOString(),
      };

      mockRecordRepo.create.mockReturnValue({ id: 'test-uuid' });
      mockRecordRepo.save.mockResolvedValue({ id: 'test-uuid' });

      const id = await service.saveCompareRecord(result);

      expect(id).toBeDefined();
      expect(mockImageStorage.saveImage).not.toHaveBeenCalled();
      expect(mockImageRepo.save).not.toHaveBeenCalled();
    });

    it('should extract summary fields for list query', async () => {
      const result = {
        success: true,
        data: {
          compareResults: [],
          summary: { totalFields: 4, matched: 4, mismatched: 0, missingInSpraycode: 0, missingInLabel: 0, bothMissing: 0, overallMatch: true },
          sprayCodeData: { batchNo: '26-1-001J', packNo: '1', productionDate: '2026-06-15', netWeight: 1500, grossWeight: 1520, pieces: 50 },
        },
        message: '喷码对比完成',
        timestamp: new Date().toISOString(),
      };

      mockRecordRepo.create.mockImplementation((data) => data);
      mockRecordRepo.save.mockResolvedValue({ id: 'test-uuid' });

      await service.saveCompareRecord(result);

      const createCall = mockRecordRepo.create.mock.calls[0][0];
      expect(createCall.batchNo).toBe('26-1-001J');
      expect(createCall.packNo).toBe('1');
      expect(createCall.productionDate).toBe('2026-06-15');
      expect(createCall.overallMatch).toBe(true);
      expect(createCall.matchedCount).toBe(4);
      expect(createCall.totalFields).toBe(4);
    });
  });

  describe('getHistory', () => {
    it('should return paginated history list', async () => {
      const records = [
        { id: '1', batchNo: '26-1-001J', packNo: '1', productionDate: '2026-06-15', overallMatch: true, matchedCount: 4, totalFields: 4, createdAt: new Date() },
        { id: '2', batchNo: '26-1-002J', packNo: '2', productionDate: '2026-06-14', overallMatch: false, matchedCount: 2, totalFields: 4, createdAt: new Date() },
      ];

      mockRecordRepo.findAndCount.mockResolvedValue([records, 2]);
      mockImageRepo.find.mockResolvedValue([
        { recordId: '1', imageType: 'spraycode' },
        { recordId: '2', imageType: 'spraycode' },
      ]);

      const result = await service.getHistory(1, 20);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.items[0].spraycodeImageUrl).toBe('/api/nickel/images/1/spraycode');
    });

    it('should clamp limit to max 100', async () => {
      mockRecordRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getHistory(1, 500);

      const call = mockRecordRepo.findAndCount.mock.calls[0][0];
      expect(call.take).toBe(100);
    });

    it('should clamp page to min 1', async () => {
      mockRecordRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getHistory(-1, 20);

      const call = mockRecordRepo.findAndCount.mock.calls[0][0];
      expect(call.skip).toBe(0);
    });
  });

  describe('getRecordDetail', () => {
    it('should return full record detail', async () => {
      const record = {
        id: 'test-id',
        compareResults: [{ field: 'packNo', matched: true }],
        summary: { overallMatch: true },
        sprayCodeData: { batchNo: '26-1-001J' },
        labelCodeData: null,
        message: '喷码对比完成',
        createdAt: new Date('2026-06-15T10:30:00.000Z'),
      };

      mockRecordRepo.findOne.mockResolvedValue(record);
      mockImageRepo.find.mockResolvedValue([
        { imageType: 'spraycode', mimeType: 'image/jpeg', fileSize: 1024 },
      ]);
      mockImageStorage.imageExists.mockReturnValue(true);

      const detail = await service.getRecordDetail('test-id');

      expect(detail.id).toBe('test-id');
      expect(detail.compareResults).toEqual([{ field: 'packNo', matched: true }]);
      expect(detail.images).toHaveLength(1);
      expect(detail.images[0].exists).toBe(true);
    });

    it('should throw NotFoundException for missing record', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await expect(service.getRecordDetail('nonexistent')).rejects.toThrow('记录不存在');
    });
  });

  describe('deleteRecord', () => {
    it('should delete record and images', async () => {
      const record = { id: 'test-id' };
      const images = [
        { filePath: 'compare/2026/06/15/test-id_spraycode.jpg' },
      ];

      mockRecordRepo.findOne.mockResolvedValue(record);
      mockImageRepo.find.mockResolvedValue(images);
      mockImageStorage.deleteImage.mockResolvedValue(true);
      mockRecordRepo.remove.mockResolvedValue(record);

      await service.deleteRecord('test-id');

      expect(mockImageStorage.deleteImage).toHaveBeenCalledWith('compare/2026/06/15/test-id_spraycode.jpg');
      expect(mockRecordRepo.remove).toHaveBeenCalledWith(record);
    });

    it('should throw NotFoundException for missing record', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteRecord('nonexistent')).rejects.toThrow('记录不存在');
    });
  });

  describe('getImageInfo', () => {
    it('should return image info for existing image', async () => {
      mockImageRepo.findOne.mockResolvedValue({
        filePath: 'compare/2026/06/15/test-id_spraycode.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      });
      mockImageStorage.getAbsolutePath.mockReturnValue('/abs/path/test-id_spraycode.jpg');
      mockImageStorage.imageExists.mockReturnValue(true);

      const info = await service.getImageInfo('test-id', 'spraycode');

      expect(info.mimeType).toBe('image/jpeg');
      expect(info.fileSize).toBe(1024);
    });

    it('should throw NotFoundException for missing image record', async () => {
      mockImageRepo.findOne.mockResolvedValue(null);

      await expect(service.getImageInfo('test-id', 'spraycode')).rejects.toThrow('图片不存在');
    });

    it('should throw NotFoundException for expired image file', async () => {
      mockImageRepo.findOne.mockResolvedValue({
        filePath: 'compare/old/image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      });
      mockImageStorage.getAbsolutePath.mockReturnValue('/abs/path/image.jpg');
      mockImageStorage.imageExists.mockReturnValue(false);

      await expect(service.getImageInfo('test-id', 'spraycode')).rejects.toThrow('图片文件已过期');
    });
  });
});
