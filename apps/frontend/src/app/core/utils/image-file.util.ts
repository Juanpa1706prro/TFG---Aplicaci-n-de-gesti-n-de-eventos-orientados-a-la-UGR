export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return 'Formato no permitido. Usa JPEG, PNG o WebP.';
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return 'La imagen supera el tamaño máximo (2 MB).';
  }
  return null;
}

export function imageFormData(file: File): FormData {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}
