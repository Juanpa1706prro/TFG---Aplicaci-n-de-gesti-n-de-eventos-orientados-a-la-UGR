import { IsEnum } from 'class-validator';
import { StaffFunction } from '../user-enums';

// -------------------------------------------------------------------
// Set session persona DTO
// Request body for PATCH /user/session-persona.
// -------------------------------------------------------------------

/**
 * Selects which staff function drives the current session capabilities.
 */
export class SetSessionPersonaDto {
  @IsEnum(StaffFunction)
  staffFunction!: StaffFunction;
}
