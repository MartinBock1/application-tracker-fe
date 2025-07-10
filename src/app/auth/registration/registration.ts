import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.scss'
})
export class Registration {
private fb = inject(FormBuilder);
  private apiService = inject(Api);
  private router = inject(Router);

  registerForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    repeated_password: ['', Validators.required]
  });

  errorMessage: string | null = null;

  onSubmit() {
    if (this.registerForm.valid) {
      this.apiService.register(this.registerForm.value).subscribe({
        next: (response) => {
          console.log('Registrierung erfolgreich', response);
          this.apiService.saveToken(response.token);
          this.router.navigate(['/applications']); // Nach Erfolg zur App weiterleiten
        },
        error: (err) => {
          this.errorMessage = 'Registrierung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.';
          console.error(err);
        }
      });
    }
  }
}
