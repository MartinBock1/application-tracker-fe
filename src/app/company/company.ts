import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs';
import { Api } from '../services/api';
import { CreateCompanyPayload, CreateContactPayload } from '../models/api-interfaces';
import { NotificationService } from '../services/notification';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company.html',
  styleUrls: ['./company.scss']
})
export class CompanyFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(Api);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Wir erstellen ein Formular mit zwei verschachtelten Gruppen
  form: FormGroup = this.fb.group({
    company: this.fb.group({
      name: ['', Validators.required],
      industry: ['', Validators.required],
      website: [''],
    }),
    contact: this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      position: [''],
      phone: [''],
    })
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showWarning('Bitte füllen Sie alle Pflichtfelder korrekt aus.', 'Ungültige Eingabe');
      return;
    }

    const companyPayload: CreateCompanyPayload = this.form.get('company')?.value;
    const contactData = this.form.get('contact')?.value;

    // RxJS-Magie:
    // 1. Zuerst die Firma erstellen.
    // 2. Mit switchMap auf die Antwort warten und die neue Firmen-ID verwenden,
    //    um den Kontakt zu erstellen.
    this.api.createCompany(companyPayload).pipe(
      switchMap(newCompany => {
        const contactPayload: CreateContactPayload = {
          ...contactData,
          company_id: newCompany.id
        };
        return this.api.createContact(contactPayload);
      })
    ).subscribe({
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
        console.error('Fehler beim Erstellen von Firma/Kontakt:', err);
      }
    });
  }
}
