import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Application } from '../../models/api-interfaces';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './application-list.html',
  styleUrl: './application-list.scss'
})
export class ApplicationList implements OnInit {
  private apiService = inject(Api);

  // Zustand der Komponente
  applications: Application[] = [];
  isLoading = true; // Startet im Ladezustand
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getApplications().subscribe({
      next: (data) => {
        this.applications = data;
        this.isLoading = false;
        console.log('Bewerbungen geladen:', data);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Bewerbungen:', err);
        // Gib eine benutzerfreundliche Fehlermeldung aus
        this.errorMessage = 'Fehler beim Laden der Bewerbungen. Bitte versuchen Sie es später erneut.';
        this.isLoading = false;
      }
    });
  }
}
