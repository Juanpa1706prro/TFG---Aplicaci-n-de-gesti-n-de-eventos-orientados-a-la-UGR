import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserGender } from '../user-enums';

/** Actualización puntual del perfil tras el onboarding (todos opcionales). */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/, {
    message: 'El formato del número de teléfono no es válido',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

}
