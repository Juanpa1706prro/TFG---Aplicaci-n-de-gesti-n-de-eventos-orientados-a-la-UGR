/** Entradas del panel de administración (solo UI por ahora). */
export type AdminSidebarMenuItem = {
  id: string;
  label: string;
  hint: string;
};

export const ADMIN_SIDEBAR_MENU_ITEMS: AdminSidebarMenuItem[] = [
  {
    id: 'users',
    label: 'Usuarios',
    hint: 'Cuentas, perfiles y roles del sistema',
  },
  {
    id: 'events',
    label: 'Eventos',
    hint: 'Todos los eventos, borrados y gestores',
  },
  {
    id: 'friendships',
    label: 'Amistades',
    hint: 'Solicitudes y relaciones entre usuarios',
  },
  {
    id: 'delegations',
    label: 'Delegaciones',
    hint: 'Delegaciones de facultad y miembros',
  },
  {
    id: 'attendance',
    label: 'Asistencias',
    hint: 'Registro de asistencia a eventos',
  },
];
