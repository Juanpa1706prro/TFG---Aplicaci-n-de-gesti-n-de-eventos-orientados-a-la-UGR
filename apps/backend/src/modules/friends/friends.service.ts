import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest } from './friend-request.entity';
import { Friendship } from './friendship.entity';
import { FriendsListSort } from './friends-enums';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { UsersService } from '../user/user.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../user/user.entity';
import { UserProfile } from '../user/user-profile.entity';
import { hasStoredImage } from '../../common/image/image-validation.util';

// -------------------------------------------------------------------
// Friends Service
// Friend requests, friendships, list sorting and relationship status.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

/** Public user summary shown in friend lists and requests. */
export type FriendUserSummary = {
  userId: number;
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  hasProfilePicture: boolean;
};

/** Incoming or outgoing pending request row for the UI. */
export type FriendRequestItemView = {
  id: number;
  createdAt: Date;
  user: FriendUserSummary;
};

/** Result of POST /friends/requests (sent or reciprocal pending). */
export type SendFriendRequestView =
  | {
      outcome: 'sent';
      requestId: number;
    }
  | {
      outcome: 'incoming_exists';
      requestId: number;
      message: string;
    };

/** Response after accepting a friend request. */
export type AcceptFriendRequestView = {
  friendshipId: number;
  friendsSince: Date;
  user: FriendUserSummary;
};

/** Confirmed friend row for GET /friends. */
export type FriendListItemView = {
  friendshipId: number;
  friendsSince: Date;
  user: FriendUserSummary;
};

/** Relationship between viewer and another user. */
export type FriendRelationshipStatus =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'friends';

/** GET /friends/status/:userNumber response. */
export type FriendRelationshipStatusView = {
  status: FriendRelationshipStatus;
  /** Pending friend request id (incoming or outgoing) when applicable. */
  requestId?: number;
};

@Injectable()
export class FriendsService {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------

  /**
   * Sends a friend request to another user (by user number or user id).
   * @param {number} fromUserId - Authenticated sender user id.
   * @param {SendFriendRequestDto} dto - Exactly one target field.
   * @returns {Promise<SendFriendRequestView>}
   * @throws {BadRequestException} On self-request, duplicates or already friends.
   */
  async sendRequest(
    fromUserId: number,
    dto: SendFriendRequestDto,
  ): Promise<SendFriendRequestView> {
    const target = await this.resolveTargetUser(dto);

    if (target.id === fromUserId) {
      throw new BadRequestException(
        'No puedes enviarte una solicitud de amistad a ti mismo.',
      );
    }

    if (await this.areFriends(fromUserId, target.id)) {
      throw new BadRequestException('Ya sois amigos.');
    }

    const incoming = await this.friendRequestRepository.findOne({
      where: {
        fromUserId: target.id,
        toUserId: fromUserId,
      },
    });
    if (incoming) {
      return {
        outcome: 'incoming_exists',
        requestId: incoming.id,
        message:
          'Este usuario ya te ha enviado una solicitud de amistad. Acéptala en Amigos → Solicitudes de amistad.',
      };
    }

    const outgoingPending = await this.friendRequestRepository.findOne({
      where: {
        fromUserId,
        toUserId: target.id,
      },
    });
    if (outgoingPending) {
      throw new BadRequestException(
        'Ya tienes una solicitud de amistad pendiente a este usuario.',
      );
    }

    const saved = await this.friendRequestRepository.save({
      fromUserId,
      toUserId: target.id,
    });

    await this.notificationsService.createFriendRequestNotification(
      fromUserId,
      target.id,
      saved.id,
    );

    return {
      outcome: 'sent',
      requestId: saved.id,
    };
  }

  /**
   * Lists friend requests received by the user (newest first).
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<FriendRequestItemView[]>}
   */
  async findIncomingRequests(userId: number): Promise<FriendRequestItemView[]> {
    const rows = await this.friendRequestRepository.find({
      where: {
        toUserId: userId,
      },
      relations: { fromUser: { profile: true } },
      order: { createdAt: 'DESC' },
    });

    return rows.map((row) => this.toRequestItemView(row.id, row.createdAt, row.fromUser));
  }

  /**
   * Lists friend requests sent by the user (newest first).
   * @param {number} userId - Authenticated user id.
   * @returns {Promise<FriendRequestItemView[]>}
   */
  async findOutgoingRequests(userId: number): Promise<FriendRequestItemView[]> {
    const rows = await this.friendRequestRepository.find({
      where: {
        fromUserId: userId,
      },
      relations: { toUser: { profile: true } },
      order: { createdAt: 'DESC' },
    });

    return rows.map((row) => this.toRequestItemView(row.id, row.createdAt, row.toUser));
  }

  /**
   * Cancels an outgoing friend request (sender only).
   * @param {number} requestId - Friend request id.
   * @param {number} userId - Authenticated sender user id.
   * @returns {Promise<void>}
   */
  async cancelRequest(requestId: number, userId: number): Promise<void> {
    const row = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!row) {
      throw new NotFoundException('Solicitud de amistad no encontrada.');
    }

    if (row.fromUserId !== userId) {
      throw new ForbiddenException(
        'Solo puedes cancelar solicitudes de amistad que hayas enviado tú.',
      );
    }

    await this.friendRequestRepository.remove(row);
  }

  /**
   * Accepts an incoming request and creates a canonical friendship row.
   * @param {number} requestId - Friend request id.
   * @param {number} userId - Authenticated recipient user id.
   * @returns {Promise<AcceptFriendRequestView>}
   */
  async acceptRequest(
    requestId: number,
    userId: number,
  ): Promise<AcceptFriendRequestView> {
    const row = await this.loadIncomingRequestForRecipient(requestId, userId);

    if (await this.areFriends(row.fromUserId, row.toUserId)) {
      throw new BadRequestException('Ya sois amigos.');
    }

    const { userLowId, userHighId } = this.canonicalPair(
      row.fromUserId,
      row.toUserId,
    );

    return this.friendRequestRepository.manager.transaction(async (em) => {
      const friendship = await em.getRepository(Friendship).save({
        userLowId,
        userHighId,
      });

      await em.getRepository(FriendRequest).remove(row);

      const fromUser = await this.usersService.findByID(row.fromUserId);
      if (!fromUser?.profile) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      return {
        friendshipId: friendship.id,
        friendsSince: friendship.createdAt,
        user: {
          userId: fromUser.id,
          userNumber: fromUser.profile.userNumber,
          firstName: fromUser.profile.firstName,
          lastName: fromUser.profile.lastName,
          hasProfilePicture: hasStoredImage(fromUser.profile.profilePictureData),
        },
      };
    });
  }

  /**
   * Rejects an incoming friend request (recipient only).
   * @param {number} requestId - Friend request id.
   * @param {number} userId - Authenticated recipient user id.
   * @returns {Promise<void>}
   */
  async rejectRequest(requestId: number, userId: number): Promise<void> {
    const row = await this.loadIncomingRequestForRecipient(requestId, userId);
    await this.friendRequestRepository.remove(row);
  }

  /**
   * Returns relationship status between viewer and target by public user number.
   * @param {number} viewerUserId - Authenticated viewer user id.
   * @param {number} targetUserNumber - Target 6-digit profile number.
   * @returns {Promise<FriendRelationshipStatusView>}
   */
  async getRelationshipStatus(
    viewerUserId: number,
    targetUserNumber: number,
  ): Promise<FriendRelationshipStatusView> {
    const target = await this.usersService.findByProfileUserNumber(
      targetUserNumber,
    );
    if (!target) {
      throw new NotFoundException(
        `No existe ningún usuario con número ${targetUserNumber}.`,
      );
    }

    if (target.id === viewerUserId) {
      throw new BadRequestException(
        'No puedes consultar el estado de amistad contigo mismo.',
      );
    }

    if (await this.areFriends(viewerUserId, target.id)) {
      return { status: 'friends' };
    }

    const incoming = await this.friendRequestRepository.findOne({
      where: {
        fromUserId: target.id,
        toUserId: viewerUserId,
      },
    });
    if (incoming) {
      return { status: 'pending_incoming', requestId: incoming.id };
    }

    const outgoing = await this.friendRequestRepository.findOne({
      where: {
        fromUserId: viewerUserId,
        toUserId: target.id,
      },
    });
    if (outgoing) {
      return { status: 'pending_outgoing', requestId: outgoing.id };
    }

    return { status: 'none' };
  }

  /**
   * Removes an existing friendship with a user by public number.
   * @param {number} viewerUserId - Authenticated user id.
   * @param {number} targetUserNumber - Friend's 6-digit profile number.
   * @returns {Promise<void>}
   */
  async removeFriendship(
    viewerUserId: number,
    targetUserNumber: number,
  ): Promise<void> {
    const target = await this.usersService.findByProfileUserNumber(
      targetUserNumber,
    );
    if (!target) {
      throw new NotFoundException(
        `No existe ningún usuario con número ${targetUserNumber}.`,
      );
    }

    if (target.id === viewerUserId) {
      throw new BadRequestException('No puedes eliminar la amistad contigo mismo.');
    }

    const { userLowId, userHighId } = this.canonicalPair(
      viewerUserId,
      target.id,
    );

    const friendship = await this.friendshipRepository.findOne({
      where: { userLowId, userHighId },
    });

    if (!friendship) {
      throw new NotFoundException('No existe una amistad con este usuario.');
    }

    await this.friendshipRepository.remove(friendship);
  }

  /**
   * Returns the authenticated user's friends list with client-selected sort.
   * @param {number} userId - Authenticated user id.
   * @param {string} [sortParam] - FriendsListSort query value.
   * @returns {Promise<FriendListItemView[]>}
   */
  async findFriends(
    userId: number,
    sortParam?: string,
  ): Promise<FriendListItemView[]> {
    const sort = this.parseFriendsListSort(sortParam);

    const rows = await this.friendshipRepository.find({
      where: [{ userLowId: userId }, { userHighId: userId }],
      relations: {
        userLow: { profile: true },
        userHigh: { profile: true },
      },
    });

    const items = rows.map((row) => this.toFriendListItem(row, userId));
    items.sort((a, b) => this.compareFriends(a, b, sort));
    return items;
  }

  // ------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------

  /**
   * Parses and validates the friends list sort query parameter.
   * @param {string} [sortParam] - Raw sort from query string.
   * @returns {FriendsListSort}
   * @throws {BadRequestException} If sort is invalid when provided.
   */
  private parseFriendsListSort(sortParam?: string): FriendsListSort {
    const values = Object.values(FriendsListSort) as string[];
    if (sortParam && values.includes(sortParam)) {
      return sortParam as FriendsListSort;
    }
    if (sortParam) {
      throw new BadRequestException(
        `Orden no válido. Usa: ${values.join(', ')}.`,
      );
    }
    return FriendsListSort.FRIENDS_NEWEST;
  }

  /**
   * Comparator for in-memory friends list sorting.
   * @param {FriendListItemView} a - First item.
   * @param {FriendListItemView} b - Second item.
   * @param {FriendsListSort} sort - Desired sort order.
   * @returns {number} Sort comparison result.
   */
  private compareFriends(
    a: FriendListItemView,
    b: FriendListItemView,
    sort: FriendsListSort,
  ): number {
    switch (sort) {
      case FriendsListSort.FRIENDS_OLDEST:
        return a.friendsSince.getTime() - b.friendsSince.getTime();
      case FriendsListSort.NAME_ASC:
        return this.compareByName(a.user, b.user);
      case FriendsListSort.NAME_DESC:
        return this.compareByName(b.user, a.user);
      case FriendsListSort.FRIENDS_NEWEST:
      default:
        return b.friendsSince.getTime() - a.friendsSince.getTime();
    }
  }

  /**
   * Locale-aware name comparison (Spanish collation).
   * @param {FriendUserSummary} a - First user.
   * @param {FriendUserSummary} b - Second user.
   * @returns {number} Sort comparison result.
   */
  private compareByName(a: FriendUserSummary, b: FriendUserSummary): number {
    const last = (a.lastName ?? '').localeCompare(b.lastName ?? '', 'es');
    if (last !== 0) {
      return last;
    }
    const first = (a.firstName ?? '').localeCompare(b.firstName ?? '', 'es');
    if (first !== 0) {
      return first;
    }
    return a.userNumber - b.userNumber;
  }

  /**
   * Maps a Friendship row to the list item for the viewer.
   * @param {Friendship} row - Friendship with userLow/userHigh profiles loaded.
   * @param {number} viewerId - Authenticated user id.
   * @returns {FriendListItemView}
   */
  private toFriendListItem(row: Friendship, viewerId: number): FriendListItemView {
    const other = row.userLowId === viewerId ? row.userHigh : row.userLow;
    const profile = other.profile as UserProfile;
    return {
      friendshipId: row.id,
      friendsSince: row.createdAt,
      user: {
        userId: other.id,
        userNumber: profile.userNumber,
        firstName: profile.firstName,
        lastName: profile.lastName,
        hasProfilePicture: hasStoredImage(profile.profilePictureData),
      },
    };
  }

  /**
   * Loads a friend request and ensures the user is the recipient.
   * @param {number} requestId - Friend request id.
   * @param {number} recipientUserId - Authenticated recipient user id.
   * @returns {Promise<FriendRequest>}
   */
  private async loadIncomingRequestForRecipient(
    requestId: number,
    recipientUserId: number,
  ): Promise<FriendRequest> {
    const row = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!row) {
      throw new NotFoundException('Solicitud de amistad no encontrada.');
    }

    if (row.toUserId !== recipientUserId) {
      throw new ForbiddenException(
        'Solo puedes responder solicitudes de amistad que hayas recibido.',
      );
    }

    return row;
  }

  /**
   * Resolves request target by profile user number or user primary key.
   * Friend request FKs always reference users.id.
   * @param {SendFriendRequestDto} dto - Request payload.
   * @returns {Promise<User>} Target user entity.
   */
  private async resolveTargetUser(dto: SendFriendRequestDto): Promise<User> {
    const hasNumber = dto.targetUserNumber != null;
    const hasId = dto.targetUserId != null;

    if (hasNumber === hasId) {
      throw new BadRequestException(
        'Indica exactamente uno: targetUserNumber o targetUserId.',
      );
    }

    if (hasId) {
      const user = await this.usersService.findByID(dto.targetUserId!);
      if (!user) {
        throw new NotFoundException('El usuario indicado no existe.');
      }
      return user;
    }

    const user = await this.usersService.findByProfileUserNumber(
      dto.targetUserNumber!,
    );
    if (!user) {
      throw new NotFoundException(
        `No existe ningún usuario con número ${dto.targetUserNumber}.`,
      );
    }
    return user;
  }

  /**
   * Checks whether two users already have a friendship row.
   * @param {number} userIdA - First user id.
   * @param {number} userIdB - Second user id.
   * @returns {Promise<boolean>}
   */
  async areFriends(userIdA: number, userIdB: number): Promise<boolean> {
    const { userLowId, userHighId } = this.canonicalPair(userIdA, userIdB);
    return this.friendshipRepository.exists({
      where: { userLowId, userHighId },
    });
  }

  /**
   * Builds canonical (low, high) user id pair for unique friendship storage.
   * @param {number} userIdA - First user id.
   * @param {number} userIdB - Second user id.
   * @returns {{ userLowId: number; userHighId: number }}
   */
  private canonicalPair(
    userIdA: number,
    userIdB: number,
  ): { userLowId: number; userHighId: number } {
    return userIdA < userIdB
      ? { userLowId: userIdA, userHighId: userIdB }
      : { userLowId: userIdB, userHighId: userIdA };
  }

  /**
   * Maps a user to a pending request list item.
   * @param {number} id - Request id.
   * @param {Date} createdAt - Request timestamp.
   * @param {User} user - Counterparty user with profile loaded.
   * @returns {FriendRequestItemView}
   */
  private toRequestItemView(
    id: number,
    createdAt: Date,
    user: User,
  ): FriendRequestItemView {
    const profile = user.profile as UserProfile;
    return {
      id,
      createdAt,
      user: {
        userId: user.id,
        userNumber: profile.userNumber,
        firstName: profile.firstName,
        lastName: profile.lastName,
        hasProfilePicture: hasStoredImage(profile.profilePictureData),
      },
    };
  }
}
