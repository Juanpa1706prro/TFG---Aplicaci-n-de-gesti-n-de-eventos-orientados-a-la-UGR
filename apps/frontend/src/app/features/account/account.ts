import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.services';
import { ColumnOverlayComponent } from '../../layout/column-overlay.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ColumnOverlayComponent],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  closeToMap(): void {
    const userNumber = this.auth.currentUserValue?.userNumber;
    if (userNumber != null) {
      void this.router.navigate(['/u', userNumber, 'map']);
    }
  }
}
