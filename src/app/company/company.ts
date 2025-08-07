import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs';
import { Api } from '../services/api';
import {
  CreateCompanyPayload,
  CreateContactPayload,
} from '../models/api-interfaces';
import { NotificationService } from '../services/notification';

/**
 * Component for creating new companies with optional contact persons.
 *
 * This component provides a reactive form that allows users to create a company
 * and optionally add a contact person. It handles validation, API calls,
 * and provides user feedback through notifications.
 *
 * @example
 * ```html
 * <app-company-form></app-company-form>
 * ```
 *
 * @remarks
 * The component supports two creation scenarios:
 * 1. Company only - when contact fields are empty
 * 2. Company with contact - when contact name fields are provided
 */
@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company.html',
  styleUrls: ['./company.scss'],
})
export class CompanyFormComponent {
  // Dependency injection using Angular's inject function
  private fb = inject(FormBuilder);
  private api = inject(Api);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  /**
   * Reactive form for company and contact data.
   *
   * The form is structured with two nested form groups:
   * - company: Contains required company information (name, industry) and optional website
   * - contact: Contains optional contact person details with email validation
   *
   * @remarks
   * Form validation rules:
   * - Company name and industry are required
   * - Contact email must be valid format if provided
   * - Contact creation requires both first_name and last_name
   */
  form: FormGroup = this.fb.group({
    company: this.fb.group({
      name: ['', Validators.required],
      industry: ['', Validators.required],
      website: [''],
    }),
    contact: this.fb.group({
      first_name: [''],
      last_name: [''],
      email: ['', [Validators.email]],
      position: [''],
      phone: [''],
    }),
  });

  /**
   * Handles form submission for creating company and optional contact.
   *
   * This method validates the form, determines whether to create a contact person,
   * and executes the appropriate API calls. It uses RxJS operators for chaining
   * dependent API calls when both company and contact need to be created.
   *
   * @remarks
   * The submission process follows these steps:
   * 1. Validates form data and shows validation errors if invalid
   * 2. Extracts company and contact data from form
   * 3. Determines if contact should be created (requires first and last name)
   * 4. Executes API calls:
   *    - Company only: Single createCompany call
   *    - Company with contact: createCompany followed by createContact using switchMap
   * 5. Handles success/error cases with notifications and navigation
   *
   * @throws Will display error notification if API calls fail
   *
   * @example
   * ```typescript
   * // Called when user submits the form
   * submit(); // Validates and creates company/contact
   * ```
   */
  submit() {
    // Validate form before submission
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showWarning(
        'Bitte füllen Sie alle Pflichtfelder korrekt aus.',
        'Ungültige Eingabe'
      );
      return;
    }

    // Extract form data for API payloads
    const companyPayload: CreateCompanyPayload =
      this.form.get('company')?.value;
    const contactData = this.form.get('contact')?.value;

    // Check if contact data should be created (requires first and last name)
    // The backend requires these fields for contact creation
    const shouldCreateContact = contactData.first_name && contactData.last_name;

    if (shouldCreateContact) {
      /**
       * SCENARIO 1: Create company AND contact
       *
       * Uses RxJS magic:
       * 1. First create the company
       * 2. Use switchMap to wait for response and use the new company ID
       *    to create the contact
       */
      this.api
        .createCompany(companyPayload)
        .pipe(
          switchMap((newCompany) => {
            // Prepare contact payload with the newly created company ID
            const contactPayload: CreateContactPayload = {
              ...contactData,
              company_id: newCompany.id,
            };
            return this.api.createContact(contactPayload);
          })
        )
        .subscribe({
          next: (newContact) => {
            this.notificationService.showSuccess(
              `Kontakt für ${newContact.first_name} ${newContact.last_name} wurde erfolgreich angelegt.`,
              'Alles gespeichert!'
            );
            this.router.navigate(['/applications']);
          },
          error: (err) => {
            this.notificationService.showError(
              'Ein Fehler ist aufgetreten. Bitte prüfen Sie die Eingaben und Ihre Verbindung.',
              'Speichern fehlgeschlagen'
            );
            console.error('Error creating company/contact:', err);
          },
        });
    } else {
      /**
       * SCENARIO 2: Create company ONLY
       *
       * Simple single API call when no contact person is provided
       */
      this.api.createCompany(companyPayload).subscribe({
        next: (newCompany) => {
          this.notificationService.showSuccess(
            `Firma "${newCompany.name}" wurde erfolgreich angelegt.`,
            'Firma gespeichert!'
          );
          this.router.navigate(['/applications']);
        },
        error: (err) => {
          this.notificationService.showError(
            'Die Firma konnte nicht erstellt werden.',
            'Speichern fehlgeschlagen'
          );
          console.error('Error creating company:', err);
        },
      });
    }
  }
}
