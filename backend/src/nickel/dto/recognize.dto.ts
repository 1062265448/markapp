import { IsOptional, IsString } from 'class-validator';

export class RecognizeDto {
  @IsOptional()
  @IsString()
  barcode?: string;
}

export class CompareDto {
  @IsOptional()
  @IsString()
  barcode?: string;
}
