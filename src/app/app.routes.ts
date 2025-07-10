import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Registration } from './auth/registration/registration';
import { ApplicationForm } from './application/application-form/application-form';
import { ApplicationList } from './application/application-list/application-list';

import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
  // Öffentliche Routen (kein Guard)
  { path: 'login', component: Login, title: 'Login' },
  { path: 'register', component: Registration, title: 'Registrierung' },

  // Geschützte Routen (mit Guard)
  { 
    path: 'applications', 
    component: ApplicationList, 
    title: 'Meine Bewerbungen',
    canActivate: [authGuard] // HIER den Guard anwenden
  },
  { 
    path: 'applications/new', 
    component: ApplicationForm, 
    title: 'Neue Bewerbung',
    canActivate: [authGuard] // HIER den Guard anwenden
  },
  // NEU: Die Route zum Bearbeiten einer Bewerbung
  { 
    path: 'applications/edit/:id', // :id ist ein Platzhalter für die Bewerbungs-ID
    component: ApplicationForm, 
    canActivate: [authGuard] 
  },
  
  { path: '', redirectTo: '/applications', pathMatch: 'full' },
];
