import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Ancla de ruta `map` para hijos (eventos / amigos) sin desmontar el mapa del shell. */
@Component({
  selector: 'app-shell-pass-through',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class ShellPassThroughComponent {}
