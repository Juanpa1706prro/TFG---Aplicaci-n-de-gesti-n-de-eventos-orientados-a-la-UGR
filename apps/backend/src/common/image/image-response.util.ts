import { Response } from 'express';
import { AllowedImageMimeType } from './image.constants';

export function sendStoredImage(
  res: Response,
  payload: { data: Buffer; mimeType: AllowedImageMimeType },
): void {
  res.setHeader('Content-Type', payload.mimeType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(payload.data);
}
