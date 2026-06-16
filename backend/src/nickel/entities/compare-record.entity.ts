import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CompareImage } from './compare-image.entity';
import { CompareResultItem, CompareSummary, SpraycodeData } from '../types/nickel.types';

@Entity('compare_record')
@Index('IDX_compare_record_createdAt', ['createdAt'])
export class CompareRecord {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 50, nullable: true })
  batchNo: string | null;

  @Column('varchar', { length: 50, nullable: true })
  packNo: string | null;

  @Column('varchar', { length: 20, nullable: true })
  productionDate: string | null;

  @Column('tinyint', { nullable: true })
  overallMatch: boolean | null;

  @Column('int', { nullable: true })
  matchedCount: number | null;

  @Column('int', { nullable: true })
  totalFields: number | null;

  @Column('json', { nullable: true })
  compareResults: CompareResultItem[] | null;

  @Column('json', { nullable: true })
  summary: CompareSummary | null;

  @Column('json', { nullable: true })
  sprayCodeData: SpraycodeData | null;

  @Column('json', { nullable: true })
  labelCodeData: SpraycodeData | null;

  @Column('varchar', { length: 500, nullable: true })
  message: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CompareImage, (img) => img.recordId, { cascade: true })
  images: CompareImage[];
}
