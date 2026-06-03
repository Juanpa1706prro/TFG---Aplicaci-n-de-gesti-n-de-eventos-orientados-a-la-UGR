import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@core/config/api.config';
import { FullUserPayload, UpdateProfilePayload } from '@core/interfaces/user.profile-interface';

@Injectable({ providedIn: 'root' })
export class UserProfileApiService {
  private readonly API_URL = API_BASE_URL;
  private readonly http = inject(HttpClient);

  getFullProfile(): Observable<{ message: string; user: FullUserPayload }> {
    return this.http.get<{ message: string; user: FullUserPayload }>(
      `${this.API_URL}/user/profile`,
    );
  }

  updateProfile(body: UpdateProfilePayload): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.API_URL}/user/profile`,
      body,
    );
  }

  uploadProfilePhoto(file: File): Observable<{ message: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.put<{ message: string }>(
      `${this.API_URL}/user/profile/photo`,
      fd,
    );
  }

  deleteProfilePhoto(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/user/profile/photo`,
    );
  }
}
