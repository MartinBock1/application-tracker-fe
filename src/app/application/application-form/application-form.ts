import { Component, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Api } from '../../services/api';
import {
  Application,
  ApplicationStatus,
  Company,
  CreateApplicationPayload,
} from '../../models/api-interfaces';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification';

/**
 * Component for creating and editing job applications.
 * 
 * This component provides a reactive form with company selection, application status tracking,
 * and dynamic notes management. It handles both creation of new applications and editing
 * of existing ones based on the route parameters.
 * 
 * @example
 * ```html
 * <!-- Create new application -->
 * <app-application-form></app-application-form>
 * 
 * <!-- Edit existing application (via routing) -->
 * <!-- Route: /applications/edit/:id -->
 * ```
 */
@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
})
export class ApplicationForm implements OnInit {
  // Dependency injection using Angular's inject function
  private fb = inject(FormBuilder);
  private apiService = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  /** 
   * Array of available companies for selection in the form dropdown.
   * Populated during component initialization from the API.
   */
  companies: Company[] = [];
  
  /** 
   * ID of the application being edited.
   * @default null - Indicates creation mode when null
   */
  currentApplicationId: string | null = null;
  
  /** 
   * Flag indicating whether the form is in edit mode or create mode.
   * @default false - Component starts in create mode
   */
  isEditMode = false;
  
  /** 
   * Reactive form for job application data.
   * 
   * Contains all application fields including a dynamic notes array.
   * Form validation ensures required fields are completed before submission.
   * 
   * @remarks
   * The form structure includes:
   * - Basic application details (job_title, company_id, status)
   * - Date fields for tracking application progress
   * - Dynamic notes array for additional information
   */
  applicationForm = this.fb.group({
    job_title: ['', Validators.required],
    company_id: [null as number | null, Validators.required],
    status: ['DRAFT' as ApplicationStatus | null, Validators.required],
    applied_on: [null as string | null],
    interview_on: [null as string | null],
    offer_on: [null as string | null],
    rejected_on: [null as string | null],
    follow_up_on: [null as string | null],
    /** Dynamic array of notes with id and text fields */
    notes: this.fb.array([]),
  });

  /**
   * Component initialization lifecycle hook.
   * 
   * Performs the following initialization tasks:
   * 1. Loads available companies for dropdown selection
   * 2. Checks route parameters to determine if editing existing application
   * 3. Sets up reactive status change tracking
   * 
   * @remarks
   * If an 'id' parameter is present in the route, the component switches to edit mode
   * and loads the existing application data.
   */
  ngOnInit(): void {
    // Load available companies for dropdown selection
    this.apiService.getCompanies().subscribe((data) => {
      this.companies = data;
    });
    
    // Check if editing existing application
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.currentApplicationId = id;
      this.loadApplicationForEdit(id);
    }
    
    // Set up reactive status change tracking
    this.trackStatusChanges();
  }

  /**
   * Sets up reactive tracking for application status changes.
   * 
   * Automatically manages date fields based on status transitions to ensure
   * data consistency and improve user experience.
   * 
   * @todo Implement the actual status change tracking logic
   */
  trackStatusChanges(): void {
    // Implementation for status change tracking
    // ... your existing code here ...
  }

  /**
   * Getter for the notes FormArray.
   * 
   * Provides type-safe access to the dynamic notes collection within the form.
   * 
   * @returns FormArray containing note form groups with id and text fields
   * 
   * @example
   * ```typescript
   * // Add a new note
   * this.notes.push(this.fb.group({
   *   id: [null],
   *   text: ['New note', Validators.required]
   * }));
   * ```
   */
  get notes(): FormArray {
    return this.applicationForm.get('notes') as FormArray;
  }

  /**
   * Loads an existing application for editing.
   * 
   * Fetches application data from the API and populates the form fields.
   * Handles company relationship mapping and notes array population.
   * 
   * @param id - The unique identifier of the application to load
   * 
   * @throws Will display error notification and navigate to applications list if loading fails
   * 
   * @remarks
   * The method performs the following operations:
   * 1. Fetches application data via API
   * 2. Populates form with application data
   * 3. Maps company relationship correctly
   * 4. Clears and repopulates notes array
   * 5. Handles errors gracefully with user feedback
   */
  loadApplicationForEdit(id: string): void {
    this.apiService.getApplicationById(id).subscribe({
        next: (application) => {
            // Populate form with application data
            this.applicationForm.patchValue(application);
            this.applicationForm.patchValue({ company_id: application.company.id });
            
            // Clear existing notes to prevent duplicates
            this.notes.clear();
            
            // Add each note as a form group
            application.notes.forEach((note) => {
                this.notes.push(
                    this.fb.group({
                        id: [note.id],
                        text: [note.text, Validators.required],
                    })
                );
            });
        },
        error: (err) => {
            this.notificationService.showError('Die Bewerbungsdetails konnten nicht geladen werden.', 'Ladefehler');
            console.error('Error loading application details:', err);
            // Navigate back to applications list on error
            this.router.navigate(['/applications']);
        }
    });
  }

  /**
   * Adds a new empty note to the notes array.
   * 
   * Creates a new form group with id and text fields and appends it to the notes FormArray.
   * The new note is initialized with null id (for new notes) and empty text with validation.
   * 
   * @example
   * ```typescript
   * // User clicks "Add Note" button
   * onAddNote(); // Creates new empty note form group
   * ```
   */
  onAddNote(): void {
    this.notes.push(
      this.fb.group({ 
        id: [null], 
        text: ['', Validators.required] 
      })
    );
  }

  /**
   * Removes a note from the notes array at the specified index.
   * 
   * @param index - The zero-based index of the note to remove
   * 
   * @throws Will throw an error if index is out of bounds
   * 
   * @example
   * ```typescript
   * // Remove the second note (index 1)
   * onDeleteNote(1);
   * ```
   */
  onDeleteNote(index: number): void {
    this.notes.removeAt(index);
  }

  /**
   * Handles form submission for both create and update operations.
   * 
   * Validates form data, prepares payload, and executes the appropriate API call
   * based on the current mode (create or edit). Provides user feedback through
   * notifications and handles navigation on success.
   * 
   * @remarks
   * The method performs the following operations:
   * 1. Validates form data and shows validation errors if invalid
   * 2. Prepares payload from form values with proper type casting
   * 3. Executes create or update operation based on edit mode
   * 4. Handles success/error cases with appropriate notifications
   * 5. Navigates to applications list on successful operation
   * 
   * @throws Will display error notification if API call fails
   * 
   * @example
   * ```typescript
   * // Called when user submits the form
   * onSubmit(); // Validates and saves application
   * ```
   */
  onSubmit() {
    // Validate form before submission
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.showWarning('Bitte füllen Sie alle Pflichtfelder korrekt aus.', 'Ungültige Eingabe');
      return;
    }

    // Prepare payload from form values
    const formValue = this.applicationForm.getRawValue();
    const payload: CreateApplicationPayload = {
      job_title: formValue.job_title!,
      company_id: formValue.company_id!,
      status: formValue.status!,
      applied_on: formValue.applied_on || null,
      interview_on: formValue.interview_on || null,
      offer_on: formValue.offer_on || null,
      rejected_on: formValue.rejected_on || null,
      follow_up_on: formValue.follow_up_on || null,
      notes: formValue.notes as { id?: number; text: string }[],
    };

    if (this.isEditMode && this.currentApplicationId) {
      /** UPDATE operation - modify existing application */
      this.apiService.updateApplication(this.currentApplicationId, payload).subscribe({
          next: () => {
            this.notificationService.showSuccess('Die Bewerbung wurde erfolgreich aktualisiert.');
            this.router.navigate(['/applications']);
          },
          error: (err) => {
            this.notificationService.showError('Die Bewerbung konnte nicht aktualisiert werden.', 'Update fehlgeschlagen');
            console.error('Error updating application:', err);
          }
      });
    } else {
      /** CREATE operation - create new application */
      // Remove notes for creation (handled separately by API)
      delete payload.notes;
      
      this.apiService.createApplication(payload).subscribe({
          next: (newApplication) => {
            this.notificationService.showSuccess(`Bewerbung für "${newApplication.job_title}" wurde erstellt.`);
            this.router.navigate(['/applications']);
          },
          error: (err) => {
            this.notificationService.showError('Die Bewerbung konnte nicht erstellt werden.', 'Speichern fehlgeschlagen');
            console.error('Error creating application:', err);
          }
      });
    }
  }
}