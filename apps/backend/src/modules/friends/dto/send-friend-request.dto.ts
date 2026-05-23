import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Destino de la solicitud de amistad: exactamente uno de los dos campos.
 * - targetUserNumber: formulario / código (lookup por perfil).
 * - targetUserId: botón en perfil ajeno (lookup directo por PK).
 */
export class SendFriendRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100_000)
  @Max(999_999)
  targetUserNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetUserId?: number;
}
