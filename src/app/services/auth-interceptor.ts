import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Api } from './api'; // Adjust path if necessary

/**
 * HTTP interceptor function for automatically adding authentication tokens to API requests.
 * 
 * This interceptor automatically attaches the authentication token to all outgoing HTTP requests
 * that target the application's API endpoints. It uses Angular's functional interceptor pattern
 * and integrates with the Api service for token management.
 * 
 * @param req - The outgoing HTTP request
 * @param next - The next handler in the interceptor chain
 * @returns Observable of the HTTP response, either with or without authentication headers
 * 
 * @example
 * ```typescript
 * // Register in app.config.ts or main.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptors([authInterceptor])),
 *     // ... other providers
 *   ]
 * };
 * ```
 * 
 * @remarks
 * The interceptor performs the following logic:
 * 1. Retrieves the current authentication token from the API service
 * 2. Checks if the request is targeting the application's API endpoints (/api)
 * 3. If authenticated and targeting API: clones request with Authorization header
 * 4. If not authenticated or external URL: passes request unchanged
 * 
 * Authentication scheme used: "Token" (Django REST Framework TokenAuthentication)
 * For JWT authentication, this would typically be "Bearer" instead.
 * 
 * @see {@link Api.getToken} - Used to retrieve the current authentication token
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inject the API service to access token management methods
  const apiService = inject(Api);
  
  // Retrieve the current authentication token from storage
  const authToken = apiService.getToken();

  // Check if the request targets our API endpoints and a token is available
  if (authToken && req.url.startsWith('/api')) {
    // Clone the request since HTTP requests are immutable
    // Add the Authorization header with the Token authentication scheme
    const authReq = req.clone({
      setHeaders: {
        // Using 'Token' scheme for Django REST Framework's TokenAuthentication
        // For JWT authentication, this would typically be 'Bearer ' + token
        Authorization: `Token ${authToken}`
      }
    });
    
    // Forward the modified request with authentication header
    return next(authReq);
  }

  // For requests without token (e.g., login/register endpoints) or to external URLs,
  // forward the original request unchanged
  return next(req);
};
