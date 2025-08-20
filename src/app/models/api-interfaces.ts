/**
 * Defines the possible statuses of a job application, based on the STATUS_CHOICES in the Django model.
 * This ensures type safety and autocompletion in the code.
 */
export type ApplicationStatus = 'DRAFT' | 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

// --- Authentifizierung ---
/**
 * Describes the structure of the response object received after a successful authentication (login/registration).
 */
export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

// --- Main Data Models (based on Django Models) ---
/**
 * Represents a company record.
 */
export interface Company {
  id: number;
  name: string;
  website: string | null;
  industry: string;
}

/**
 * Represents a contact person at a company.
 * @remarks The `email`, `phone`, and `position` fields are defined as required strings here,
 * but might be optional (empty string) from the backend based on `blank=True` in the Django model.
 */
export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  company: number;
}

/**
 * Represents a single note associated with an application.
 */
export interface Note {
  id: number;
  text: string;
  created_at: string;
}

/**
 * The main interface for a job application.
 * It mirrors the `ApplicationSerializer` from the backend, including nested objects.
 */
export interface Application {
  id: number;
  job_title: string;
  company: Company;   
  contact: Contact | null; 
  status: ApplicationStatus;
  status_display: string;

  
  /** Date fields are delivered as strings from the backend. */
  applied_on: string | null;
  interview_on: string | null;
  offer_on: string | null;
  rejected_on: string | null;
  follow_up_on: string | null;
  job_posting_link: string;
  salary_expectation: number | null;  
  created_at: string;  
  /** An array of notes is included directly within the application object. */
  notes: Note[];
}

// --- Interfaces for Creating/Updating Data (Write-only Payloads) ---
/**
 * Defines the payload for creating a new company.
 */
export interface CreateCompanyPayload {
  name: string;
  website?: string | null;
  industry: string;
}

/**
 * Defines the payload for creating a new contact.
 */
export interface CreateContactPayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  company_id: number;  // Hier wird die ID der Firma übergeben
}

/**
 * Defines the payload for creating or updating an application.
 * When sending data, we use IDs instead of nested objects.
 */
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
  /** 
   * An optional array of notes to be updated.
   * Used for updating existing notes, each object can have an ID.
   */
  notes?: { id?: number; text: string }[];
}

/**
 * Defines the payload for creating a new note.
 */
export interface CreateNotePayload {
  application: number;
  text: string;
}
