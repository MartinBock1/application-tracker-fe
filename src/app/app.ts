import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Api } from './services/api';
import { Company } from './models/api-interfaces';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('application-tracker-fe');
  companies: Company[] = [];
  isMenuOpen = signal(false);

  public apiService = inject(Api);
  private router = inject(Router);

  ngOnInit(): void {
    // ngOnInit ist ein guter Ort, um initiale Daten zu laden.
    this.apiService.getCompanies().subscribe({
      next: (data) => {
        this.companies = data;
        console.log('Unternehmen erfolgreich geladen:', this.companies);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Unternehmen:', err);
      }
    });
  }

  toggleMenu(): void {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

   closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
    this.closeMenu();
    console.log('Erfolgreich ausgeloggt.');
  }
}
