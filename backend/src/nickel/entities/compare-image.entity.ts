import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompareRecord } from './compare-record.entity';

@Entity('compare_image')
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
