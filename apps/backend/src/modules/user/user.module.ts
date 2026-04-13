import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserProfile } from './user-profile.entity';
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
    TypeOrmModule.forFeature([User, UserProfile]),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
