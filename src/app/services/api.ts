import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Application,
  AuthResponse,
  Company,
  Contact,
  // Note,
  CreateApplicationPayload,
  // CreateNotePayload,
  CreateCompanyPayload,
  CreateContactPayload,
} from '../models/api-interfaces';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  private apiUrl = '/api'; // Basis-URL für alle API-Aufrufe

  // --- Authentifizierung ---
  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/registration/`,
      userData
    );
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/login/`,
      credentials
    );
  }

  // --- Token-Management & Status ---
  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // NEU: Die Logout-Methode
  logout(): void {
    // Einfach den Token aus dem Speicher entfernen
    localStorage.removeItem('authToken');
  }

  // NEU: Eine Hilfsmethode, um den Login-Status zu prüfen
  isLoggedIn(): boolean {
    // Ein Benutzer gilt als eingeloggt, wenn ein Token vorhanden ist.
    return this.getToken() !== null;
  }

  // --- Companies ---
  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/companies/`);
  }

  createCompany(companyData: CreateCompanyPayload): Observable<Company> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.post<Company>(`${this.apiUrl}/companies/`, companyData, {
      headers,
    });
  }

  // --- Contacts ---
  // NEU: Methode zum Erstellen eines Kontakts
  createContact(contactData: CreateContactPayload): Observable<Contact> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.post<Contact>(`${this.apiUrl}/contacts/`, contactData, {
      headers,
    });
  }

  // --- Notes ---
  // NEUE METHODE: Erstellt eine neue Notiz.
  // createNote(payload: CreateNotePayload): Observable<Note> {
  //   const headers = new HttpHeaders({
  //     'Authorization': `Token ${this.getToken()}`
  //   });
  //   // POST-Anfrage an den /notes/ Endpunkt deines Backends
  //   return this.http.post<Note>(`${this.apiUrl}/notes/`, payload, { headers });
  // }

  // --- Applications ---
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

  getApplications(): Observable<Application[]> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    // Wichtig: Der Endpunkt für die Liste hat keine ID am Ende
    return this.http.get<Application[]>(`${this.apiUrl}/applications/`, {
      headers,
    });
  }

  // NEU: Methode, um EINE Bewerbung anhand ihrer ID zu holen
  getApplicationById(id: string): Observable<Application> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    return this.http.get<Application>(`${this.apiUrl}/applications/${id}/`, {
      headers,
    });
  }

  // NEU: Methode, um eine bestehende Bewerbung zu aktualisieren
  updateApplication(
    id: string,
    applicationData: CreateApplicationPayload
  ): Observable<Application> {
    const headers = new HttpHeaders({
      Authorization: `Token ${this.getToken()}`,
    });
    // Die interne Logik der Methode ist korrekt und bleibt gleich.
    return this.http.put<Application>(
      `${this.apiUrl}/applications/${id}/`,
      applicationData,
      { headers }
    );
  }
}
