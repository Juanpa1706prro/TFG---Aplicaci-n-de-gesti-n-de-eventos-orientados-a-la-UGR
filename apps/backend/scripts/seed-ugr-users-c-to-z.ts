/**
 * Crea usuarios @ugr.es con letra c..z (c@ugr.es … z@ugr.es).
 * Cada uno es estudiante + profesor, datos personales aleatorios, contraseña Caca42.
 *
 * Uso (desde apps/backend, con la BD accesible):
 *   npm run seed:ugr-c-z
 *
 * Fuera de Docker (Postgres en localhost:5433):
 *   $env:DB_HOST="localhost"; $env:DB_PORT="5433"; npm run seed:ugr-c-z
 *
 * Dentro del contenedor ugr_backend:
 *   npm run seed:ugr-c-z
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/user/user.service';
import { CompleteOnboardingDto } from '../src/modules/user/dto/complete-onboarding.dto';
import {
  StaffFunction,
  UserCampus,
  UserDegree,
  UserFaculty,
  UserGender,
} from '../src/modules/user/user-enums';

const PASSWORD = 'Caca42';

const FIRST_NAMES = [
  'Ana',
  'Carlos',
  'Elena',
  'Hugo',
  'Irene',
  'Javier',
  'Laura',
  'Marcos',
  'Nuria',
  'Pablo',
  'Raquel',
  'Sergio',
  'Teresa',
  'Víctor',
  'Yolanda',
  'Álvaro',
  'Beatriz',
  'Daniel',
  'Lucía',
  'Miguel',
];

const LAST_NAMES = [
  'García',
  'Martínez',
  'López',
  'Sánchez',
  'Pérez',
  'González',
  'Rodríguez',
  'Fernández',
  'Díaz',
  'Ruiz',
  'Torres',
  'Ramírez',
  'Flores',
  'Castro',
  'Ortega',
  'Vega',
  'Molina',
  'Navarro',
  'Romero',
  'Iglesias',
];

const DEPARTMENTS = [
  'Departamento de Arquitectura y Tecnología de Computadores',
  'Departamento de Lenguajes y Sistemas Informáticos',
  'Departamento de Ciencias de la Computación e Inteligencia Artificial',
  'Departamento de Matemáticas',
  'Departamento de Física Aplicada',
  'Instituto de Astrofísica de Andalucía',
  'Departamento de Economía Aplicada',
  'Departamento de Filología Hispánica',
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomBirthDate(): string {
  const year = 1988 + Math.floor(Math.random() * 18);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function randomPhone(): string {
  const n = () => Math.floor(Math.random() * 10);
  return `+34 6${n()}${n()} ${n()}${n()}${n()} ${n()}${n()}${n()}`;
}

function buildOnboardingDto(): CompleteOnboardingDto {
  return {
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    gender: pick(Object.values(UserGender)),
    birthDate: randomBirthDate(),
    phoneNumber: randomPhone(),
    staffFunctions: [StaffFunction.ESTUDIANTE, StaffFunction.PROFESOR],
    faculty: pick(Object.values(UserFaculty)),
    campus: pick(Object.values(UserCampus)),
    degree: pick(Object.values(UserDegree)),
    department: pick(DEPARTMENTS),
  };
}

function emailsFromCToZ(): string[] {
  const emails: string[] = [];
  for (let code = 'C'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
    const letter = String.fromCharCode(code).toLowerCase();
    emails.push(`${letter}@ugr.es`);
  }
  return emails;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);

  const emails = emailsFromCToZ();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Semilla: ${emails.length} cuentas @ugr.es (c..z), contraseña "${PASSWORD}"`);

  for (const email of emails) {
    try {
      const existing = await usersService.findByEmail(email);
      if (existing) {
        if (!usersService.computeProfileComplete(existing)) {
          await usersService.completeOnboarding(existing.id, buildOnboardingDto());
          console.log(`  ~ ${email} ya existía; onboarding completado`);
        } else {
          console.log(`  · ${email} ya existía (perfil completo)`);
        }
        skipped++;
        continue;
      }

      const user = await authService.register(email, PASSWORD);
      await usersService.completeOnboarding(user.id, buildOnboardingDto());
      console.log(`  + ${email} creado (#${user.profile?.userNumber ?? '?'})`);
      created++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ! ${email} error: ${msg}`);
    }
  }

  console.log(`\nListo: ${created} creados, ${skipped} omitidos/actualizados, ${failed} errores.`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
