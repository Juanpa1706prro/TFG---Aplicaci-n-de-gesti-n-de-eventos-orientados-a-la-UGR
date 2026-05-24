import { IsEnum, IsOptional } from 'class-validator';
import { UpdateProfileDto } from '../../user/dto/update-profile.dto';
import { SystemRole } from '../../user/user-enums';

export class AdminUpdateUserDto extends UpdateProfileDto {
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;
}
