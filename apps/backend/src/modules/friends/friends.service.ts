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
import { User } from '../user/user.entity';
import { UserProfile } from '../user/user-profile.entity';

export type FriendUserSummary = {
  userId: number;
  userNumber: number;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
};

export type FriendRequestItemView = {
  id: number;
  createdAt: Date;
  user: FriendUserSummary;
};

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

export type AcceptFriendRequestView = {
  friendshipId: number;
  friendsSince: Date;
  user: FriendUserSummary;
};

export type FriendListItemView = {
  friendshipId: number;
  friendsSince: Date;
  user: FriendUserSummary;
};

export type FriendRelationshipStatus =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'friends';

export type FriendRelationshipStatusView = {
  status: FriendRelationshipStatus;
  /** Id de la solicitud de amistad pendiente (entrante o saliente). */
  requestId?: number;
};

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    private readonly usersService: UsersService,
  ) {}

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

    return {
      outcome: 'sent',
      requestId: saved.id,
    };
  }

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
          profilePicture: fromUser.profile.profilePicture,
        },
      };
    });
  }

  async rejectRequest(requestId: number, userId: number): Promise<void> {
    const row = await this.loadIncomingRequestForRecipient(requestId, userId);
    await this.friendRequestRepository.remove(row);
  }

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
        profilePicture: profile.profilePicture,
      },
    };
  }

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
   * Resuelve el destino por PK (perfil) o por userNumber (código).
   * En BD las FK de friend_requests usan siempre users.id.
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

  private async areFriends(userIdA: number, userIdB: number): Promise<boolean> {
    const { userLowId, userHighId } = this.canonicalPair(userIdA, userIdB);
    return this.friendshipRepository.exists({
      where: { userLowId, userHighId },
    });
  }

  private canonicalPair(
    userIdA: number,
    userIdB: number,
  ): { userLowId: number; userHighId: number } {
    return userIdA < userIdB
      ? { userLowId: userIdA, userHighId: userIdB }
      : { userLowId: userIdB, userHighId: userIdA };
  }

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
        profilePicture: profile.profilePicture,
      },
    };
  }
}
