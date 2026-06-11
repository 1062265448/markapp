import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class RecognizeDto {
  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsBoolean()
  enableGLM?: boolean;
}

export class SpraycodeDto {
  // 喷码识别：纯文件上传，无额外参数
}

export class CompareDto {
  @IsOptional()
  @IsString()
  barcode?: string;
}
