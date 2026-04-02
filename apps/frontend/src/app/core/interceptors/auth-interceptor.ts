import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Authentication Interceptor.
 * Attaches credentials (like HttpOnly cookies) to every outgoing HTTP request
 * so the backend can validate the user's session securely.
 * @param req - The outgoing HTTP request.
 * @param next - The next interceptor or backend handler in the chain.
 * @returns An observable of the HTTP event stream.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  // Clone the request to append the flag that allows the browser send cookies.
  const reqWithCookies = req.clone({
    withCredentials: true 
  });

  return next(reqWithCookies);
};
