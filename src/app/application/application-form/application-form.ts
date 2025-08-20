import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  FormGroup,
} from '@angular/forms';

import { forkJoin, of, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification';
import {
  ApplicationStatus,
  Company,
  Contact,
  CreateApplicationPayload,
  CreateContactPayload,
} from '../../models/api-interfaces';

/**
 * A custom validator that ensures that if a contact is being created,
 * both the first name and last name fields are filled out, or neither are.
 * This prevents creating a contact with only partial name information.
 *
 * @param control - The form group to validate.
 * @returns A validation error object if validation fails, otherwise `null`.
 */
export const contactRequiredValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const firstName = control.get('first_name')?.value;
  const lastName = control.get('last_name')?.value;
  const isInvalid = (firstName && !lastName) || (!firstName && lastName);
  return isInvalid ? { contactIncomplete: true } : null;
};

/**
 * Component for creating and editing job applications.
 *
 * This component handles the logic for a comprehensive form that allows users to
 * create new applications or edit existing ones. It manages nested data for
 * companies, contacts, and notes, and includes robust state management to prevent
 * data leaks between different application views.
 */
@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
})
export class ApplicationForm implements OnInit {
  // --- DEPENDENCY INJECTION ---
  private fb = inject(FormBuilder);
  private apiService = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  // --- COMPONENT STATE ---
  companies: Company[] = [];
  currentApplicationId: string | null = null;
  isEditMode = false;
  currentContactId: number | null = null;

  /** 
   * The main reactive form group.
   * @remarks It is declared as definitely assigned (`!`) because it is initialized
   * immediately in `ngOnInit` via the `createForm` method.
   */
  applicationForm!: FormGroup;

  /**
   * Initializes the component by creating the form, fetching company data,
   * and checking route parameters to determine if it's in edit mode.
   */
  ngOnInit(): void {
    this.createForm();
    this.apiService.getCompanies().subscribe((data) => {
      this.companies = data;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.currentApplicationId = id;
      this.loadApplicationForEdit(id);
    }
  }

  /**
   * Creates and initializes the main reactive form.
   * This method encapsulates the form structure and is called to ensure a clean
   * form state, preventing data leaks between views.
   * @private
   */
  private createForm(): void {
    this.applicationForm = this.fb.group({
      job_title: ['', Validators.required],
      company_id: [{ value: null as number | null, disabled: this.isEditMode }, Validators.required],
      status: ['DRAFT' as ApplicationStatus | null, Validators.required],
      applied_on: [null as string | null],
      interview_on: [null as string | null],
      offer_on: [null as string | null],
      rejected_on: [null as string | null],
      follow_up_on: [null as string | null],
      notes: this.fb.array([]),
      details: this.fb.group({
        company: this.fb.group({
          name: ['', Validators.required],
          industry: ['', Validators.required],
          website: [''],
        }),
        contact: this.fb.group(
          { id: [null], first_name: [''], last_name: [''], email: ['', [Validators.email]], position: [''], phone: [''] },
          { validators: contactRequiredValidator }
        ),
      }),
    });
  }

  /**
   * A getter for convenient, type-safe access to the 'notes' FormArray.
   */
  get notes(): FormArray {
    return this.applicationForm.get('notes') as FormArray;
  }

  /**
   * Fetches the data for a specific application and populates the form.
   * This method uses a robust "destroy and recreate" pattern for the form
   * to guarantee a clean state and prevent "stale state" (ghost data) issues
   * when navigating between different application edit pages.
   * @param id - The ID of the application to load.
   */
  loadApplicationForEdit(id: string): void {
    // 1. Destroy the old form and create a clean new one.
    this.createForm();
    this.currentContactId = null;
    this.applicationForm.get('company_id')?.disable();

    // 2. Fetch the application data from the API.
    this.apiService.getApplicationById(id).subscribe({
      next: (application) => {
        // 3. Populate the clean form with the exact data from the API response.
        this.applicationForm.patchValue(application);
        this.applicationForm.get('company_id')?.setValue(application.company.id, { emitEvent: false });
        this.applicationForm.get('details.company')?.patchValue(application.company);
        
        this.notes.clear();
        application.notes.forEach(note => this.notes.push(this.fb.group({ id: note.id, text: note.text })));

        // 4. The single source of truth for the contact is `application.contact`.
        //    No "intelligent" secondary lookups are performed.
        if (application.contact) {
          this.currentContactId = application.contact.id;
          this.applicationForm.get('details.contact')?.patchValue(application.contact);
        }
      },
      error: (err: any) => this.onSaveError(err, 'load'),
    });
  }

  /**
   * Adds a new, empty note group to the 'notes' FormArray.
   */
  onAddNote(): void {
    this.notes.push(this.fb.group({ id: [null], text: ['', Validators.required] }));
  }

  /**
   * Removes a note from the 'notes' FormArray at a specific index.
   * @param index - The index of the note to remove.
   */
  onDeleteNote(index: number): void {
    this.notes.removeAt(index);
  }  

  /**
   * Orchestrates the form submission process.
   * It validates the form and then delegates the save logic to the appropriate
   * private handler based on whether a new contact needs to be created.
   */
  public onSubmit(): void {
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.showWarning('Please fill out all required fields correctly.', 'Invalid Input');
      return;
    }

    const formValue = this.applicationForm.getRawValue();
    if (!this.isEditMode || !this.currentApplicationId) { return; }

    const contactData = this.applicationForm.get('details.contact')?.value;
    const contactFormHasData = contactData?.first_name && contactData?.last_name;
    const shouldCreateContact = !this.currentContactId && contactFormHasData;

    const operation$ = shouldCreateContact
      ? this.handleCreateContactAndUpdates(formValue, contactData)
      : this.handleUpdates(formValue, contactData, contactFormHasData);

    operation$.subscribe({
      next: () => this.onSaveSuccess(),
      error: (err: any) => this.onSaveError(err, 'update'), // Korrigierter Kontext
    });
  }

  /**
   * Handles the workflow for creating a new contact and then updating the application and company.
   * This uses `switchMap` to ensure the contact is created first to get its ID, which is then
   * used to link it to the application in the subsequent update.
   * @param formValue - The raw value of the entire form.
   * @param contactData - The data from the contact form group.
   * @returns An Observable that completes when all operations are finished.
   * @private
   */
  private handleCreateContactAndUpdates(formValue: any, contactData: any): Observable<any> {
    const createContactPayload = this.buildCreateContactPayload(formValue, contactData);

    return this.apiService.createContact(createContactPayload).pipe(
      switchMap(newContact => {
        const applicationPayload = this.buildApplicationPayload(formValue, newContact.id);
        const companyPayload = this.buildCompanyPayload(formValue);
        
        return forkJoin({
          application: this.apiService.updateApplication(this.currentApplicationId!, applicationPayload),
          company: this.apiService.updateCompany(formValue.company_id!, companyPayload),
        });
      })
    );
  }

  /**
   * Handles the workflow for updating an application and its related data,
   * including updating or deleting an existing contact. All API calls are run in parallel
   * using `forkJoin` as they are not dependent on each other.
   * @param formValue - The raw value of the entire form.
   * @param contactData - The data from the contact form group.
   * @param contactFormHasData - A boolean indicating if the contact form is filled out.
   * @returns An Observable that completes when all operations are finished.
   * @private
   */
  private handleUpdates(formValue: any, contactData: any, contactFormHasData: boolean): Observable<any> {
    const observables = [];
    let contactIdForApplication: number | null | undefined = this.currentContactId;

    if (this.currentContactId) {
      if (!contactFormHasData) {
        observables.push(this.apiService.deleteContact(this.currentContactId));
        contactIdForApplication = null;
      } else {
        const cleanContactPayload = this.buildUpdateContactPayload(contactData);
        if (Object.keys(cleanContactPayload).length > 0) {
          observables.push(this.apiService.updateContact(this.currentContactId, cleanContactPayload));
        }
      }
    }

    // Always prepare to update the application itself.
    const applicationPayload = this.buildApplicationPayload(formValue, contactIdForApplication);
    observables.push(this.apiService.updateApplication(this.currentApplicationId!, applicationPayload));

    // Always prepare to update the company.
    const companyPayload = this.buildCompanyPayload(formValue);
    observables.push(this.apiService.updateCompany(formValue.company_id!, companyPayload));
    
    return forkJoin(observables);
  }

  /**
   * A helper function to build a clean payload for updating an existing contact by removing empty fields.
   * @private
   */
  private buildCreateContactPayload(formValue: any, contactData: any): CreateContactPayload {
    const payload: CreateContactPayload = {
      first_name: contactData.first_name!,
      last_name: contactData.last_name!,
      company_id: formValue.company_id!,
    };
    if (contactData.email) payload.email = contactData.email;
    if (contactData.position) payload.position = contactData.position;
    if (contactData.phone) payload.phone = contactData.phone;
    return payload;
  }

  /**
   * A helper function to build the payload for updating the company.
   * @private
   */
  private buildUpdateContactPayload(contactData: any): Partial<Contact> {
    const { id, ...payload } = contactData;
    return Object.entries(payload).reduce(
      (acc, [key, value]) => {
        if (value) (acc as any)[key] = value;
        return acc;
      }, {} as Partial<Contact>);
  }

  /**
   * A helper function to build the payload for updating the application.
   * @private
   */
  private buildApplicationPayload(formValue: any, contactId: number | null | undefined): CreateApplicationPayload {
    return {
      job_title: formValue.job_title!,
      company_id: formValue.company_id!,
      contact_id: contactId,
      status: formValue.status!,
      notes: formValue.notes as any,
    };
  }

  /**
   * A helper function to build the payload for updating the company.
   * @private
   */
  private buildCompanyPayload(formValue: any): Partial<Company> {
    const companyData = formValue.details.company;
    return {
      name: companyData.name!,
      industry: companyData.industry!,
      website: companyData.website || null,
    };
  }

  /**
   * Handles successful save operations by showing a notification and navigating.
   * @private
   */
  private onSaveSuccess(): void {
    this.notificationService.showSuccess('Alle Änderungen wurden erfolgreich gespeichert.');
    this.router.navigate(['/applications']);
  }

  /**
   * Handles errors that occur during load or save operations.
   * @param error - The error object.
   * @param context - The context in which the error occurred ('create', 'update', or 'load').
   * @private
   */
  private onSaveError(error: any, context: 'create' | 'update' | 'load'): void {
    const message = context === 'load' ? 'Die Bewerbungsdetails konnten nicht geladen werden.' : 'Ein Fehler ist aufgetreten.';
    this.notificationService.showError(message, 'Fehler');
    console.error(`Error during ${context} chain:`, error);
    if (context === 'load') {
        this.router.navigate(['/applications']);
    }
  }
}