import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { AuthService } from '@core/services/auth.services';
import { PublicProfileView } from '@core/interfaces/user.profile-interface';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  private readonly API_URL = 'http://localhost:3000';

  profileView: PublicProfileView | null = null;
  loadError = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((pm) => pm.get('userNumber')),
        filter((n): n is string => !!n),
        map((n) => parseInt(n, 10)),
        switchMap((userNumber) =>
          this.http.get<{ profile: PublicProfileView }>(
            `${this.API_URL}/user/public/${userNumber}`,
          ),
        ),
      )
      .subscribe({
        next: (res) => {
          this.loadError = false;
          this.profileView = res.profile;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadError = true;
          this.profileView = null;
          this.cdr.detectChanges();
        },
      });
  }
}
