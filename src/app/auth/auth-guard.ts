import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Api } from '../services/api';

export const authGuard: CanActivateFn = (route, state) => {
  const apiService = inject(Api);
  const router = inject(Router);

  if (apiService.isLoggedIn()) {
    return true; // Der Benutzer ist eingeloggt, Zugriff erlaubt.
  } else {
    // Der Benutzer ist nicht eingeloggt, leite ihn zur Login-Seite um.
    router.navigate(['/login']);
    return false; // Zugriff verweigert.
  }
};
