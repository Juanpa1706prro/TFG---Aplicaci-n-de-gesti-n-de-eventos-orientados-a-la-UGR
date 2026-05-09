// update-profile.dto.ts
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserFaculty, UserGender, UserCampus, UserDegree } from '../user-enums'; // Ajusta la ruta

export class UpdateProfileDto {
  // ------------------------------------------------------------
  // Datos Obligatorios (Onboarding)
  // ------------------------------------------------------------

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  firstName: string;

  @IsString({ message: 'Los apellidos deben ser una cadena de texto' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  lastName: string;

  @IsEnum(UserGender, { message: 'El género seleccionado no es válido' })
  @IsNotEmpty({ message: 'El género es obligatorio' })
  gender: UserGender;

  @IsEnum(UserFaculty, { message: 'La facultad seleccionada no es válida' })
  @IsNotEmpty({ message: 'La facultad es obligatoria' })
  faculty: UserFaculty;

  // ------------------------------------------------------------
  // Datos Opcionales
  // ------------------------------------------------------------

  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsDateString(
    {},
    {
      message:
        'La fecha de nacimiento debe tener un formato válido (YYYY-MM-DD)',
    },
  )
  birthDate: Date;

  @IsOptional()
  @IsString()
  @Matches(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, {
    message: 'El formato del número de teléfono no es válido',
  })
  phoneNumber?: string;

  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsEnum(UserCampus, { message: 'El campus seleccionado no es válido' })
  campus?: UserCampus;

  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsEnum(UserDegree, { message: 'La titulación seleccionada no es válida' })
  degree?: UserDegree;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La biografía no puede superar los 500 caracteres',
  })
  bio?: string;

  @IsOptional()
  @IsString() // Si vas a guardar URLs directamente, podrías usar @IsUrl()
  profilePicture?: string;
}
