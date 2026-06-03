import { IsEnum, IsOptional } from 'class-validator';
import { UpdateProfileDto } from '../../user/dto/update-profile.dto';
import { SystemRole } from '../../user/user-enums';

// -------------------------------------------------------------------
// Admin update user DTO
// Request body for PATCH /admin/users/:userNumber.
// -------------------------------------------------------------------

/**
 * Profile fields from UpdateProfileDto plus optional system role change.
 */
export class AdminUpdateUserDto extends UpdateProfileDto {
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;
}
