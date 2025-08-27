import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  Application,
  AuthResponse,
  Company,
  Contact,
  CreateApplicationPayload,
  CreateCompanyPayload,
  CreateContactPayload,
} from '../models/api-interfaces';

/** A payload type for updating a company, where all fields are optional. */
type UpdateCompanyPayload = Partial<CreateCompanyPayload>;
/** A payload type for updating a contact, where all fields are optional. */
type UpdateContactPayload = Partial<Contact>;

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
  /** Injected HttpClient for making HTTP requests. */
  private http = inject(HttpClient);

  /** Base URL for all API endpoints */
  private readonly apiUrl = '/api';  // Use relative URL for development
  // private readonly apiUrl = 'https://server-tracker.martin-bock.info/api';  // Use absolute URL for production

  // --- AUTHENTICATION METHODS ---
  /** 
   * A private BehaviorSubject that holds the current login state.
   * @private
   */
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());

  /** 
   * A public observable that components can subscribe to for real-time updates on the login state.
   */
  isLoggedIn$ = this.loggedIn.asObservable();

  /**
   * Checks if an authentication token exists in localStorage.
   * @returns `true` if a token exists, `false` otherwise.
   * @private
   */
  private hasToken(): boolean {
    // Stellt sicher, dass das Ergebnis immer ein boolean ist (true/false)
    return !!localStorage.getItem('authToken');
  }

  /**
   * Registers a new user account.
   *
   * @param userData - User registration data including username, email, and password.
   * @returns An Observable containing the authentication response with a token and user info.
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
   * Authenticates a user with credentials.
   *
   * @param credentials - Login credentials containing username/email and password.
   * @returns An Observable containing the authentication response with a token and user info.
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
   * Saves the authentication token to localStorage and updates the login status.
   *
   * @param token - The JWT authentication token from login/registration.
   *
   * @example
   * ```typescript
   * // Save token after successful login
   * this.api.saveToken(response.token);
   * ```
   */
  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
    this.loggedIn.next(true);
  }

  /**
   * Retrieves the stored authentication token.
   *
   * @returns The authentication token string or `null` if not found.
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
   * // Logout and redirect to the login page
   * this.api.logout();
   * this.router.navigate(['/login']);
   * ```
   */
  logout(): void {
    // Simply remove the token from storage
    localStorage.removeItem('authToken');
    this.loggedIn.next(false);
  }

  /**
   * Checks if a user is currently logged in.
   *
   * @returns `true` if an authentication token exists, `false` otherwise.
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
   * @returns An Observable array of Company objects.
   *
   * @example
   * ```typescript
   * this.api.getCompanies().subscribe(companies => {
   *   this.companiesList = companies;
   * });
   * ```
   */
  getCompanies(): Observable<Company[]> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.get<Company[]>(`${this.apiUrl}/companies/`, {
      headers,
    });
  }

  /**
   * Creates a new company.
   *
   * @param companyData - The company data payload with name, industry, and optional website.
   * @returns An Observable containing the newly created Company object.
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

  /**
   * Updates an existing company with a partial payload.
   *
   * @param id - The ID of the company to update.
   * @param payload - An object containing the fields to update.
   * @returns An Observable containing the updated Company object.
   */
  updateCompany(id: number, payload: UpdateCompanyPayload): Observable<Company> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.patch<Company>(`${this.apiUrl}/companies/${id}/`, payload, {
      headers,
    });
  }

  // --- CONTACTS CRUD OPERATIONS ---
  /**
   * Creates a new contact person associated with a company.
   *
   * @param contactData - The contact data payload with personal info and `company_id`.
   * @returns An Observable containing the newly created Contact object.
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

  /**
   * Updates an existing contact with a partial payload.
   *
   * @param id - The ID of the contact to update.
   * @param payload - An object containing the fields to update.
   * @returns An Observable containing the updated Contact object.
   */
  updateContact(id: number, payload: UpdateContactPayload): Observable<Contact> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.patch<Contact>(`${this.apiUrl}/contacts/${id}/`, payload, {
      headers,
    });
  }

  /**
   * Fetches all contacts for a specific company.
   *
   * @param companyId - The ID of the company whose contacts are to be fetched.
   * @returns An Observable array of Contact objects.
   * @remarks This assumes the API supports filtering contacts via a `company_id` query parameter.
   */
  getContactsForCompany(companyId: number): Observable<Contact[]> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    // Annahme: Die API unterstützt das Filtern von Kontakten nach company_id
    return this.http.get<Contact[]>(`${this.apiUrl}/contacts/?company_id=${companyId}`, {
      headers,
    });
  }

  /**
   * Deletes a contact record by ID.
   *
   * @param id - The ID of the contact to delete.
   * @returns An Observable indicating completion of the deletion.
   */
  deleteContact(id: number): Observable<void> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.delete<void>(`${this.apiUrl}/contacts/${id}/`, { headers });
  }

  // --- APPLICATIONS CRUD OPERATIONS ---
  /**
   * Creates a new job application.
   *
   * @param applicationData - The application data payload with job details and status.
   * @returns An Observable containing the newly created Application object.
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
   * @returns An Observable array of Application objects with related company and notes data.
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
   * @param id - The unique identifier of the application to retrieve.
   * @returns An Observable containing the Application object with full details.
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
   * @param id - The unique identifier of the application to update.
   * @param applicationData - The updated application data payload.
   * @returns An Observable containing the updated Application object.
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
