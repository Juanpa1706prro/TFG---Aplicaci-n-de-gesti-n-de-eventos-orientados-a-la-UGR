import { Component, output } from '@angular/core';

/** Capa modal centrada: clic en el mapa (dim) o × cierra y emite `close`. */
@Component({
  selector: 'app-column-overlay',
  standalone: true,
  template: `
    <div class="column-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        class="column-overlay__dim"
        aria-label="Cerrar y volver al mapa"
        (click)="requestClose()"
      ></button>

      <section class="column-overlay__panel">
        <button
          type="button"
          class="column-overlay__close"
          aria-label="Cerrar"
          (click)="requestClose()"
        >
          ×
        </button>
        <div class="column-overlay__body">
          <ng-content />
        </div>
      </section>
    </div>
  `,
  styleUrl: './column-overlay.component.css',
})
export class ColumnOverlayComponent {
  readonly close = output<void>();

  requestClose(): void {
    this.close.emit();
  }
}
