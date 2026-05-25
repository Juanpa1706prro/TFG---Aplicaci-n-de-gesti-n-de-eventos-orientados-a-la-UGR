import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

// -------------------------------------------------------------------
// Login DTO
// Request body for POST /auth/login.
// -------------------------------------------------------------------

/**
 * Payload for user login (email and password).
 */
export class LoginDto {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El email es obligatorio' })
  password: string;
}
