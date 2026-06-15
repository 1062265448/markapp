import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CompareImage } from './compare-image.entity';

@Entity('compare_record')
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
  compareResults: any | null;

  @Column('json', { nullable: true })
  summary: any | null;

  @Column('json', { nullable: true })
  sprayCodeData: any | null;

  @Column('json', { nullable: true })
  labelCodeData: any | null;

  @Column('varchar', { length: 500 })
  message: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CompareImage, (img) => img.recordId, { cascade: true })
  images: CompareImage[];
}
