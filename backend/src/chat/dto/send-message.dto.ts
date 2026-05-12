import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  /** Temporary id generated on the client for optimistic-UI reconciliation. */
  @IsOptional()
  @IsString()
  clientMessageId?: string;
}
