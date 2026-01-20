import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateBotDto {
  @IsString()
  @IsNotEmpty()
  botToken: string;

  @IsString()
  @IsNotEmpty()
  botName: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBotDto {
  @IsString()
  @IsOptional()
  botToken?: string;

  @IsString()
  @IsOptional()
  botName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
