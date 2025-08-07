import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Application } from '../../models/api-interfaces';
import { NotificationService } from '../../services/notification';

/**
 * Component for displaying job applications in a Kanban-style board layout.
 * 
 * This component provides a visual organization of applications by status with follow-up tracking.
 * Features include loading states, error handling, and due follow-up notifications.
 * 
 * @example
 * ```html
 * <app-application-list></app-application-list>
 * ```
 */
@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './application-list.html',
  styleUrl: './application-list.scss'
})
export class ApplicationList implements OnInit {
  // Dependency injection using Angular's inject function
  private apiService = inject(Api);
  private notificationService = inject(NotificationService);

  // --- PROPERTIES FOR KANBAN BOARD FUNCTIONALITY ---
  
  /** 
   * Complete list of all job applications from the API.
   * Sorted by creation date (newest first) for consistent display ordering.
   */
  public allApplications: Application[] = [];
  
  /** 
   * Defines the order of status columns in the Kanban board.
   * This order determines the visual flow from left to right.
   * @readonly
   */
  public readonly statusOrder = ['DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'];
  
  /** 
   * Maps application status codes to user-friendly German display titles.
   * Used for column headers in the Kanban board.
   * @readonly
   */
  public readonly statusTitleMap: { [key: string]: string } = {
    DRAFT: 'Entwürfe',
    APPLIED: 'Beworben',
    INTERVIEW: 'Interview',
    OFFER: 'Angebote',
    REJECTED: 'Abgelehnt'
  };
  
  /** 
   * Applications organized by status for Kanban board display.
   * Each key corresponds to a status, with an array of matching applications.
   */
  public groupedApplications: { [key: string]: Application[] } = {};
  
  /** 
   * Flag indicating whether data is currently being loaded from the API.
   * @default true
   */
  public isLoading = true;
  
  /** 
   * Error message to display if API request fails.
   * @default null
   */
  public errorMessage: string | null = null;
  
  /** 
   * Count of applications with follow-up dates that are due or overdue.
   * @default 0
   */
  public dueFollowUpsCount = 0;

  /**
   * Component initialization lifecycle hook.
   * Triggers the initial loading of applications data.
   */
  ngOnInit(): void {
    this.loadApplications();
  }

  /**
   * Loads all job applications from the API and processes them for display.
   * 
   * This method handles loading state management, error handling, and data transformation.
   * Applications are sorted by creation date (newest first) for consistent ordering.
   * 
   * @remarks
   * The method performs the following operations:
   * 1. Sets loading state and clears previous errors
   * 2. Fetches applications from API
   * 3. Sorts applications by creation date (descending)
   * 4. Groups applications by status
   * 5. Calculates due follow-ups count
   * 6. Updates loading state
   * 
   * @throws Will display error notification and set errorMessage if API call fails
   */
  loadApplications(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.apiService.getApplications().subscribe({
      next: (data) => {
        // Sort array before using it for consistent display order
        // `new Date(b.created_at).getTime() - new Date(a.created_at).getTime()`
        // sorts data in descending order (newest first)
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
        console.error('Error loading applications:', err);
      }
    });
  }
  
  /**
   * Groups applications by their status for Kanban board display.
   * 
   * Initializes empty arrays for each status defined in statusOrder and populates
   * them with matching applications. This ensures all status columns are present
   * even if they contain no applications.
   * 
   * @private
   * @remarks
   * This method is called after loading applications to organize them into
   * the Kanban board structure. Applications with unknown statuses are ignored.
   */
  private updateGroupedApplications(): void {
    this.groupedApplications = {};
    
    // Initialize empty arrays for each status column
    for (const status of this.statusOrder) {
      this.groupedApplications[status] = [];
    }
    
    // Distribute applications into their respective status groups
    for (const app of this.allApplications) {
      if (this.groupedApplications[app.status]) {
        this.groupedApplications[app.status].push(app);
      }
    }
  }

  /**
   * Calculates the number of applications with due or overdue follow-up dates.
   * 
   * Filters all applications to find those with follow-up dates that are due
   * or overdue and updates the dueFollowUpsCount property for header notification display.
   * 
   * @private
   * @see {@link isFollowUpDue} - Used to determine if a follow-up is due
   */
  private calculateDueFollowUps(): void {
    const dueApps = this.allApplications.filter(app => this.isFollowUpDue(app.follow_up_on));
    this.dueFollowUpsCount = dueApps.length;
  }
  
  /**
   * Determines if a follow-up date is due or overdue.
   * 
   * Compares the given date string with today's date (time normalized to midnight)
   * to determine if a follow-up action is required.
   * 
   * @param dateString - The follow-up date string in ISO format, or null if no follow-up is set
   * @returns True if the follow-up date is today or in the past, false otherwise
   * 
   * @example
   * ```typescript
   * // Follow-up is due today
   * isFollowUpDue('2024-01-15') // returns true if today is 2024-01-15 or later
   * 
   * // No follow-up set
   * isFollowUpDue(null) // returns false
   * 
   * // Future follow-up
   * isFollowUpDue('2024-12-31') // returns false if today is before 2024-12-31
   * ```
   */
  public isFollowUpDue(dateString: string | null): boolean {
    if (!dateString) return false;
    
    // Get today's date with time set to midnight for accurate comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const followUpDate = new Date(dateString);
    return followUpDate <= today;
  }
}