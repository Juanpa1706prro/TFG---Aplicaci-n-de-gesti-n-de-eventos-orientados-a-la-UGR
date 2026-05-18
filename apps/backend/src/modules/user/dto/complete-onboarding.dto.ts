import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayUnique,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  UserFaculty,
  UserGender,
  UserCampus,
  UserDegree,
  StaffFunction,
} from '../user-enums';

/** Cuerpo flexible: la validación estricta la hace UsersService según el tipo de correo. */
export class CompleteOnboardingDto {
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
  @IsArray()
  @ArrayUnique()
  @IsEnum(StaffFunction, { each: true })
  staffFunctions?: StaffFunction[];

  @IsOptional()
  @IsEnum(UserFaculty)
  faculty?: UserFaculty;

  @IsOptional()
  @IsEnum(UserCampus)
  campus?: UserCampus;

  @IsOptional()
  @IsEnum(UserDegree)
  degree?: UserDegree;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  department?: string;
}
