import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs';
import { Api } from '../services/api';
import { CreateCompanyPayload, CreateContactPayload } from '../models/api-interfaces';

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
      // Markiere alle Felder als "touched", um Validierungsfehler anzuzeigen
      this.form.markAllAsTouched();
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
          company_id: newCompany.id // Hier wird die ID der neuen Firma zugewiesen
        };
        return this.api.createContact(contactPayload);
      })
    ).subscribe({
      next: () => {
        console.log('Firma und Kontakt erfolgreich erstellt!');
        // Nach Erfolg zur Bewerbungsliste navigieren
        this.router.navigate(['/applications']);
      },
      error: (err) => {
        console.error('Fehler beim Erstellen:', err);
        // Hier könnten Sie dem Benutzer eine Fehlermeldung anzeigen
      }
    });
  }
}
