import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import {
  AdminUpdateUserPayload,
  AdminUserDetail,
  AdminUsersListParams,
  AdminUsersListResponse,
} from '@core/interfaces/admin-user.interface';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly API_URL = API_BASE_URL;
  private readonly http = inject(HttpClient);

  listUsers(params: AdminUsersListParams): Observable<AdminUsersListResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit))
      .set('sort', params.sort)
      .set('order', params.order);

    const q = params.q?.trim();
    if (q) {
      httpParams = httpParams.set('q', q);
    }

    return this.http.get<AdminUsersListResponse>(`${this.API_URL}/admin/users`, {
      params: httpParams,
    });
  }

  getUser(userNumber: number): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(
      `${this.API_URL}/admin/users/${userNumber}`,
    );
  }

  updateUser(
    userNumber: number,
    body: AdminUpdateUserPayload,
  ): Observable<{ message: string; user: AdminUserDetail }> {
    return this.http.patch<{ message: string; user: AdminUserDetail }>(
      `${this.API_URL}/admin/users/${userNumber}`,
      body,
    );
  }

  deleteUser(userNumber: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/admin/users/${userNumber}`,
    );
  }

  uploadUserPhoto(
    userNumber: number,
    file: File,
  ): Observable<{ message: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.put<{ message: string }>(
      `${this.API_URL}/admin/users/${userNumber}/photo`,
      fd,
    );
  }
}
