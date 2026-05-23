import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendRequest } from './friend-request.entity';
import { Friendship } from './friendship.entity';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { UsersModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FriendRequest, Friendship]),
    UsersModule,
  ],
  providers: [FriendsService],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}
