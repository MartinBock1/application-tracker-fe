import { Component, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Api } from '../../services/api';
import {
  ApplicationStatus,
  Company,
  Contact, // Wir brauchen den Contact-Typ
  CreateApplicationPayload,
  CreateContactPayload,
  // Schnittstellen importiert lassen
} from '../../models/api-interfaces';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export const contactRequiredValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const firstName = control.get('first_name')?.value;
  const lastName = control.get('last_name')?.value;
  const isInvalid = (firstName && !lastName) || (!firstName && lastName);
  return isInvalid ? { contactIncomplete: true } : null;
};

@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
})
export class ApplicationForm implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  companies: Company[] = [];
  currentApplicationId: string | null = null;
  isEditMode = false;

  // KORREKTUR: Fehlende Klasseneigenschaft hinzugefügt
  currentContactId: number | null = null;

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

    details: this.fb.group({
      company: this.fb.group({
        name: ['', Validators.required],
        industry: ['', Validators.required],
        website: [''],
      }),
      contact: this.fb.group(
        {
          id: [null as number | null],
          first_name: [''],
          last_name: [''],
          email: ['', [Validators.email]],
          position: [''],
          phone: [''],
        },
        { validators: contactRequiredValidator }
      ),
    }),
  });

  ngOnInit(): void {
    // Diese Logik bleibt unverändert
    this.apiService.getCompanies().subscribe((data) => {
      this.companies = data;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.currentApplicationId = id;
      this.loadApplicationForEdit(id);
      this.applicationForm.get('company_id')?.disable();
    }
  }

  get notes(): FormArray {
    return this.applicationForm.get('notes') as FormArray;
  }

  /**
   * KORRIGIERT: Lädt die Bewerbung und greift korrekt auf `application.company`
   * und `application.contact` zu.
   */
  loadApplicationForEdit(id: string): void {
    this.apiService.getApplicationById(id).pipe(
      switchMap(application => {
        // Schritt 1: Fülle sofort alle bekannten Daten (Bewerbung, Firma, Notizen)
        this.applicationForm.patchValue(application);
        this.applicationForm.patchValue({ company_id: application.company.id });
        this.applicationForm.get('details.company')?.patchValue(application.company);

        this.notes.clear();
        application.notes.forEach(note => {
          this.notes.push(this.fb.group({ id: [note.id], text: [note.text, Validators.required] }));
        });

        // Schritt 2: Prüfe, ob die Bewerbung bereits einen verknüpften Kontakt hat
        if (application.contact) {
          // Wenn ja, ist alles einfach. Wir geben ihn als Observable zurück.
          return of(application.contact); 
        } else {
          // Wenn nein, holen wir uns alle Kontakte für diese Firma
          return this.apiService.getContactsForCompany(application.company.id);
        }
      })
    ).subscribe({
      next: (contactOrContacts) => {
        let primaryContact: Contact | null = null;
        if (Array.isArray(contactOrContacts) && contactOrContacts.length > 0) {
          // Wir haben ein Array von Kontakten von der Firma bekommen -> nimm den ersten
          primaryContact = contactOrContacts[0];
        } else if (contactOrContacts && !Array.isArray(contactOrContacts)) {
          // Wir haben einen einzelnen Kontakt direkt von der Bewerbung bekommen
          primaryContact = contactOrContacts;
        }

        if (primaryContact) {
          // Fülle das Formular mit dem gefundenen Kontakt
          this.currentContactId = primaryContact.id;
          this.applicationForm.get('details.contact')?.patchValue(primaryContact);
        }
      },
      error: (err) => {
        this.notificationService.showError('Die Bewerbungsdetails konnten nicht geladen werden.', 'Ladefehler');
        console.error('Error loading application details:', err);
        this.router.navigate(['/applications']);
      },
    });
  }

  onAddNote(): void {
    this.notes.push(
      this.fb.group({ id: [null], text: ['', Validators.required] })
    );
  }

  onDeleteNote(index: number): void {
    this.notes.removeAt(index);
  }

  /**
   * KORRIGIERT: Stellt durch Non-Null-Assertions (!) sicher, dass der Payload
   * typsicher ist und dem `CreateApplicationPayload` Interface entspricht.
   */
  onSubmit() {
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.showWarning('Bitte füllen Sie alle Pflichtfelder korrekt aus.', 'Ungültige Eingabe');
      return;
    }

    const formValue = this.applicationForm.getRawValue();
    if (!this.isEditMode || !this.currentApplicationId) { return; }

    const companyData = this.applicationForm.get('details.company')?.value;
    const contactData = this.applicationForm.get('details.contact')?.value;

    const shouldCreateContact = !this.currentContactId && contactData?.first_name && contactData?.last_name;

    if (shouldCreateContact) {
      // SZENARIO 1: NEUEN KONTAKT ERSTELLEN
      
      // Schritt 1: Erstelle den Payload nur mit den 100%ig notwendigen Feldern.
      const createContactPayload: CreateContactPayload = {
        first_name: contactData.first_name!,
        last_name: contactData.last_name!,
        company_id: formValue.company_id!,
      };

      // Schritt 2: Füge die optionalen Felder NUR DANN hinzu, wenn sie einen validen, nicht-leeren Wert haben.
      // Dies ist die entscheidende, kugelsichere Logik.
      if (contactData.email && contactData.email.trim() !== '') {
        createContactPayload.email = contactData.email;
      }
      if (contactData.position && contactData.position.trim() !== '') {
        createContactPayload.position = contactData.position;
      }
      if (contactData.phone && contactData.phone.trim() !== '') {
        createContactPayload.phone = contactData.phone;
      }

      // --- DIAGNOSE-SCHRITT: Zeige uns genau, was gesendet wird ---
      console.log('%cSENDING TO API (createContact):', 'color: blue; font-weight: bold;', createContactPayload);
      // ---------------------------------------------------------

      this.apiService.createContact(createContactPayload).pipe(
        switchMap(newContact => {
          const applicationPayload: CreateApplicationPayload = {
            job_title: formValue.job_title!,
            company_id: formValue.company_id!,
            contact_id: newContact.id,
            status: formValue.status!,
            notes: formValue.notes as any,
          };
          const companyPayload = {
            name: companyData!.name!,
            industry: companyData!.industry!,
            website: companyData!.website || null,
          };
          return forkJoin({
            application: this.apiService.updateApplication(this.currentApplicationId!, applicationPayload),
            company: this.apiService.updateCompany(formValue.company_id!, companyPayload),
          });
        })
      ).subscribe({
        next: () => this.onSaveSuccess(),
        error: err => this.onSaveError(err, 'create'),
      });

    } else {
      // SZENARIO 2: Bestehende Daten aktualisieren
      const observables = [];
      const applicationPayload: CreateApplicationPayload = {
        job_title: formValue.job_title!,
        company_id: formValue.company_id!,
        contact_id: this.currentContactId,
        status: formValue.status!,
        notes: formValue.notes as any,
      };
      observables.push(
        this.apiService.updateApplication(
          this.currentApplicationId,
          applicationPayload
        )
      );

      if (companyData) {
        const companyPayload = {
          name: companyData.name!,
          industry: companyData.industry!,
          website: companyData.website || null,
        };
        observables.push(
          this.apiService.updateCompany(formValue.company_id!, companyPayload)
        );
      }

      if (this.currentContactId && contactData) {
        const { id, ...payload } = contactData;
        const cleanContactPayload = Object.entries(payload).reduce(
          (acc, [key, value]) => {
            if (value) (acc as any)[key] = value;
            return acc;
          },
          {} as Partial<Contact>
        );
        if (Object.keys(cleanContactPayload).length > 0) {
          observables.push(
            this.apiService.updateContact(
              this.currentContactId,
              cleanContactPayload
            )
          );
        }
      }

      forkJoin(observables).subscribe({
        next: () => this.onSaveSuccess(),
        error: (err) => this.onSaveError(err, 'update'),
      });
    }
  }

  private onSaveSuccess(): void {
    this.notificationService.showSuccess(
      'Alle Änderungen wurden erfolgreich gespeichert.'
    );
    this.router.navigate(['/applications']);
  }

  private onSaveError(error: any, context: 'create' | 'update'): void {
    this.notificationService.showError(
      'Ein Fehler ist aufgetreten.',
      'Speichern fehlgeschlagen'
    );
    console.error(`Error during ${context} chain:`, error);
  }
}
