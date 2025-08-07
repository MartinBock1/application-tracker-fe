import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Api } from './services/api';
import { Company } from './models/api-interfaces';
import { FooterComponent } from './shared/footer/footer';

/**
 * Root application component for the Job Application Tracker.
 * 
 * This component serves as the main shell of the application, providing:
 * - Navigation structure with responsive mobile menu
 * - User authentication state management
 * - Initial data loading for companies
 * - Logout functionality
 * 
 * @example
 * ```html
 * <app-root></app-root>
 * ```
 * 
 * @remarks
 * The component uses Angular signals for reactive state management and
 * implements OnInit for initial data loading. It integrates with the
 * API service for data operations and Router for navigation.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FooterComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  // --- COMPONENT STATE PROPERTIES ---
  
  /** 
   * Application title signal.
   * @readonly
   */
  protected readonly title = signal('application-tracker-fe');
  
  /** 
   * List of companies loaded from the API.
   * Used for dropdown selections throughout the application.
   * @default []
   */
  companies: Company[] = [];
  
  /** 
   * Signal controlling the mobile menu open/closed state.
   * Used for responsive navigation on smaller screens.
   * @default false
   */
  isMenuOpen = signal(false);

  // --- DEPENDENCY INJECTION ---
  
  /** API service for data operations and authentication */
  public apiService = inject(Api);
  
  /** Router service for programmatic navigation */
  private router = inject(Router);

  /**
   * Component initialization lifecycle hook.
   * 
   * Loads initial data required by the application, specifically the list of companies
   * that will be used in dropdown selections throughout the app.
   * 
   * @remarks
   * This method is called once after the component is initialized and is ideal
   * for loading data that needs to be available application-wide.
   * 
   * @throws Will log error to console if companies loading fails
   */
  ngOnInit(): void {
    // Load companies for global use in dropdowns and selectors
    this.apiService.getCompanies().subscribe({
      next: (data) => {
        this.companies = data;
        console.log('Companies successfully loaded:', this.companies);
      },
      error: (err) => {
        console.error('Error loading companies:', err);
      }
    });
  }

  /**
   * Toggles the mobile navigation menu open/closed state.
   * 
   * Uses Angular signals to reactively update the menu visibility.
   * This method is typically called from a hamburger menu button in the template.
   * 
   * @example
   * ```html
   * <button (click)="toggleMenu()">☰</button>
   * ```
   */
  toggleMenu(): void {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  /**
   * Closes the mobile navigation menu.
   * 
   * Sets the menu state to closed, typically called when a navigation
   * link is clicked or when clicking outside the menu area.
   * 
   * @example
   * ```html
   * <nav (click)="closeMenu()">
   *   <a routerLink="/applications">Applications</a>
   * </nav>
   * ```
   */
  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  /**
   * Logs out the current user and navigates to the login page.
   * 
   * This method performs a complete logout process:
   * 1. Calls the API service to clear authentication tokens
   * 2. Navigates to the login page
   * 3. Closes the mobile menu if open
   * 4. Logs the action for debugging
   * 
   * @example
   * ```html
   * <button (click)="logout()">Logout</button>
   * ```
   * 
   * @see {@link Api.logout} - Clears authentication tokens from storage
   */
  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
    this.closeMenu();
    console.log('Successfully logged out.');
  }
}
