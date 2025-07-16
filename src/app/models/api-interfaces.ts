// Definiert die möglichen Status einer Bewerbung, basierend auf den STATUS_CHOICES im Django-Model.
// Dies sorgt für Typsicherheit und Autovervollständigung in deinem Code.
export type ApplicationStatus = 'DRAFT' | 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

// --- Authentifizierung ---

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

// --- Haupt-Datenmodelle basierend auf deinen Django-Models ---

export interface Company {
  id: number;
  name: string;
  website: string | null; // Kann laut Model leer sein
  industry: string;
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  company: number; // Beim Senden ist dies die ID des Unternehmens
}

export interface Note {
  id: number;
  text: string;
  created_at: string; // Datum/Zeit wird als ISO-String geliefert
}

// Dies ist die Haupt-Schnittstelle für eine Bewerbung.
// Sie spiegelt den `ApplicationSerializer` wider, der verschachtelte Objekte enthält.
export interface Application {
  id: number;
  job_title: string;
  
  // Beim Lesen der Daten bekommen wir das volle Company-Objekt
  company: Company; 
  
  // Kontakt kann optional sein
  contact: Contact | null; 

  status: ApplicationStatus;
  status_display: string; // Z.B. "Beworben" statt "APPLIED"

  
  // Datumsfelder kommen als String vom Backend
  applied_on: string | null;
  interview_on: string | null;
  offer_on: string | null;
  rejected_on: string | null;
  follow_up_on: string | null;

  job_posting_link: string;
  salary_expectation: number | null;
  
  created_at: string;
  
  // Die Notizen sind als Array direkt in der Bewerbung enthalten
  notes: Note[];
}

// --- Schnittstellen für das Erstellen/Aktualisieren von Daten (write-only) ---

// Payload zum Erstellen einer Firma
export interface CreateCompanyPayload {
  name: string;
  website?: string | null;
  industry: string;
}

//Payload zum Erstellen eines Kontakts
export interface CreateContactPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  company_id: number;  // Hier wird die ID der Firma übergeben
}

// Beim Erstellen einer Bewerbung senden wir nur die IDs, keine ganzen Objekte.
export interface CreateApplicationPayload {
  job_title: string;
  company_id: number;
  contact_id?: number | null; // Optional
  status: ApplicationStatus;
  applied_on?: string | null;
  interview_on?: string | null;
  offer_on?: string | null;
  rejected_on?: string | null;
  follow_up_on?: string | null;
  job_posting_link?: string;
  salary_expectation?: number | null;
  notes?: { id?: number; text: string }[];
}

export interface CreateNotePayload {
  application: number; // Die ID der Bewerbung, zu der die Notiz gehört
  text: string;
}
