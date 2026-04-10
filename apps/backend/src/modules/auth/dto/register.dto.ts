import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
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
}
