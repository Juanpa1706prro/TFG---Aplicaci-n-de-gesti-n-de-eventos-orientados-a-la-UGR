import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserGender } from '../user-enums';

// -------------------------------------------------------------------
// Update profile DTO
// Request body for PATCH /user/profile (all fields optional).
// -------------------------------------------------------------------

/**
 * Partial profile update after onboarding.
 */
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
}
