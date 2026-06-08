# UGR Eventos

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)

**English** · [Español](#español)

---

# English

> University event management and visualization system based on an interactive map, geolocation, and artificial intelligence for the University of Granada ecosystem.

**Bachelor's Thesis** — BSc in Computer Engineering · ETSIIT · University of Granada · 2025–2026

---

## Preview

![Interactive map with university events](docs/screenshots/02-mapa.png)

---

## About the project

Academic, cultural, and community activity at the University of Granada is often spread across fragmented channels — posters, email, social media, and faculty websites — making it hard to discover what is happening, where, and when.

**UGR Eventos** unifies **event management** and **geographic visualization** on an interactive map. The application supports differentiated identities (student and UGR staff), permissions based on the active session persona, public events and private meetings with invitations, a friends system, notifications, and a conversational AI assistant.

> Detailed academic documentation (analysis, design, implementation, and testing) is being written in the [`memoria/`](memoria/) folder.

---

## Screenshots

| Login | Map |
| :---: | :---: |
| ![Login](docs/screenshots/01-login.png) | ![Map](docs/screenshots/02-mapa.png) |

| Left sidebar | Events list |
| :---: | :---: |
| ![Left sidebar](docs/screenshots/03-sidebar-izquierda.png) | ![Events list](docs/screenshots/04-lista-eventos.png) |

| Event detail | Directions |
| :---: | :---: |
| ![Event detail](docs/screenshots/05-evento-sidebar.png) | ![Directions](docs/screenshots/06-como-llegar.png) |

| AI assistant | Other user's profile |
| :---: | :---: |
| ![AI assistant](docs/screenshots/07-asistente-ia.png) | ![Other user's profile](docs/screenshots/08-perfil-usuario.png) |

| My profile | Friends |
| :---: | :---: |
| ![My profile](docs/screenshots/09-mi-perfil.png) | ![Friends](docs/screenshots/10-lista-amigos.png) |

| Notifications | Admin panel |
| :---: | :---: |
| ![Notifications](docs/screenshots/11-notificaciones.png) | ![Admin panel](docs/screenshots/12-panel-admin.png) |

---

## Features

### Map & geolocation
- Interactive map with **MapLibre GL** and marker clustering
- Visual map themes (dawn, sunset, night)
- User geolocation and in-app directions (walk / drive) via **Google Routes API**

### Events
- Public events and private meetings with invitations
- Attendance, participants, and image management
- Personal lists filtered by role and active session persona

### Users & permissions
- Login and registration with editorial split-screen layout
- Registration with onboarding and profiles (student / UGR staff)
- Active session persona selection (staff functions)
- System roles: user, moderator, manager, and administrator

### Social
- Friends system (requests, accept, reject)
- Invitation and activity notifications

### AI assistant
- Conversational chat with **Google Gemini** (server-side function calling)
- Create events and meetings, search friends, list events, and resolve faculty locations

### Administration
- Operator panel for user and event management

---

## Tech stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Angular 21, MapLibre GL, Three.js, Supercluster, RxJS |
| **Backend** | NestJS 11, TypeORM, JWT in httpOnly cookies |
| **Database** | PostgreSQL 15 + PostGIS |
| **AI** | Google Gemini (`gemini-2.5-flash`) |
| **Routing** | Google Routes API |
| **Infrastructure** | Docker Compose |

---

## Architecture

```mermaid
flowchart LR
  subgraph client [Frontend]
    A[Angular 21 + MapLibre GL]
  end
  subgraph server [Backend]
    B[NestJS — REST API]
    C[JWT httpOnly cookies]
  end
  subgraph data [Persistence]
    D[(PostgreSQL + PostGIS)]
  end
  subgraph external [External APIs]
    E[Google Gemini]
    F[Google Routes]
  end
  A -->|HTTP / proxy| B
  B --- C
  B --> D
  B --> E
  B --> F
```

### Repository structure

```
├── apps/
│   ├── frontend/     # Angular client (port 4200)
│   └── backend/      # NestJS API (port 3000)
├── memoria/          # LaTeX thesis document
├── docs/             # Additional docs and screenshots
└── docker-compose.yml
```

---

## Quick start

### Requirements

- [Docker](https://www.docker.com/) and Docker Compose
- Git

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/Juanpa1706prro/TFG---Aplicaci-n-de-gesti-n-de-eventos-orientados-a-la-UGR.git
   cd TFG---Aplicaci-n-de-gesti-n-de-eventos-orientados-a-la-UGR
   ```

2. **Configure environment variables**

   ```bash
   cd apps/backend
   cp .env.example .env    # Linux / macOS
   # copy .env.example .env  # Windows
   ```

   Fill in at least the JWT secrets (required). Gemini and Google Routes keys are optional for specific features:

   | Variable | Required | Purpose |
   |----------|:--------:|---------|
   | `JWT_ACCESS_SECRET` | Yes | Access token signing |
   | `JWT_REFRESH_SECRET` | Yes | Refresh token signing |
   | `GEMINI_API_KEY` | No | AI assistant |
   | `GOOGLE_ROUTES_API_KEY` | No | Map routing |

   Generate JWT secrets:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Start the services**

   From the project root:

   ```bash
   docker compose up --build
   ```

4. **Open the application**

   - Frontend: [http://localhost:4200](http://localhost:4200)
   - Backend API: [http://localhost:3000](http://localhost:3000)
   - pgAdmin *(optional)*: [http://localhost:5050](http://localhost:5050)

### Demo data

The backend includes seed scripts to populate test users and events:

```bash
cd apps/backend
npm run seed:ugr-c-z
npm run seed:events-ugr-c-z
```

---

## External API configuration

- **Google Routes API** — [Setup guide](docs/google-routes-setup.md)
- **Google Gemini** — API key from [Google AI Studio](https://aistudio.google.com/apikey) → `GEMINI_API_KEY` in `.env`

API keys **must never** be placed in the frontend; only in `apps/backend/.env` (gitignored).

---

## Project status

| | |
|---|---|
| Working application | Map, events, friends, notifications, admin, AI assistant |
| Academic thesis | In progress ([`memoria/`](memoria/)) |
| Public demo | Not deployed; local execution with Docker |

---

## Author

**Juan Pablo Escudero Ramírez**

- Degree: BSc in Computer Engineering
- Institution: ETSIIT — University of Granada
- Supervisor: Ángel Ruiz Zafra
- Academic year: 2025–2026

---

## License

Academic project developed as a Bachelor's Thesis. Contact the author before reusing the code for non-academic purposes.

---

---

# Español

[English](#english) · **Español**

> Sistema de gestión y visualización de eventos universitarios basado en mapa, localización e inteligencia artificial para el ecosistema de la Universidad de Granada.

**Trabajo Fin de Grado** — Grado en Ingeniería Informática · ETSIIT · UGR · Curso 2025–2026

---

## Vista previa

![Mapa interactivo con eventos universitarios](docs/screenshots/02-mapa.png)

---

## Sobre el proyecto

La actividad docente, cultural y de participación en la Universidad de Granada suele difundirse por canales dispersos — cartelería, correo, redes sociales y webs de centros —, lo que dificulta descubrir qué ocurre, dónde y cuándo.

**UGR Eventos** unifica la **gestión de eventos** y su **visualización geográfica** en un mapa interactivo. La aplicación contempla identidades diferenciadas (estudiante y personal UGR), permisos según la función activa en sesión, eventos públicos y reuniones privadas con invitaciones, sistema de amistades, notificaciones y un asistente conversacional con IA.

> Documentación académica detallada (análisis, diseño, implementación y pruebas) en redacción en la carpeta [`memoria/`](memoria/).

---

## Capturas

| Inicio de sesión | Mapa |
| :---: | :---: |
| ![Login](docs/screenshots/01-login.png) | ![Mapa](docs/screenshots/02-mapa.png) |

| Sidebar izquierda | Lista de eventos |
| :---: | :---: |
| ![Sidebar izquierda](docs/screenshots/03-sidebar-izquierda.png) | ![Lista de eventos](docs/screenshots/04-lista-eventos.png) |

| Detalle de evento | Cómo llegar |
| :---: | :---: |
| ![Detalle de evento](docs/screenshots/05-evento-sidebar.png) | ![Cómo llegar](docs/screenshots/06-como-llegar.png) |

| Asistente IA | Perfil de otro usuario |
| :---: | :---: |
| ![Asistente IA](docs/screenshots/07-asistente-ia.png) | ![Perfil de otro usuario](docs/screenshots/08-perfil-usuario.png) |

| Mi perfil | Lista de amigos |
| :---: | :---: |
| ![Mi perfil](docs/screenshots/09-mi-perfil.png) | ![Lista de amigos](docs/screenshots/10-lista-amigos.png) |

| Notificaciones | Panel de administración |
| :---: | :---: |
| ![Notificaciones](docs/screenshots/11-notificaciones.png) | ![Panel de administración](docs/screenshots/12-panel-admin.png) |

---

## Funcionalidades

### Mapa y geolocalización
- Mapa interactivo con **MapLibre GL** y marcadores agrupados (clustering)
- Temas visuales del mapa (amanecer, atardecer, noche)
- Geolocalización del usuario y rutas integradas en el mapa (a pie / en coche) vía **Google Routes API**

### Eventos
- Eventos públicos y reuniones privadas con invitaciones
- Asistencia, participantes y gestión de imágenes
- Listados personales filtrados por rol y persona activa en sesión

### Usuarios y permisos
- Inicio de sesión y registro con diseño editorial a dos columnas
- Registro con onboarding y perfiles (estudiante / personal UGR)
- Selección de persona activa en sesión (funciones del personal)
- Roles de sistema: usuario, moderador, manager y administrador

### Social
- Sistema de amistades (solicitudes, aceptar, rechazar)
- Notificaciones de invitaciones y actividad

### Asistente IA
- Chat conversacional con **Google Gemini** (function calling en backend)
- Crear eventos y reuniones, buscar amigos, listar eventos y resolver ubicaciones de facultades

### Administración
- Panel para gestión de usuarios y eventos (operadores)

---

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Angular 21, MapLibre GL, Three.js, Supercluster, RxJS |
| **Backend** | NestJS 11, TypeORM, JWT en cookies httpOnly |
| **Base de datos** | PostgreSQL 15 + PostGIS |
| **IA** | Google Gemini (`gemini-2.5-flash`) |
| **Rutas** | Google Routes API |
| **Infraestructura** | Docker Compose |

---

## Arquitectura

```mermaid
flowchart LR
  subgraph cliente [Frontend]
    A[Angular 21 + MapLibre GL]
  end
  subgraph servidor [Backend]
    B[NestJS — API REST]
    C[JWT en cookies httpOnly]
  end
  subgraph datos [Persistencia]
    D[(PostgreSQL + PostGIS)]
  end
  subgraph externo [APIs externas]
    E[Google Gemini]
    F[Google Routes]
  end
  A -->|HTTP / proxy| B
  B --- C
  B --> D
  B --> E
  B --> F
```

### Estructura del repositorio

```
├── apps/
│   ├── frontend/     # Cliente Angular (puerto 4200)
│   └── backend/      # API NestJS (puerto 3000)
├── memoria/          # Memoria LaTeX del TFG
├── docs/             # Documentación complementaria y capturas
└── docker-compose.yml
```

---

## Instalación rápida

### Requisitos

- [Docker](https://www.docker.com/) y Docker Compose
- Git

### Pasos

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/Juanpa1706prro/TFG---Aplicaci-n-de-gesti-n-de-eventos-orientados-a-la-UGR.git
   cd TFG---Aplicaci-n-de-gesti-n-de-eventos-orientados-a-la-UGR
   ```

2. **Configurar variables de entorno**

   ```bash
   cd apps/backend
   copy .env.example .env    # Windows
   # cp .env.example .env    # Linux / macOS
   ```

   Rellena al menos los secretos JWT (obligatorios). Las claves de Gemini y Google Routes son opcionales para funciones concretas:

   | Variable | Obligatoria | Uso |
   |----------|:-----------:|-----|
   | `JWT_ACCESS_SECRET` | Sí | Firma del access token |
   | `JWT_REFRESH_SECRET` | Sí | Firma del refresh token |
   | `GEMINI_API_KEY` | No | Asistente IA |
   | `GOOGLE_ROUTES_API_KEY` | No | Rutas en el mapa |

   Generar secretos JWT:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Levantar los servicios**

   Desde la raíz del proyecto:

   ```bash
   docker compose up --build
   ```

4. **Abrir la aplicación**

   - Frontend: [http://localhost:4200](http://localhost:4200)
   - Backend API: [http://localhost:3000](http://localhost:3000)
   - pgAdmin *(opcional)*: [http://localhost:5050](http://localhost:5050)

### Datos de demo

El backend incluye scripts de seed para poblar usuarios y eventos de prueba:

```bash
cd apps/backend
npm run seed:ugr-c-z
npm run seed:events-ugr-c-z
```

---

## Configuración de APIs externas

- **Google Routes API** — [Guía de configuración](docs/google-routes-setup.md)
- **Google Gemini** — Clave en [Google AI Studio](https://aistudio.google.com/apikey) → `GEMINI_API_KEY` en `.env`

Las claves **nunca** van en el frontend; solo en `apps/backend/.env` (excluido de git).

---

## Estado del proyecto

| | |
|---|---|
| Aplicación funcional | Mapa, eventos, amistades, notificaciones, admin, asistente IA |
| Memoria académica | En redacción ([`memoria/`](memoria/)) |
| Demo pública | No desplegada; ejecución local con Docker |

---

## Autor

**Juan Pablo Escudero Ramírez**

- Titulación: Grado en Ingeniería Informática
- Centro: ETSIIT — Universidad de Granada
- Tutor: Ángel Ruiz Zafra
- Curso académico: 2025–2026

---

## Licencia

Proyecto académico desarrollado como Trabajo Fin de Grado. Consultar con el autor antes de reutilizar el código con fines no académicos.
