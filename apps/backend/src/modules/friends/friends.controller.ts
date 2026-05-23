import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  listFriends(
    @Request() req: { user: { sub: number } },
    @Query('sort') sort?: string,
  ) {
    return this.friendsService.findFriends(req.user.sub, sort);
  }

  @Get('status/:userNumber')
  relationshipStatus(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.getRelationshipStatus(req.user.sub, userNumber);
  }

  @Get('requests/incoming')
  incoming(@Request() req: { user: { sub: number } }) {
    return this.friendsService.findIncomingRequests(req.user.sub);
  }

  @Get('requests/outgoing')
  outgoing(@Request() req: { user: { sub: number } }) {
    return this.friendsService.findOutgoingRequests(req.user.sub);
  }

  @Post('requests')
  sendRequest(
    @Request() req: { user: { sub: number } },
    @Body() body: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(req.user.sub, body);
  }

  @Post('requests/:id/accept')
  acceptRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.acceptRequest(id, req.user.sub);
  }

  @Post('requests/:id/reject')
  rejectRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.rejectRequest(id, req.user.sub);
  }

  @Delete('requests/:id')
  cancelRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.cancelRequest(id, req.user.sub);
  }

  @Delete(':userNumber')
  removeFriend(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.removeFriendship(req.user.sub, userNumber);
  }
}
