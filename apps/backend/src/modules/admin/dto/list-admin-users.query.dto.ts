import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// -------------------------------------------------------------------
// List admin users query DTO
// Query parameters for GET /admin/users.
// -------------------------------------------------------------------

/**
 * Pagination, sorting and search options for the admin user list.
 */
export class ListAdminUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 25;

  @IsOptional()
  @IsIn(['createdAt', 'name'])
  sort?: 'createdAt' | 'name' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
