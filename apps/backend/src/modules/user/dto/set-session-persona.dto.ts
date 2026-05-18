import { IsEnum } from 'class-validator';
import { StaffFunction } from '../user-enums';

export class SetSessionPersonaDto {
  @IsEnum(StaffFunction)
  staffFunction!: StaffFunction;
}
