/**
 * 10 usuarios @ugr.es (c..l) crean un evento público aleatorio cada uno.
 * Activa perfil PROFESOR en sesión antes de crear (necesario si tienen varias funciones).
 *
 *   npm run seed:events-ugr-c-z
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EventsService } from '../src/modules/events/events.service';
import { UsersService } from '../src/modules/user/user.service';
import { CreateEventDto } from '../src/modules/events/dto/create-event.dto';
import { EventVisibility } from '../src/modules/events/event-visibility.enum';
import { StaffFunction } from '../src/modules/user/user-enums';

/** Primeras 10 letras c..l de la semilla de usuarios. */
const CREATOR_EMAILS = [
  'c@ugr.es',
  'd@ugr.es',
  'e@ugr.es',
  'f@ugr.es',
  'g@ugr.es',
  'h@ugr.es',
  'i@ugr.es',
  'j@ugr.es',
  'k@ugr.es',
  'l@ugr.es',
];

const TITLES = [
  'Taller de programación en Python',
  'Seminario de inteligencia artificial',
  'Charla sobre emprendimiento universitario',
  'Mesa redonda: investigación y sociedad',
  'Workshop de bases de datos',
  'Sesión de orientación académica',
  'Encuentro de networking UGR',
  'Demostración de proyectos fin de grado',
  'Café científico: ciencia de datos',
  'Jornada de puertas abiertas del departamento',
  'Clínica de consultas de estadística',
  'Presentación de líneas de investigación',
];

const DESCRIPTIONS = [
  'Sesión abierta a la comunidad universitaria. Plazas limitadas; confirma asistencia en la app.',
  'Actividad formativa organizada por el departamento. Se recomienda llegar con antelación.',
  'Evento presencial en el campus. Habrá turno de preguntas al final.',
  'Encuentro informal para compartir experiencias y contactos entre estudiantes y profesorado.',
  'Taller práctico con ejemplos reales. Trae portátil si quieres seguir los ejercicios.',
];

const LOCATIONS: { label: string; lat: number; lng: number }[] = [
  { label: 'ETSIIT — Aula magna, UGR', lat: 37.197, lng: -3.6245 },
  { label: 'Facultad de Ciencias — Salón de actos', lat: 37.188, lng: -3.606 },
  { label: 'Campus Cartuja — Edificio A', lat: 37.193, lng: -3.534 },
  { label: 'Facultad de Derecho — Sala de conferencias', lat: 37.183, lng: -3.602 },
  { label: 'PTS — Biblioteca central', lat: 37.165, lng: -3.589 },
  { label: 'Facultad de Medicina — Aulario', lat: 37.192, lng: -3.615 },
  { label: 'ETSA — Estudio de arquitectura', lat: 37.201, lng: -3.618 },
  { label: 'FCEE — Aula 12', lat: 37.186, lng: -3.608 },
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function jitterCoord(value: number, spread: number): number {
  return value + (Math.random() - 0.5) * spread;
}

function buildRandomEventDto(): CreateEventDto {
  const place = pick(LOCATIONS);
  const start = new Date();
  start.setDate(start.getDate() + randomInt(3, 45));
  start.setHours(randomInt(9, 18), randomInt(0, 3) * 15, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + randomInt(1, 3));

  const unlimited = Math.random() < 0.35;

  return {
    title: pick(TITLES),
    description: pick(DESCRIPTIONS),
    location: place.label,
    latitude: jitterCoord(place.lat, 0.008),
    longitude: jitterCoord(place.lng, 0.008),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    visibility: EventVisibility.PUBLIC,
    maxAttendees: unlimited ? null : randomInt(15, 120),
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const usersService = app.get(UsersService);
  const eventsService = app.get(EventsService);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Semilla eventos: ${CREATOR_EMAILS.length} creadores`);

  for (const email of CREATOR_EMAILS) {
    try {
      const user = await usersService.findByEmail(email);
      if (!user) {
        console.log(`  · ${email} no existe — ejecuta antes npm run seed:ugr-c-z`);
        skipped++;
        continue;
      }

      await usersService.setSessionPersona(user.id, StaffFunction.PROFESOR);

      const dto = buildRandomEventDto();
      const result = await eventsService.create(user.id, dto);
      console.log(
        `  + ${email} → evento #${result.event.id}: "${result.event.title}" (${dto.startsAt.slice(0, 10)})`,
      );
      created++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ! ${email} error: ${msg}`);
    }
  }

  console.log(`\nListo: ${created} eventos, ${skipped} omitidos, ${failed} errores.`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
