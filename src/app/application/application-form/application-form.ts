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

// HINZUGEFÜGT: Importiere unseren NotificationService
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
})
export class ApplicationForm implements OnInit { // OnInit hinzugefügt, da es verwendet wird
  private fb = inject(FormBuilder);
  private apiService = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // HINZUGEFÜGT: Injiziere den NotificationService
  private notificationService = inject(NotificationService);

  // Bestehende Eigenschaften bleiben unverändert
  companies: Company[] = [];
  currentApplicationId: string | null = null;
  isEditMode = false;
  
  // Das Formular bleibt unverändert
  applicationForm = this.fb.group({
    job_title: ['', Validators.required],
    company_id: [null as number | null, Validators.required],
    status: ['DRAFT' as ApplicationStatus | null, Validators.required],
    applied_on: [null as string | null],
    interview_on: [null as string | null],
    offer_on: [null as string | null],
    rejected_on: [null as string | null],
    follow_up_on: [null as string | null],
    notes: this.fb.array([]),
  });

  ngOnInit(): void {
    this.apiService.getCompanies().subscribe((data) => {
      this.companies = data;
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.currentApplicationId = id;
      this.loadApplicationForEdit(id);
    }
    this.trackStatusChanges();
  }

  // trackStatusChanges bleibt unverändert
  trackStatusChanges(): void {
    // ... dein Code hier ...
  }

  get notes(): FormArray {
    return this.applicationForm.get('notes') as FormArray;
  }

  loadApplicationForEdit(id: string): void {
    // ANPASSUNG: Fehlerbehandlung beim Laden hinzugefügt
    this.apiService.getApplicationById(id).subscribe({
        next: (application) => {
            this.applicationForm.patchValue(application);
            this.applicationForm.patchValue({ company_id: application.company.id });
            
            this.notes.clear(); // Alte Notizen löschen, um Duplikate zu vermeiden
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
            console.error(err);
            this.router.navigate(['/applications']); // Bei Fehler sicherheitshalber zur Übersicht
        }
    });
  }

  // onAddNote und onDeleteNote bleiben unverändert
  onAddNote(): void {
    this.notes.push(
      this.fb.group({ id: [null], text: ['', Validators.required] })
    );
  }

  onDeleteNote(index: number): void {
    this.notes.removeAt(index);
  }

  onSubmit() {
    // ANPASSUNG: Feedback für ungültiges Formular
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.showWarning('Bitte füllen Sie alle Pflichtfelder korrekt aus.', 'Ungültige Eingabe');
      return;
    }

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
      // --- UPDATE-LOGIK MIT NOTIFICATIONS ---
      this.apiService.updateApplication(this.currentApplicationId, payload).subscribe({
          next: () => {
            this.notificationService.showSuccess('Die Bewerbung wurde erfolgreich aktualisiert.');
            this.router.navigate(['/applications']);
          },
          error: (err) => {
            this.notificationService.showError('Die Bewerbung konnte nicht aktualisiert werden.', 'Update fehlgeschlagen');
            console.error('Fehler beim Aktualisieren', err);
          }
      });
    } else {
      // --- CREATE-LOGIK MIT NOTIFICATIONS ---
      delete payload.notes;
      this.apiService.createApplication(payload).subscribe({
          next: (newApplication) => {
            this.notificationService.showSuccess(`Bewerbung für "${newApplication.job_title}" wurde erstellt.`);
            this.router.navigate(['/applications']);
          },
          error: (err) => {
            this.notificationService.showError('Die Bewerbung konnte nicht erstellt werden.', 'Speichern fehlgeschlagen');
            console.error('Fehler beim Erstellen', err);
          }
      });
    }
  }
}