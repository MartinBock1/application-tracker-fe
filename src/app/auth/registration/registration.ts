import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

import { Api } from '../../services/api';

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const repeated_password = control.get('repeated_password');

  return password &&
    repeated_password &&
    password.value !== repeated_password.value
    ? { passwordsMismatch: true }
    : null;
};

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
})
export class Registration {
  private fb = inject(FormBuilder);
  private apiService = inject(Api);
  private router = inject(Router);

  registerForm = this.fb.group(
    {
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      repeated_password: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

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
          this.errorMessage =
            'Registrierung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.';
          console.error(err);
        },
      });
    }
  }
}
