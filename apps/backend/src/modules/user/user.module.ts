import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserProfile } from './user-profile.entity';
import { StudentProfile } from './student-profile.entity';
import { UserStaffFunction } from './user-staff-function.entity';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';

// ------------------------------------------------------------
// Users Module.
// ------------------------------------------------------------
@Module({
  imports: [
    // -------------------------------------------------------------------
    // Registers the User entity within this module's scope.
    // This allows injecting the TypeORM Repository<User> into the UsersService.
    // -------------------------------------------------------------------
    TypeOrmModule.forFeature([User, UserProfile, StudentProfile, UserStaffFunction]),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
