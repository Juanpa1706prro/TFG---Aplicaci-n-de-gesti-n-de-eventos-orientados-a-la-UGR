import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  Validate,
} from 'class-validator';
import { IsUgrEmailConstraint } from '../validators/ugr-email.validator';

// -------------------------------------------------------------------
// Register DTO
// Request body for POST /auth/register.
// -------------------------------------------------------------------

/**
 * Payload for user registration (UGR email, password and optional operator key).
 */
export class RegisterDto {
  @Validate(IsUgrEmailConstraint)
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString()
  @MinLength(6)
  @Matches(/[A-Z]/, { message: 'Debe tener al menos una mayúscula' })
  @Matches(/[0-9]/, { message: 'Debe tener al menos un número' })
  @Matches(/[\W_]/, {
    message: 'La contraseña debe tener al menos un carácter especial',
  })
  password: string;

  /** Demo: ADMIN, MANAGER or MODERATOR for system operators; empty = USER. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  operatorKey?: string;
}
