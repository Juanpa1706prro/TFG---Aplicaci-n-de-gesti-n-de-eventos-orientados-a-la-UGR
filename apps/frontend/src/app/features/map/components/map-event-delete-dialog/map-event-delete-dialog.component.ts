import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map-event-delete-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-event-delete-dialog.component.html',
  styleUrl: './map-event-delete-dialog.component.css',
})
export class MapEventDeleteDialogComponent {
  readonly loading = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  cancel(): void {
    if (this.loading()) {
      return;
    }
    this.closed.emit();
  }

  confirm(): void {
    this.confirmed.emit();
  }
}
