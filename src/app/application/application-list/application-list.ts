import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Application } from '../../models/api-interfaces';
import { NotificationService } from '../../services/notification';

/**
 * Component for displaying job applications in a Kanban-style board layout.
 * 
 * This component provides a visual organization of applications by their status
 * and includes features like follow-up tracking, loading states, and error handling.
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
  // --- DEPENDENCY INJECTION ---
  private apiService = inject(Api);
  private notificationService = inject(NotificationService);

  // --- COMPONENT STATE PROPERTIES ---
  
  /** 
   * Holds the complete list of all job applications fetched from the API.
   * This array serves as the single source of truth for the component's data.
   */
  public allApplications: Application[] = [];
  
  /** 
   * Defines the specific order of status columns in the Kanban board.
   * This ensures a consistent and logical flow from left to right.
   * @readonly
   */
  public readonly statusOrder = ['DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'];
  
  /** 
   * Maps internal application status codes to user-friendly display titles.
   * Used for rendering the column headers in the Kanban board.
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
   * An object that stores applications grouped by their status.
   * Each key corresponds to a status, and its value is an array of matching applications.
   * This structure is used to render the cards in their respective Kanban columns.
   */
  public groupedApplications: { [key: string]: Application[] } = {};
  
  /** 
   * A flag indicating whether data is currently being loaded from the API.
   * Used to show or hide a loading spinner in the template.
   * @default true
   */
  public isLoading = true;
  
  /** 
   * A string to hold an error message if the API request fails.
   * Used to display a user-friendly error message in the template.
   * @default null
   */
  public errorMessage: string | null = null;
  
  /** 
   * The count of applications with follow-up dates that are due or overdue.
   * Displayed in the header to notify the user of pending actions.
   * @default 0
   */
  public dueFollowUpsCount = 0;

  /**
   * Component initialization lifecycle hook.
   * Triggers the initial loading of application data when the component is created.
   */
  ngOnInit(): void {
    this.loadApplications();
  }

  /**
   * Fetches all job applications from the API and processes them for display.
   * 
   * This is the main data loading method for the component. It handles the loading state,
   * error handling, and subsequent data transformations like sorting and grouping.
   * 
   * @remarks
   * The method performs the following operations:
   * 1. Sets the `isLoading` flag and clears any previous errors.
   * 2. Calls the API service to fetch the applications.
   * 3. On success, it sorts the applications by creation date (newest first).
   * 4. It then calls helper methods to group the data and calculate due follow-ups.
   * 5. Finally, it clears the `isLoading` flag.
   * 6. On failure, it sets an error message and shows a notification.
   */
  loadApplications(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.apiService.getApplications().subscribe({
      next: (data) => {
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        this.allApplications = data;
        this.updateGroupedApplications();
        this.calculateDueFollowUps(); 
        this.isLoading = false;
      },
      error: (err) => {
        this.notificationService.showError('Applications could not be loaded from the server.', 'Loading Error');
        this.errorMessage = 'Error loading applications.'; 
        this.isLoading = false;
        console.error('Error loading applications:', err);
      }
    });
  }
  
   /**
   * Groups the `allApplications` array into a structured object for the Kanban board.
   * 
   * This method initializes an empty array for each status defined in `statusOrder` and then
   * populates these arrays with the corresponding applications. This ensures that all
   * status columns are always rendered, even if they are empty.
   * 
   * @private
   */
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

  /**
   * Calculates the number of applications with due or overdue follow-up dates.
   * 
   * This method filters the main applications list to find items requiring
   * attention and updates the `dueFollowUpsCount` property.
   * 
   * @private
   * @see {@link isFollowUpDue} - The helper function used to check if a follow-up is due.
   */
  private calculateDueFollowUps(): void {
    const dueApps = this.allApplications.filter(app => this.isFollowUpDue(app.follow_up_on));
    this.dueFollowUpsCount = dueApps.length;
  }
  
  /**
   * Determines if a given follow-up date is due (today or in the past).
   * 
   * @param dateString - The follow-up date as an ISO formatted string, or `null`.
   * @returns `true` if the follow-up date is today or in the past, otherwise `false`.
   * 
   * @example
   * ```typescript
   * // Assuming today is 2024-01-15
   * isFollowUpDue('2024-01-15') // returns true
   * isFollowUpDue('2024-01-14') // returns true
   * isFollowUpDue(null)         // returns false
   * isFollowUpDue('2024-12-31') // returns false
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