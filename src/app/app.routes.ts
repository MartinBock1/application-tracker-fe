import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Registration } from './auth/registration/registration';
import { ApplicationForm } from './application/application-form/application-form';
import { ApplicationList } from './application/application-list/application-list';
import { CompanyFormComponent } from './company/company';
import { authGuard } from './auth/auth-guard';
import { Imprint } from './shared/imprint/imprint';
import { LegalNotice } from './shared/legal-notice/legal-notice';

/**
 * Application routing configuration.
 * 
 * Defines all routes for the Job Application Tracker application, including
 * public routes for authentication and protected routes for application management.
 * Uses Angular's functional route guards for authentication protection.
 * 
 * @remarks
 * The routing structure is organized as follows:
 * - **Public routes**: Login and registration (no authentication required)
 * - **Protected routes**: All application and company management features (authentication required)
 * - **Fallback routes**: Default redirect and wildcard for invalid URLs
 * 
 * Authentication is enforced using the `authGuard` which redirects unauthenticated
 * users to the login page.
 * 
 * @example
 * ```typescript
 * // Register routes in main.ts or app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideRouter(routes),
 *     // ... other providers
 *   ]
 * };
 * ```
 * 
 * @see {@link authGuard} - Functional guard for route protection
 */
export const routes: Routes = [
  // ============================================================================
  // PUBLIC ROUTES - No authentication required
  // ============================================================================
  
  /** 
   * User login route.
   * Allows users to authenticate with username/email and password.
   */
  { 
    path: 'login', 
    component: Login, 
    title: 'Login' 
  },
  
  /** 
   * User registration route.
   * Allows new users to create an account.
   */
  { 
    path: 'register', 
    component: Registration, 
    title: 'Registrierung' 
  },
  { path: 'imprint', component: Imprint },
  { path: 'legal-notice', component: LegalNotice },

  // ============================================================================
  // PROTECTED ROUTES - Authentication required via authGuard
  // ============================================================================
  
  /** 
   * Applications list route.
   * Displays all job applications in a Kanban-style board layout.
   * Protected route requiring authentication.
   */
  { 
    path: 'applications', 
    component: ApplicationList, 
    title: 'Meine Bewerbungen',
    canActivate: [authGuard] // Apply authentication guard
  },
  
  /** 
   * Create new application route.
   * Provides form for creating a new job application.
   * Protected route requiring authentication.
   */
  { 
    path: 'applications/new', 
    component: ApplicationForm, 
    title: 'Neue Bewerbung',
    canActivate: [authGuard] // Apply authentication guard
  },
  
  /** 
   * Edit existing application route.
   * Allows editing of an existing job application identified by ID parameter.
   * The :id parameter is passed to the component for loading specific application data.
   * Protected route requiring authentication.
   * 
   * @param id - URL parameter containing the application ID to edit
   */
  { 
    path: 'applications/edit/:id', // :id is a placeholder for the application ID
    component: ApplicationForm, 
    title: 'Bewerbung bearbeiten',
    canActivate: [authGuard] // Apply authentication guard
  },
  
  /** 
   * Create new company route.
   * Provides form for creating a new company with optional contact person.
   * Protected route requiring authentication.
   */
  {
    path: 'companies/new',
    component: CompanyFormComponent,
    title: 'Neue Firma anlegen',
    canActivate: [authGuard] // Apply authentication guard
  },
  
  // ============================================================================
  // FALLBACK AND REDIRECT ROUTES
  // ============================================================================
  
  /** 
   * Default route redirect.
   * Redirects users accessing the root URL to the applications list.
   * Uses 'full' path matching to ensure exact match of empty path.
   */
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  
  /** 
   * Wildcard route for invalid URLs.
   * Catches all undefined routes and redirects to login page.
   * This should always be the last route in the configuration.
   */
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];
