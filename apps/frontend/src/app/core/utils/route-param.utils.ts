import { ActivatedRouteSnapshot } from '@angular/router';

export function routeParamFromPath(
  route: ActivatedRouteSnapshot,
  paramName: string,
): string | null {
  for (const snapshot of route.pathFromRoot) {
    const value = snapshot.paramMap.get(paramName);
    if (value != null) {
      return value;
    }
  }

  return null;
}

export function requiredRouteParamFromPath(
  route: ActivatedRouteSnapshot,
  paramName: string,
): string {
  const value = routeParamFromPath(route, paramName);
  if (value == null) {
    throw new Error(`No se pudo resolver el parámetro de ruta "${paramName}".`);
  }

  return value;
}
