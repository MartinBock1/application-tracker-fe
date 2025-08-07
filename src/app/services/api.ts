import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Application,
  AuthResponse,
  Company,
  Contact,
  CreateApplicationPayload,
  CreateCompanyPayload,
  CreateContactPayload,
} from '../models/api-interfaces';

/**
 * Service for handling all API communications with the backend.
 *
 * This service provides methods for authentication, CRUD operations on applications,
 * companies, and contacts, as well as token management for secure API access.
 * All authenticated requests automatically include the authorization header.
 *
 * @example
 * ```typescript
 * // Inject the service
 * private api = inject(Api);
 *
 * // Use API methods
 * this.api.getApplications().subscribe(apps => console.log(apps));
 * ```
 *
 * @remarks
 * This service uses Angular's HttpClient for HTTP communications and localStorage
 * for token persistence. All methods return Observables for reactive programming.
 */
@Injectable({
  providedIn: 'root',
})
export class Api {
  // Dependency injection using Angular's inject function
  private http = inject(HttpClient);

  /** Base URL for all API endpoints */
  private readonly apiUrl = '/api';

  // --- AUTHENTICATION METHODS ---

  /**
   * Registers a new user account.
   *
   * @param userData - User registration data including username, email, and password
   * @returns Observable containing authentication response with token and user info
   *
   * @example
   * ```typescript
   * const userData = { username: 'john', email: 'john@example.com', password: 'secret123' };
   * this.api.register(userData).subscribe(response => {
   *   console.log('User registered:', response.user);
   *   this.api.saveToken(response.token);
   * });
   * ```
   */
  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/registration/`,
      userData
    );
  }

  /**
   * Authenticates user with credentials.
   *
   * @param credentials - Login credentials containing username/email and password
   * @returns Observable containing authentication response with token and user info
   *
   * @example
   * ```typescript
   * const credentials = { username: 'john', password: 'secret123' };
   * this.api.login(credentials).subscribe(response => {
   *   this.api.saveToken(response.token);
   *   this.router.navigate(['/applications']);
   * });
   * ```
   */
  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/login/`,
      credentials
    );
  }

  // --- TOKEN MANAGEMENT & STATUS ---

  /**
   * Saves authentication token to localStorage.
   *
   * @param token - JWT authentication token from login/registration
   *
   * @example
   * ```typescript
   * // Save token after successful login
   * this.api.saveToken(response.token);
   * ```
   */
  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  /**
   * Retrieves stored authentication token.
   *
   * @returns Authentication token string or null if not found
   *
   * @example
   * ```typescript
   * const token = this.api.getToken();
   * if (token) {
   *   // User is authenticated
   * }
   * ```
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Logs out the current user by removing the authentication token.
   *
   * @example
   * ```typescript
   * // Logout and redirect to login page
   * this.api.logout();
   * this.router.navigate(['/login']);
   * ```
   */
  logout(): void {
    // Simply remove the token from storage
    localStorage.removeItem('authToken');
  }

  /**
   * Checks if user is currently logged in.
   *
   * @returns True if authentication token exists, false otherwise
   *
   * @example
   * ```typescript
   * if (this.api.isLoggedIn()) {
   *   // Show authenticated content
   * } else {
   *   // Redirect to login
   * }
   * ```
   */
  isLoggedIn(): boolean {
    // User is considered logged in if a token exists
    return this.getToken() !== null;
  }

  // --- COMPANIES CRUD OPERATIONS ---

  /**
   * Fetches all companies available to the authenticated user.
   *
   * @returns Observable array of Company objects
   *
   * @example
   * ```typescript
   * this.api.getCompanies().subscribe(companies => {
   *   this.companiesList = companies;
   * });
   * ```
   */
  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/companies/`);
  }

  /**
   * Creates a new company.
   *
   * @param companyData - Company data payload with name, industry, and optional website
   * @returns Observable containing the newly created Company object
   *
   * @throws Will throw HTTP error if creation fails or user is unauthorized
   *
   * @example
   * ```typescript
   * const companyData = { name: 'Tech Corp', industry: 'Technology', website: 'https://techcorp.com' };
   * this.api.createCompany(companyData).subscribe(newCompany => {
   *   console.log('Company created:', newCompany.id);
   * });
   * ```
   */
  createCompany(companyData: CreateCompanyPayload): Observable<Company> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.post<Company>(`${this.apiUrl}/companies/`, companyData, {
      headers,
    });
  }

  // --- CONTACTS CRUD OPERATIONS ---

  /**
   * Creates a new contact person associated with a company.
   *
   * @param contactData - Contact data payload with personal info and company_id
   * @returns Observable containing the newly created Contact object
   *
   * @throws Will throw HTTP error if creation fails or user is unauthorized
   *
   * @example
   * ```typescript
   * const contactData = {
   *   first_name: 'John',
   *   last_name: 'Doe',
   *   email: 'john@company.com',
   *   company_id: 123
   * };
   * this.api.createContact(contactData).subscribe(newContact => {
   *   console.log('Contact created:', newContact.id);
   * });
   * ```
   */
  createContact(contactData: CreateContactPayload): Observable<Contact> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.post<Contact>(`${this.apiUrl}/contacts/`, contactData, {
      headers,
    });
  }

  // --- APPLICATIONS CRUD OPERATIONS ---

  /**
   * Creates a new job application.
   *
   * @param applicationData - Application data payload with job details and status
   * @returns Observable containing the newly created Application object
   *
   * @throws Will throw HTTP error if creation fails or user is unauthorized
   *
   * @example
   * ```typescript
   * const applicationData = {
   *   job_title: 'Frontend Developer',
   *   company_id: 123,
   *   status: 'APPLIED'
   * };
   * this.api.createApplication(applicationData).subscribe(newApp => {
   *   console.log('Application created:', newApp.id);
   * });
   * ```
   */
  createApplication(
    applicationData: CreateApplicationPayload
  ): Observable<Application> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.post<Application>(
      `${this.apiUrl}/applications/`,
      applicationData,
      { headers }
    );
  }

  /**
   * Fetches all job applications for the authenticated user.
   *
   * @returns Observable array of Application objects with related company and notes data
   *
   * @throws Will throw HTTP error if user is unauthorized
   *
   * @example
   * ```typescript
   * this.api.getApplications().subscribe(applications => {
   *   this.applicationsList = applications;
   *   this.groupApplicationsByStatus();
   * });
   * ```
   */
  getApplications(): Observable<Application[]> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    // Important: The endpoint for the list has no ID at the end
    return this.http.get<Application[]>(`${this.apiUrl}/applications/`, {
      headers,
    });
  }

  /**
   * Fetches a single job application by its ID.
   *
   * @param id - Unique identifier of the application to retrieve
   * @returns Observable containing the Application object with full details
   *
   * @throws Will throw HTTP error if application not found or user unauthorized
   *
   * @example
   * ```typescript
   * this.api.getApplicationById('123').subscribe(application => {
   *   this.populateEditForm(application);
   * });
   * ```
   */
  getApplicationById(id: string): Observable<Application> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.get<Application>(`${this.apiUrl}/applications/${id}/`, {
      headers,
    });
  }

  /**
   * Updates an existing job application.
   *
   * @param id - Unique identifier of the application to update
   * @param applicationData - Updated application data payload
   * @returns Observable containing the updated Application object
   *
   * @throws Will throw HTTP error if application not found or user unauthorized
   *
   * @example
   * ```typescript
   * const updatedData = { status: 'INTERVIEW', interview_on: '2024-01-15' };
   * this.api.updateApplication('123', updatedData).subscribe(updatedApp => {
   *   console.log('Application updated:', updatedApp.status);
   * });
   * ```
   */
  updateApplication(
    id: string,
    applicationData: CreateApplicationPayload
  ): Observable<Application> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    // The internal logic of the method is correct and remains the same
    return this.http.put<Application>(
      `${this.apiUrl}/applications/${id}/`,
      applicationData,
      { headers }
    );
  }  
}
