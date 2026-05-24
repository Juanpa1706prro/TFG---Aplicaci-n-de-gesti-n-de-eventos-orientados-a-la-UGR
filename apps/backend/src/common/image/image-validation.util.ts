import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  AllowedImageMimeType,
  IMAGE_MAX_BYTES,
} from './image.constants';

export function hasStoredImage(
  data: Buffer | null | undefined,
): boolean {
  return data != null && data.length > 0;
}

export function normalizeImageMimeType(
  mime: string | undefined,
): AllowedImageMimeType {
  const normalized = mime?.trim().toLowerCase();
  if (
    normalized &&
    (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(normalized)
  ) {
    return normalized as AllowedImageMimeType;
  }
  throw new BadRequestException(
    'Formato de imagen no permitido. Usa JPEG, PNG o WebP.',
  );
}

export function validateImageBuffer(
  buffer: Buffer,
  mimeType: AllowedImageMimeType,
): void {
  if (!buffer?.length) {
    throw new BadRequestException('La imagen está vacía.');
  }
  if (buffer.length > IMAGE_MAX_BYTES) {
    throw new BadRequestException('La imagen supera el tamaño máximo (2 MB).');
  }

  if (mimeType === 'image/jpeg') {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      throw new BadRequestException('El archivo no es un JPEG válido.');
    }
    return;
  }

  if (mimeType === 'image/png') {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!sig.every((b, i) => buffer[i] === b)) {
      throw new BadRequestException('El archivo no es un PNG válido.');
    }
    return;
  }

  if (mimeType === 'image/webp') {
    const riff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const webp =
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    if (!riff || !webp) {
      throw new BadRequestException('El archivo no es un WebP válido.');
    }
  }
}

export function parseUploadedImage(
  buffer: Buffer | undefined,
  mimeType: string | undefined,
): { data: Buffer; mimeType: AllowedImageMimeType } {
  if (!buffer?.length) {
    throw new BadRequestException('No se recibió ningún archivo de imagen.');
  }
  const normalized = normalizeImageMimeType(mimeType);
  validateImageBuffer(buffer, normalized);
  return { data: buffer, mimeType: normalized };
}
