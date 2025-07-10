import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
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
  newNoteControl = new FormControl('', [Validators.required]);

  // NEU (mit expliziten Typen):
  applicationForm = this.fb.group({
    job_title: ['', Validators.required],
    company_id: [null as number | null, Validators.required],
    status: ['DRAFT' as ApplicationStatus | null, Validators.required],    
    // ... füge hier weitere Felder aus deinem Django-Model hinzu
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
  }

  loadApplicationForEdit(id: string): void {
    this.apiService.getApplicationById(id).subscribe(application => {
      // Speichere die gesamte Bewerbung, damit wir Zugriff auf die Notizen im Template haben
      this.currentApplication = application; 

      // Fülle das Hauptformular wie bisher
      this.applicationForm.patchValue({
        job_title: application.job_title,
        company_id: application.company.id,
        status: application.status
      });
    });
  }

  onAddNote(): void {
    if (this.newNoteControl.invalid || !this.currentApplicationId) {
      return; // Nichts tun, wenn das Feld leer ist oder keine Bewerbungs-ID vorhanden ist
    }
    
    const payload = {
      application: parseInt(this.currentApplicationId, 10), // ID in eine Zahl umwandeln
      text: this.newNoteControl.value!
    };

    this.apiService.createNote(payload).subscribe({
      next: (newNote) => {
        // Die neue Notiz direkt zur lokalen Liste hinzufügen, damit die UI sofort aktualisiert wird
        if (this.currentApplication) {
          this.currentApplication.notes.unshift(newNote); // unshift() fügt am Anfang hinzu
        }
        // Das Eingabefeld zurücksetzen
        this.newNoteControl.reset();
        console.log('Notiz erfolgreich hinzugefügt:', newNote);
      },
      error: (err) => {
        console.error('Fehler beim Hinzufügen der Notiz:', err);
      }
    });
  }

  onSubmit() {
    // Der Gültigkeitscheck ist jetzt noch wichtiger!
    if (this.applicationForm.invalid) {
      // Optional: Markiere alle Felder als "touched", um dem Benutzer Fehler anzuzeigen
      this.applicationForm.markAllAsTouched();
      return;
    }

    // Hol die Werte aus dem Formular
    const formValue = this.applicationForm.value;

    // Erstelle ein sauberes Payload-Objekt, das der API-Schnittstelle entspricht
    const payload: CreateApplicationPayload = {
      // Wir wissen, dass diese Werte nicht null sind, weil der Validator es geprüft hat.
      // Das '!' (non-null assertion operator) sagt TypeScript: "Vertrau mir, das ist hier nicht null."
      job_title: formValue.job_title!, 
      company_id: formValue.company_id!,
      status: formValue.status! as 'DRAFT', // Hier können wir den Typ sogar noch genauer angeben
      // Füge hier weitere, optionale Felder hinzu, falls sie im Formular existieren
      // z.B. applied_on: formValue.applied_on || null,
    };
    if (this.isEditMode && this.currentApplicationId) {
      // Wenn wir im Bearbeitungsmodus sind, rufen wir die Update-Methode auf
      this.apiService.updateApplication(this.currentApplicationId, payload).subscribe({
        next: () => {
          console.log('Bewerbung erfolgreich aktualisiert');
          this.router.navigate(['/applications']);
        },
        error: (err) => console.error('Fehler beim Aktualisieren', err)
      });
    } else {
      // Ansonsten erstellen wir eine neue Bewerbung
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