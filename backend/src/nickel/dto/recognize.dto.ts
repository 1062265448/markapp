import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class RecognizeDto {
  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  enableGLM?: boolean;
}

export class CompareDto {
  @IsOptional()
  @IsString()
  barcode?: string;
}
