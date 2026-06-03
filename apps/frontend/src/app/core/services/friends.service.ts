import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import {
  FriendListItemDto,
  FriendRelationshipStatusDto,
  FriendRequestItemDto,
  FriendsListSort,
  SendFriendRequestResultDto,
} from '@core/interfaces/friend-interface';

export type SendFriendRequestPayload =
  | { targetUserNumber: number; targetUserId?: never }
  | { targetUserId: number; targetUserNumber?: never };

@Injectable({ providedIn: 'root' })
export class FriendsService {
  private readonly API_URL = API_BASE_URL;

  constructor(private readonly http: HttpClient) {}

  getRelationshipStatus(
    targetUserNumber: number,
  ): Observable<FriendRelationshipStatusDto> {
    return this.http.get<FriendRelationshipStatusDto>(
      `${this.API_URL}/friends/status/${targetUserNumber}`,
    );
  }

  getFriends(sort: FriendsListSort = 'friends_newest'): Observable<FriendListItemDto[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<FriendListItemDto[]>(`${this.API_URL}/friends`, { params });
  }

  getIncomingRequests(): Observable<FriendRequestItemDto[]> {
    return this.http.get<FriendRequestItemDto[]>(
      `${this.API_URL}/friends/requests/incoming`,
    );
  }

  getOutgoingRequests(): Observable<FriendRequestItemDto[]> {
    return this.http.get<FriendRequestItemDto[]>(
      `${this.API_URL}/friends/requests/outgoing`,
    );
  }

  sendRequest(payload: SendFriendRequestPayload): Observable<SendFriendRequestResultDto> {
    return this.http.post<SendFriendRequestResultDto>(
      `${this.API_URL}/friends/requests`,
      payload,
    );
  }

  acceptRequest(requestId: number): Observable<unknown> {
    return this.http.post(`${this.API_URL}/friends/requests/${requestId}/accept`, {});
  }

  rejectRequest(requestId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/friends/requests/${requestId}/reject`, {});
  }

  cancelRequest(requestId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/friends/requests/${requestId}`);
  }

  removeFriend(targetUserNumber: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/friends/${targetUserNumber}`,
    );
  }
}
