import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { FriendsService } from '@core/services/friends.service';
import { AuthService } from '@core/services/auth.services';
import { ShellUiService } from '@core/services/shell-ui.service';
import {
  FriendListItemDto,
  FriendRequestItemDto,
  FriendsListSort,
  FriendUserSummaryDto,
} from '@core/interfaces/friend-interface';
import { userProfilePhotoUrl } from '@core/utils/image-api.util';

type PanelView = 'friends' | 'requests';
type RequestsTab = 'incoming' | 'outgoing';

const SORT_OPTIONS: { value: FriendsListSort; label: string }[] = [
  { value: 'friends_newest', label: 'Amistad más reciente' },
  { value: 'friends_oldest', label: 'Amistad más antigua' },
  { value: 'name_asc', label: 'Nombre A → Z' },
  { value: 'name_desc', label: 'Nombre Z → A' },
];

@Component({
  selector: 'app-friends-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends-panel.html',
  styleUrl: './friends-panel.css',
})
export class FriendsPanelComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly friendsService = inject(FriendsService);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sortOptions = SORT_OPTIONS;
  readonly panelView = signal<PanelView>('friends');
  readonly requestsTab = signal<RequestsTab>('incoming');

  readonly friendsLoading = signal(true);
  readonly friendsError = signal<string | null>(null);
  readonly friends = signal<FriendListItemDto[]>([]);
  readonly friendsSort = signal<FriendsListSort>('friends_newest');

  readonly requestsLoading = signal(false);
  readonly requestsError = signal<string | null>(null);
  readonly incoming = signal<FriendRequestItemDto[]>([]);
  readonly outgoing = signal<FriendRequestItemDto[]>([]);
  readonly pendingIncomingCount = signal(0);

  readonly addCode = signal('');
  readonly addLoading = signal(false);
  readonly addError = signal<string | null>(null);
  readonly addSuccess = signal<string | null>(null);
  readonly actionRequestId = signal<number | null>(null);

  ngOnInit(): void {
    this.shellUi.closeSidebar();
    this.loadFriends();
    this.refreshPendingIncomingCount();

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params.get('tab') === 'requests') {
          this.openRequests();
        }
      });
  }

  get headerTitle(): string {
    return this.panelView() === 'friends' ? 'Amigos' : 'Solicitudes de amistad';
  }

  get headerSubtitle(): string {
    if (this.panelView() === 'friends') {
      return 'Tu lista de amigos. Gestiona las solicitudes de amistad desde el botón superior.';
    }
    return 'Acepta o rechaza las solicitudes de amistad recibidas; cancela las enviadas.';
  }

  closePage(): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber != null) {
      void this.router.navigate(['/u', userNumber, 'map']);
    }
    this.shellUi.openSidebar();
  }

  openRequests(): void {
    this.panelView.set('requests');
    this.loadRequests();
  }

  backToFriends(): void {
    this.panelView.set('friends');
    this.requestsError.set(null);
  }

  onSortChange(value: string): void {
    const sort = value as FriendsListSort;
    this.friendsSort.set(sort);
    this.loadFriends();
  }

  setRequestsTab(tab: RequestsTab): void {
    this.requestsTab.set(tab);
  }

  loadFriends(): void {
    this.friendsLoading.set(true);
    this.friendsError.set(null);

    this.friendsService
      .getFriends(this.friendsSort())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.friends.set(list);
          this.friendsLoading.set(false);
        },
        error: () => {
          this.friendsLoading.set(false);
          this.friendsError.set('No se pudo cargar la lista de amigos.');
        },
      });
  }

  loadRequests(): void {
    this.requestsLoading.set(true);
    this.requestsError.set(null);

    forkJoin({
      incoming: this.friendsService.getIncomingRequests(),
      outgoing: this.friendsService.getOutgoingRequests(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ incoming, outgoing }) => {
          this.incoming.set(incoming);
          this.outgoing.set(outgoing);
          this.pendingIncomingCount.set(incoming.length);
          this.requestsLoading.set(false);
        },
        error: () => {
          this.requestsLoading.set(false);
          this.requestsError.set(
            'No se pudieron cargar las solicitudes de amistad.',
          );
        },
      });
  }

  refreshPendingIncomingCount(): void {
    this.friendsService
      .getIncomingRequests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.pendingIncomingCount.set(list.length),
        error: () => this.pendingIncomingCount.set(0),
      });
  }

  submitAddByCode(): void {
    const raw = this.addCode().trim();
    if (!raw) {
      this.addError.set('Introduce un código de usuario.');
      return;
    }

    const targetUserNumber = Number.parseInt(raw, 10);
    if (!Number.isFinite(targetUserNumber)) {
      this.addError.set('El código debe ser un número válido.');
      return;
    }

    this.addLoading.set(true);
    this.addError.set(null);
    this.addSuccess.set(null);

    this.friendsService
      .sendRequest({ targetUserNumber })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.addLoading.set(false);
          this.addCode.set('');
          if (res.outcome === 'incoming_exists') {
            this.addSuccess.set(res.message);
            this.refreshPendingIncomingCount();
            return;
          }
          this.addSuccess.set('Solicitud de amistad enviada correctamente.');
          this.refreshPendingIncomingCount();
        },
        error: (err) => {
          this.addLoading.set(false);
          this.addError.set(this.readErrorMessage(err));
        },
      });
  }

  acceptRequest(item: FriendRequestItemDto): void {
    this.runRequestAction(item.id, () =>
      this.friendsService.acceptRequest(item.id),
    );
  }

  rejectRequest(item: FriendRequestItemDto): void {
    this.runRequestAction(item.id, () =>
      this.friendsService.rejectRequest(item.id),
    );
  }

  cancelRequest(item: FriendRequestItemDto): void {
    this.runRequestAction(item.id, () =>
      this.friendsService.cancelRequest(item.id),
    );
  }

  private runRequestAction(
    requestId: number,
    action: () => import('rxjs').Observable<unknown>,
  ): void {
    this.actionRequestId.set(requestId);
    this.requestsError.set(null);

    action()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionRequestId.set(null);
          this.loadRequests();
          this.loadFriends();
          this.refreshPendingIncomingCount();
        },
        error: (err) => {
          this.actionRequestId.set(null);
          this.requestsError.set(this.readErrorMessage(err));
        },
      });
  }

  openProfile(user: FriendUserSummaryDto): void {
    const me = this.auth.currentUserValue?.userNumber;
    if (me == null) {
      return;
    }
    this.shellUi.closeSidebar();
    if (user.userNumber === me) {
      void this.router.navigate(['/u', me, 'profile']);
      return;
    }
    void this.router.navigate(['/u', me, 'profile', user.userNumber]);
  }

  displayName(user: FriendUserSummaryDto): string {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
    return `Usuario #${user.userNumber}`;
  }

  friendsSinceLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return `Amigos desde ${date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }

  requestDateLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  hasPhoto(user: FriendUserSummaryDto): boolean {
    return user.hasProfilePicture;
  }

  userPhotoSrc(userNumber: number): string {
    return userProfilePhotoUrl(userNumber);
  }

  initials(user: FriendUserSummaryDto): string {
    const a = user.firstName?.trim().charAt(0) ?? '';
    const b = user.lastName?.trim().charAt(0) ?? '';
    const combined = `${a}${b}`.toUpperCase();
    return combined || '#';
  }

  isActionLoading(requestId: number): boolean {
    return this.actionRequestId() === requestId;
  }

  private readErrorMessage(err: unknown): string {
    const http = err as HttpErrorResponse;
    const body = http?.error;
    const message =
      typeof body === 'object' && body != null && 'message' in body
        ? (body as { message?: string | string[] }).message
        : undefined;

    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (http?.status === 0) {
      return 'No hay conexión con el servidor. ¿Está el backend en marcha?';
    }
    if (http?.status === 404) {
      return 'Ruta no encontrada (revisa el proxy del frontend).';
    }
    return 'No se pudo completar la acción.';
  }
}
