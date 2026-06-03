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

// -------------------------------------------------------------------
// Friends Controller
// Friend list, requests and relationship status. Base route: /friends
// -------------------------------------------------------------------
@Controller('friends')
export class FriendsController {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(private readonly friendsService: FriendsService) {}

  // ------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------

  /**
   * Returns the authenticated user's friends list with optional sort.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {string} [sort] - FriendsListSort value (query param).
   * @returns {Promise<FriendListItemView[]>}
   */
  @Get()
  listFriends(
    @Request() req: { user: { sub: number } },
    @Query('sort') sort?: string,
  ) {
    return this.friendsService.findFriends(req.user.sub, sort);
  }

  /**
   * Returns friendship status between the viewer and a user by public number.
   * @param {number} userNumber - Target user's 6-digit profile number.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<FriendRelationshipStatusView>}
   */
  @Get('status/:userNumber')
  relationshipStatus(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.getRelationshipStatus(req.user.sub, userNumber);
  }

  /**
   * Lists pending friend requests received by the authenticated user.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<FriendRequestItemView[]>}
   */
  @Get('requests/incoming')
  incoming(@Request() req: { user: { sub: number } }) {
    return this.friendsService.findIncomingRequests(req.user.sub);
  }

  /**
   * Lists pending friend requests sent by the authenticated user.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<FriendRequestItemView[]>}
   */
  @Get('requests/outgoing')
  outgoing(@Request() req: { user: { sub: number } }) {
    return this.friendsService.findOutgoingRequests(req.user.sub);
  }

  /**
   * Sends a friend request to another user.
   * @param {object} req - Request with authenticated user id (sub).
   * @param {SendFriendRequestDto} body - Target user number or id.
   * @returns {Promise<SendFriendRequestView>}
   */
  @Post('requests')
  sendRequest(
    @Request() req: { user: { sub: number } },
    @Body() body: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(req.user.sub, body);
  }

  /**
   * Accepts an incoming friend request.
   * @param {number} id - Friend request id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<AcceptFriendRequestView>}
   */
  @Post('requests/:id/accept')
  acceptRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.acceptRequest(id, req.user.sub);
  }

  /**
   * Rejects an incoming friend request.
   * @param {number} id - Friend request id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<void>}
   */
  @Post('requests/:id/reject')
  rejectRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.rejectRequest(id, req.user.sub);
  }

  /**
   * Cancels an outgoing friend request (sender only).
   * @param {number} id - Friend request id.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<void>}
   */
  @Delete('requests/:id')
  cancelRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.cancelRequest(id, req.user.sub);
  }

  /**
   * Removes an existing friendship with a user by public number.
   * @param {number} userNumber - Friend's 6-digit profile number.
   * @param {object} req - Request with authenticated user id (sub).
   * @returns {Promise<void>}
   */
  @Delete(':userNumber')
  removeFriend(
    @Param('userNumber', ParseIntPipe) userNumber: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.friendsService.removeFriendship(req.user.sub, userNumber);
  }
}
