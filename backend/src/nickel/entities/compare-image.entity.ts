import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { CompareRecord } from './compare-record.entity';

@Entity('compare_image')
@Unique('UQ_compare_image_recordId_imageType', ['recordId', 'imageType'])
@Index('IDX_compare_image_recordId', ['recordId'])
@Index('IDX_compare_image_createdAt', ['createdAt'])
export class CompareImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('enum', { enum: ['spraycode', 'label'] })
  imageType: 'spraycode' | 'label';

  @Column('varchar', { length: 500 })
  filePath: string;

  @Column('varchar', { length: 255, nullable: true })
  originalName: string | null;

  @Column('varchar', { length: 50 })
  mimeType: string;

  @Column('int')
  fileSize: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CompareRecord, (record) => record.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recordId' })
  recordId: string;

  record: CompareRecord;
}
