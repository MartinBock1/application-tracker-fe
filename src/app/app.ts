import { Component, signal, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Api } from './services/api';
import { Company } from './models/api-interfaces';
import { FooterComponent } from './shared/footer/footer';
import { Subscription } from 'rxjs';

/**
 * Root application component for the Job Application Tracker.
 * 
 * This component serves as the main shell of the application, providing:
 * - Navigation structure with a responsive mobile menu.
 * - User authentication state management.
 * - Initial loading of global data like companies.
 * - Logout functionality.
 * 
 * @example
 * ```html
 * <app-root></app-root>
 * ```
 * 
 * @remarks
 * The component uses Angular signals for reactive state management of the UI.
 * It implements OnInit and OnDestroy for managing subscriptions and side effects.
 * It integrates with the Api service for data operations and the Router for navigation.
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
export class App implements OnInit, OnDestroy {
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
   * Holds the subscription to the authentication state observable.
   * This is used to clean up the subscription when the component is destroyed, preventing memory leaks.
   * @private
   */
  private authSubscription: Subscription | undefined;
  
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
   * Subscribes to the authentication state. When the user logs in, it loads
   * global data required by the application, such as the list of companies.
   * 
   * @remarks
   * This method sets up a reactive flow: the list of companies is automatically
   * loaded upon login and cleared upon logout, ensuring data is only fetched
   * for authenticated users.
   */
  ngOnInit(): void {
     this.authSubscription = this.apiService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.loadCompanies();
      } else {
        this.companies = [];
      }
    });
  }

  /**
   * Fetches the list of companies from the API.
   * 
   * This private method is called when the user is authenticated.
   * It populates the `companies` array on success and logs an error on failure.
   * @private
   */
  private loadCompanies(): void {
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
   * Toggles the mobile navigation menu's open/closed state.
   * 
   * Uses an Angular signal to reactively update the menu's visibility.
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
   * Sets the menu state to closed. This is typically called when a navigation
   * link is clicked or when the user clicks outside the menu area.
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
   * Component destruction lifecycle hook.
   * 
   * Cleans up subscriptions to prevent memory leaks when the component
   * is removed from the DOM.
   */
  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  /**
   * Logs out the current user and navigates to the login page.
   * 
   * This method performs a complete logout process:
   * 1. Calls the API service to clear authentication tokens.
   * 2. Navigates the user to the login page.
   * 3. Closes the mobile menu if it is open.
   * 
   * @example
   * ```html
   * <button (click)="logout()">Logout</button>
   * ```
   * 
   * @see {@link Api.logout} - The service method that clears authentication tokens.
   */
  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
    this.closeMenu();
    console.log('Successfully logged out.');
  }
}
