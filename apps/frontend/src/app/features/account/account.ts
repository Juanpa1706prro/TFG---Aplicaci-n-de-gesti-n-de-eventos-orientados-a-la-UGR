import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.services';
import { ColumnOverlayComponent } from '../../layout/column-overlay.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ColumnOverlayComponent, RouterLink],
  templateUrl: './account.html',
  styleUrls: ['./account.css', '../profile/profile.css'],
})
export class AccountComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  profileLink(): string[] {
    const n = this.auth.currentUserValue?.userNumber;
    return n != null ? ['/u', String(n), 'profile'] : ['/auth'];
  }

  closeToMap(): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber != null) {
      void this.router.navigate(['/u', userNumber, 'map']);
    }
  }
}
