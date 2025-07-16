import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Api } from '../../services/api';
import { Application, ApplicationStatus, Company, CreateApplicationPayload } from '../../models/api-interfaces';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss'
})
export class ApplicationForm {
private fb = inject(FormBuilder);
  private apiService = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  companies: Company[] = [];
  currentApplicationId: string | null = null; // Um die ID zu speichern, falls wir im Bearbeitungsmodus sind
  currentApplication: Application | null = null;
  isEditMode = false; // Ein Flag, um den Modus zu erkennen
  
  // NEU (mit expliziten Typen):
  applicationForm = this.fb.group({
    job_title: ['', Validators.required],
    company_id: [null as number | null, Validators.required],
    status: ['DRAFT' as ApplicationStatus | null, Validators.required],    
    applied_on: [null as string | null],
    interview_on: [null as string | null],
    offer_on: [null as string | null],
    rejected_on: [null as string | null],
    follow_up_on: [null as string | null],
    notes: this.fb.array([])
  });

  ngOnInit(): void {
    // Lade die Firmen, um sie im Dropdown anzuzeigen
    this.apiService.getCompanies().subscribe(data => {
      this.companies = data;
    });
    // Bearbeitungsmodus erkennen
    const id = this.route.snapshot.paramMap.get('id'); // 'id' aus der URL lesen
    if (id) {
      this.isEditMode = true;
      this.currentApplicationId = id;
      this.loadApplicationForEdit(id);
    }

    this.trackStatusChanges();
  }

  trackStatusChanges(): void {
    this.applicationForm.get('status')?.valueChanges.subscribe(neuerStatus => {
      // Zuerst alle Datums-Validatoren zurücksetzen
      const felder = ['applied_on', 'interview_on', 'offer_on', 'rejected_on'];
      felder.forEach(feld => {
        this.applicationForm.get(feld)?.clearValidators();
        this.applicationForm.get(feld)?.updateValueAndValidity();
      });

      // Funktion, um Datum zu setzen, wenn es noch leer ist
      const setzeDatumWennLeer = (feldName: string) => {
        const control = this.applicationForm.get(feldName);
        if (!control?.value) {
          const heute = new Date().toISOString().split('T')[0];
          control?.setValue(heute);
        }
        control?.setValidators([Validators.required]);
        control?.updateValueAndValidity();
      };
      
      // Je nach Status das richtige Feld zum Pflichtfeld machen
      switch (neuerStatus) {
        case 'APPLIED':
          setzeDatumWennLeer('applied_on');
          break;
        case 'INTERVIEW':
          setzeDatumWennLeer('interview_on');
          break;
        case 'OFFER':
          setzeDatumWennLeer('offer_on');
          break;
        case 'REJECTED':
          setzeDatumWennLeer('rejected_on');
          break;
      }
    });
  }


  get notes(): FormArray {
    return this.applicationForm.get('notes') as FormArray;
  }

  loadApplicationForEdit(id: string): void {
    this.apiService.getApplicationById(id).subscribe(application => {
      // PatchValue füllt jetzt ALLE Felder, die übereinstimmen
      this.applicationForm.patchValue(application); 
      // Korrigiere company_id manuell, da es ein verschachteltes Objekt ist
      this.applicationForm.patchValue({ company_id: application.company.id });

      // Fülle das FormArray mit den existierenden Notizen
      application.notes.forEach(note => {
        this.notes.push(this.fb.group({
          id: [note.id],
          text: [note.text, Validators.required]
        }));
      });
    });
  }

  onAddNote(): void {
    this.notes.push(this.fb.group({
      id: [null], // Neue Notizen haben keine ID
      text: ['', Validators.required]
    }));
  }

  // Entfernt eine Notiz an einem bestimmten Index
  onDeleteNote(index: number): void {
    this.notes.removeAt(index);
  }

  onSubmit() {
    // if (this.applicationForm.invalid) {
    //   this.applicationForm.markAllAsTouched();
    //   return;
    // }

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
      notes: this.isEditMode ? (formValue.notes! as { id?: number; text: string }[]) : undefined
    };

    if (this.isEditMode && this.currentApplicationId) {
      this.apiService.updateApplication(this.currentApplicationId, payload).subscribe({
        next: () => {
          console.log('Bewerbung erfolgreich aktualisiert');
          this.router.navigate(['/applications']);
        },
        error: (err) => console.error('Fehler beim Aktualisieren', err)
      });
    } else {
      // Wenn wir eine neue Bewerbung erstellen, wollen wir das 'notes'-Feld nicht mitschicken.
      delete payload.notes;
      this.apiService.createApplication(payload).subscribe({
        next: () => {
          console.log('Bewerbung erfolgreich erstellt');
          this.router.navigate(['/applications']);
        },
        error: (err) => console.error('Fehler beim Erstellen', err)
      });
    }
  }
}