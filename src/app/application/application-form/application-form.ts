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

import { forkJoin, of, Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification';
import {
  Application,
  ApplicationStatus,
  Company,
  Contact,
  CreateApplicationPayload,
  CreateContactPayload,
  Note,
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
 * This component handles a comprehensive form that allows users to create new applications
 * or edit existing ones. It manages the component's state (create vs. edit mode),
 * handles dynamic form controls, and orchestrates complex, multi-step API operations
 * for saving data, including nested entities like companies, contacts, and notes.
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
  contactsForSelectedCompany: Contact[] = [];
  currentApplicationId: string | null = null;
  isEditMode = false;
  currentContactId: number | null = null;
  applicationForm!: FormGroup;

  // =================================================================================
  // LIFECYCLE & INITIALIZATION
  // =================================================================================

  /**
   * Initializes the component by determining the mode (create/edit),
   * creating the form, setting up dynamic validation, and loading necessary data.
   */
  ngOnInit(): void {
    this.isEditMode = !!this.route.snapshot.paramMap.get('id');
    this.currentApplicationId = this.route.snapshot.paramMap.get('id');

    this.createForm();
    this.setupConditionalValidation();
    this.loadInitialData();
  }

  /**
   * Orchestrates the loading of data required on component initialization.
   * Loads companies for the dropdown, and if in edit mode, loads the application details.
   * @private
   */
  private loadInitialData(): void {
    this.apiService.getCompanies().subscribe((data) => {
      this.companies = data;
    });

    if (this.isEditMode && this.currentApplicationId) {
      this.loadApplicationForEdit(this.currentApplicationId);
    } else {
      this.listenForCompanyChanges();
    }
  }

  // =================================================================================
  // FORM CREATION & STRUCTURE
  // =================================================================================

  /**
   * Orchestrates the creation of the main reactive form based on the component mode.
   * Delegates a large portion of the structural definition to helper methods.
   * @private
   */
  private createForm(): void {
    this.applicationForm = this.initializeBaseFormGroup();

    if (this.isEditMode) {
      this.addControlsForEditMode();
    } else {
      this.addControlsForCreateMode();
    }
  }

  /**
   * Initializes the base structure of the `applicationForm` with common fields.
   * @returns The base FormGroup instance.
   * @private
   */
  private initializeBaseFormGroup(): FormGroup {
    return this.fb.group({
      job_title: ['', Validators.required],
      salary_expectation: [null as number | null],
      company_id: ['', Validators.required],
      status: ['DRAFT' as ApplicationStatus | null, Validators.required],
      applied_on: [null as string | null],
      interview_on: [null as string | null],
      offer_on: [null as string | null],
      rejected_on: [null as string | null],
      follow_up_on: [null as string | null],
    });
  }

  /**
   * Adds form controls specific to the 'create' mode.
   * @private
   */
  private addControlsForCreateMode(): void {
    this.applicationForm.addControl('contact_id', this.fb.control(null));
  }

  /**
   * Adds complex, nested form controls specific to the 'edit' mode.
   * Disables the company selection dropdown in edit mode.
   * @private
   */
  private addControlsForEditMode(): void {
    this.applicationForm.addControl('notes', this.fb.array([]));
    this.applicationForm.addControl('details', this.buildDetailsFormGroup());
    this.applicationForm.get('company_id')?.disable();
  }

  /**
   * Builds the nested 'details' FormGroup used in edit mode.
   * @returns The FormGroup containing company and contact details subsections.
   * @private
   */
  private buildDetailsFormGroup(): FormGroup {
    return this.fb.group({
      company: this.fb.group({
        name: ['', Validators.required],
        industry: ['', Validators.required],
        website: [''],
      }),
      contact: this.fb.group(
        {
          id: [null],
          first_name: [''],
          last_name: [''],
          email: ['', [Validators.email]],
          position: [''],
          phone: [''],
        },
        { validators: contactRequiredValidator }
      ),
    });
  }

  /**
   * A getter for convenient, type-safe access to the 'notes' FormArray.
   */
  get notes(): FormArray {
    return this.applicationForm.get('notes') as FormArray;
  }

  // =================================================================================
  // DYNAMIC FORM LOGIC & DATA LOADING
  // =================================================================================

  /**
   * Fetches application data and populates the form for editing.
   * @param id - The unique identifier of the application to load.
   */
  loadApplicationForEdit(id: string): void {
    this.apiService.getApplicationById(id).subscribe({
      next: (application) => this.populateFormWithData(application),
      error: (err: any) => this.onSaveError(err, 'load'),
    });
  }

  /**
   * Populates all form fields with data from the fetched application object.
   * Delegates note population to a specialized helper method.
   * @param application - The application data object from the API.
   * @private
   */
  private populateFormWithData(application: Application): void {
    // 1. Reset state and patch top-level values
    this.currentContactId = null;
    this.applicationForm.patchValue(application);

    // 2. Set company details (main ID and nested group)
    this.applicationForm
      .get('company_id')
      ?.setValue(application.company.id, { emitEvent: false });
    this.applicationForm
      .get('details.company')
      ?.patchValue(application.company);

    // 3. Populate nested contact details if they exist
    if (application.contact) {
      this.currentContactId = application.contact.id;
      this.applicationForm
        .get('details.contact')
        ?.patchValue(application.contact);
    }

    // 4. Populate notes array
    this.populateNotesArray(application.notes);
  }

  /**
   * Clears and repopulates the notes FormArray with data.
   * @param notesData - The array of note objects from the application data.
   * @private
   */
  private populateNotesArray(notesData: Note[]): void {
    this.notes.clear();
    notesData.forEach((note) => {
      this.notes.push(this.fb.group({ id: note.id, text: note.text }));
    });
  }

  /**
   * Sets up an observable stream on the `company_id` field to dynamically
   * load associated contacts when a company is selected in create mode.
   * @private
   */
  private listenForCompanyChanges(): void {
    this.applicationForm
      .get('company_id')
      ?.valueChanges.subscribe((companyId) => {
        this.contactsForSelectedCompany = [];
        this.applicationForm.get('contact_id')?.setValue(null);
        if (companyId) {
          this.loadContactsForCompany(companyId);
        }
      });
  }

  /**
   * Fetches contacts for a given company ID from the API.
   * @param companyId - The ID of the selected company.
   * @private
   */
  private loadContactsForCompany(companyId: number): void {
    this.apiService.getContactsForCompany(companyId).subscribe({
      next: (contacts) => {
        this.contactsForSelectedCompany = contacts;
      },
      error: (err) => {
        console.error('Error loading contacts for company:', err);
        this.notificationService.showError(
          'Could not load contacts for this company.'
        );
      },
    });
  }

  /**
   * Subscribes to `status` field changes to dynamically apply or remove
   * `Validators.required` on corresponding date fields.
   * @private
   */
  private setupConditionalValidation(): void {
    this.applicationForm.get('status')?.valueChanges.subscribe((status) => {
      const updateValidators = (
        control: AbstractControl | null,
        required: boolean
      ) => {
        if (!control) return;
        control.setValidators(required ? Validators.required : null);
        control.updateValueAndValidity();
      };

      updateValidators(
        this.applicationForm.get('applied_on'),
        status === 'APPLIED'
      );
      updateValidators(
        this.applicationForm.get('interview_on'),
        status === 'INTERVIEW'
      );
      updateValidators(
        this.applicationForm.get('offer_on'),
        status === 'OFFER'
      );
      updateValidators(
        this.applicationForm.get('rejected_on'),
        status === 'REJECTED'
      );
    });
  }

  // =================================================================================
  // FORM ACTIONS (NOTES)
  // =================================================================================

  /**
   * Adds a new, empty note group to the 'notes' FormArray.
   */
  onAddNote(): void {
    this.notes.push(
      this.fb.group({ id: [null], text: ['', Validators.required] })
    );
  }

  /**
   * Removes a note from the 'notes' FormArray at a given index.
   * @param index - The index of the note to remove.
   */
  onDeleteNote(index: number): void {
    this.notes.removeAt(index);
  }

  // =================================================================================
  // FORM SUBMISSION ORCHESTRATION
  // =================================================================================

  /**
   * Main submission handler. Validates the form and delegates the save logic
   * to the appropriate handler based on the component's mode (create or edit).
   */
  public onSubmit(): void {
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.showWarning(
        'Please fill out all required fields correctly.',
        'Invalid Input'
      );
      return;
    }

    const operation$ = this.isEditMode
      ? this.handleUpdateApplication()
      : this.handleCreateApplication();

    operation$.subscribe({
      next: () => this.onSaveSuccess(),
      error: (err: any) =>
        this.onSaveError(err, this.isEditMode ? 'update' : 'create'),
    });
  }

  /**
   * Orchestrates the creation of a new application by building the payload and calling the API service.
   * @returns An Observable that emits the created application.
   * @private
   */
  private handleCreateApplication(): Observable<Application> {
    const formValue = this.applicationForm.getRawValue();
    const payload = this.buildCreateApplicationPayload(formValue);
    return this.apiService.createApplication(payload);
  }

  /**
   * Orchestrates the update of an existing application and its related data.
   * It handles the complex logic of determining whether to update, create, or delete a contact.
   * @returns An Observable that completes when all API calls are finished.
   * @private
   */
  private handleUpdateApplication(): Observable<any> {
    if (!this.currentApplicationId) {
      const error = 'Edit mode is active, but no application ID is present.';
      console.error(error);
      this.notificationService.showError(
        'Cannot save changes, application ID is missing.',
        'Error'
      );
      return throwError(() => new Error(error));
    }

    const formValue = this.applicationForm.getRawValue();
    const contactData = formValue.details.contact;
    const contactFormHasData =
      contactData?.first_name && contactData?.last_name;
    const shouldCreateContact = !this.currentContactId && contactFormHasData;

    return shouldCreateContact
      ? this.handleCreateContactAndUpdates(formValue, contactData)
      : this.handleUpdates(formValue, contactData, contactFormHasData);
  }

  // =================================================================================
  // DATA PROCESSING & API PAYLOADS
  // =================================================================================

  /**
   * Handles the workflow for creating a new contact and then updating the application and company.
   * @param formValue - The raw value of the entire form.
   * @param contactData - The data from the contact form group.
   * @returns An Observable that completes when all operations are finished.
   * @private
   */
  private handleCreateContactAndUpdates(
    formValue: any,
    contactData: any
  ): Observable<any> {
    const createContactPayload = this.buildCreateContactPayload(
      formValue,
      contactData
    );

    return this.apiService.createContact(createContactPayload).pipe(
      switchMap((newContact) => {
        const applicationPayload = this.buildUpdateApplicationPayload(
          formValue,
          newContact.id
        );
        const companyPayload = this.buildCompanyPayload(formValue);

        return forkJoin({
          application: this.apiService.updateApplication(
            this.currentApplicationId!,
            applicationPayload
          ),
          company: this.apiService.updateCompany(
            formValue.company_id!,
            companyPayload
          ),
        });
      })
    );
  }

  /**
   * Handles the workflow for updating an application, company, and existing contact (update or delete).
   * @param formValue - The raw value of the entire form.
   * @param contactData - The data from the contact form group.
   * @param contactFormHasData - A boolean indicating if the contact form is filled out.
   * @returns An Observable that completes when all parallel operations are finished.
   * @private
   */
  private handleUpdates(
    formValue: any,
    contactData: any,
    contactFormHasData: boolean
  ): Observable<any> {
    const observables = [];
    let contactIdForApplication: number | null | undefined =
      this.currentContactId;

    if (this.currentContactId) {
      if (!contactFormHasData) {
        observables.push(this.apiService.deleteContact(this.currentContactId));
        contactIdForApplication = null;
      } else {
        const cleanContactPayload = this.buildUpdateContactPayload(contactData);
        if (Object.keys(cleanContactPayload).length > 0) {
          observables.push(
            this.apiService.updateContact(
              this.currentContactId,
              cleanContactPayload
            )
          );
        }
      }
    }

    observables.push(
      this.apiService.updateApplication(
        this.currentApplicationId!,
        this.buildUpdateApplicationPayload(formValue, contactIdForApplication)
      )
    );
    observables.push(
      this.apiService.updateCompany(
        formValue.company_id!,
        this.buildCompanyPayload(formValue)
      )
    );

    return forkJoin(observables);
  }

  /**
   * Builds the payload for creating a new contact from form data.
   * @param formValue - The raw data from the main form (used to get company_id).
   * @param contactData - The data specific to the contact from the nested form group.
   * @returns The payload object for the create contact API endpoint.
   * @private
   */
  private buildCreateContactPayload(
    formValue: any,
    contactData: any
  ): CreateContactPayload {
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
   * Builds a clean payload for updating an existing contact by removing empty fields.
   * @param contactData - The data specific to the contact from the nested form group.
   * @returns A partial Contact object containing only non-empty fields.
   * @private
   */
  private buildUpdateContactPayload(contactData: any): Partial<Contact> {
    const { id, ...payload } = contactData;
    return Object.entries(payload).reduce((acc, [key, value]) => {
      if (value) (acc as any)[key] = value;
      return acc;
    }, {} as Partial<Contact>);
  }

  /**
   * Builds the payload for creating a new application.
   * @param formValue - The raw data from the main form.
   * @returns The payload object for the create application API endpoint.
   * @private
   */
  private buildCreateApplicationPayload(
    formValue: any
  ): CreateApplicationPayload {
    return {
      job_title: formValue.job_title,
      salary_expectation: formValue.salary_expectation || null,
      company_id: formValue.company_id,
      status: formValue.status,
      applied_on: formValue.applied_on || null,
      interview_on: formValue.interview_on || null,
      offer_on: formValue.offer_on || null,
      rejected_on: formValue.rejected_on || null,
      follow_up_on: formValue.follow_up_on || null,
      contact_id: formValue.contact_id || null,
    };
  }

  /**
   * Builds the payload for updating an existing application.
   * @param formValue - The raw data from the main form.
   * @param contactId - The final contact ID to associate with the application.
   * @returns The payload object for the update application API endpoint.
   * @private
   */
  private buildUpdateApplicationPayload(
    formValue: any,
    contactId: number | null | undefined
  ): CreateApplicationPayload {
    return {
      job_title: formValue.job_title!,
      salary_expectation: formValue.salary_expectation || null,
      company_id: formValue.company_id!,
      contact_id: contactId,
      status: formValue.status!,
      notes: formValue.notes as any,
      applied_on: formValue.applied_on || null,
      interview_on: formValue.interview_on || null,
      offer_on: formValue.offer_on || null,
      rejected_on: formValue.rejected_on || null,
      follow_up_on: formValue.follow_up_on || null,
    };
  }

  /**
   * Builds the payload for updating the company details.
   * @param formValue - The raw data from the main form.
   * @returns A partial Company object.
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

  // =================================================================================
  // NOTIFICATION & NAVIGATION HANDLERS
  // =================================================================================

  /**
   * Handles successful save operations by showing a success notification and navigating back to the list view.
   * @private
   */
  private onSaveSuccess(): void {
    this.notificationService.showSuccess(
      'All changes have been saved successfully.'
    );
    this.router.navigate(['/applications']);
  }

  /**
   * Handles errors that occur during API operations (load or save).
   * Displays an error notification and logs the error to the console.
   * @param error - The error object.
   * @param context - The context ing which the error occurred ('create', 'update', or 'load').
   * @private
   */
  private onSaveError(error: any, context: 'create' | 'update' | 'load'): void {
    const message =
      context === 'load'
        ? 'The application details could not be loaded.'
        : 'An error occurred while saving.';
    this.notificationService.showError(message, 'Error');
    console.error(`Error during ${context} chain:`, error);
    if (context === 'load') {
      this.router.navigate(['/applications']);
    }
  }
}
