import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Application } from '../../models/api-interfaces';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './application-list.html',
  styleUrl: './application-list.scss'
})
export class ApplicationList implements OnInit {
  private apiService = inject(Api);
  private notificationService = inject(NotificationService);

  // --- EIGENSCHAFTEN FÜR DAS KANBAN-BOARD ---
  public allApplications: Application[] = [];
  public readonly statusOrder = ['DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'];
  public readonly statusTitleMap: { [key: string]: string } = {
    DRAFT: 'Entwürfe',
    APPLIED: 'Beworben',
    INTERVIEW: 'Interview',
    OFFER: 'Angebote',
    REJECTED: 'Abgelehnt'
  };
  public groupedApplications: { [key: string]: Application[] } = {};
  public isLoading = true;
  public errorMessage: string | null = null;
  public dueFollowUpsCount = 0;

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.apiService.getApplications().subscribe({
      next: (data) => {
        // Sortiere das Array, bevor es verwendet wird.
        // `new Date(b.created_at).getTime() - new Date(a.created_at).getTime()`
        // sortiert die Daten absteigend (neueste zuerst).
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        this.allApplications = data;
        this.updateGroupedApplications();
        this.calculateDueFollowUps(); 
        this.isLoading = false;
      },
      error: (err) => {
        this.notificationService.showError('Die Bewerbungen konnten nicht vom Server geladen werden.', 'Ladefehler');
        this.errorMessage = 'Fehler beim Laden der Bewerbungen.'; 
        this.isLoading = false;
        console.error(err);
      }
    });
  }
  
  private updateGroupedApplications(): void {
    this.groupedApplications = {};
    for (const status of this.statusOrder) {
      this.groupedApplications[status] = [];
    }
    for (const app of this.allApplications) {
      if (this.groupedApplications[app.status]) {
        this.groupedApplications[app.status].push(app);
      }
    }
  }

  private calculateDueFollowUps(): void {
    const dueApps = this.allApplications.filter(app => this.isFollowUpDue(app.follow_up_on));
    this.dueFollowUpsCount = dueApps.length;
  }
  
  public isFollowUpDue(dateString: string | null): boolean {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDate = new Date(dateString);
    return followUpDate <= today;
  }
}