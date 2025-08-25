# 🚀 Job Application Tracker - Frontend

This is the official Angular frontend for the Job Application Tracker API. It provides a modern, responsive, and feature-rich single-page application for managing the entire job application lifecycle.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.0.

## 🔗 Backend API

This frontend is designed to work with its corresponding Django REST Framework backend. The backend is required for all functionality, including authentication and data management.

*   **Backend Repository**: [https://github.com/MartinBock1/Job-Application-Tracker.git](https://github.com/MartinBock1/Job-Application-Tracker.git)

To set up the backend, please follow the instructions in its repository.

## ✨ Key Features

*   **Kanban Board Overview**: Visually track all job applications across different stages (Draft, Applied, Interview, Offer, Rejected) in an intuitive Kanban-style board.
*   **Comprehensive Application Form**: A single, powerful form handles both creating new applications and editing existing ones.
*   **Full CRUD for Related Data**:
    *   **Companies**: View and edit company details directly within the application form.
    *   **Contacts**: Create, view, update, and **delete** contact persons associated with an application without leaving the page.
    *   **Notes**: Dynamically add, edit, and remove notes for any application.
*   **Dynamic UI**: The user interface adapts based on application status, for example, by showing relevant date fields only when needed (e.g., "Interview Date" only appears for applications with the "Interview" status).
*   **User-Friendly Notifications**: Provides clear, non-intrusive feedback for all actions (success, error, warnings) via a dedicated notification service.
*   **Responsive Design**: A clean and modern UI that works seamlessly on both desktop and mobile devices.

## 💡 Technical Highlights & Architecture

This project demonstrates several advanced concepts and best practices in modern Angular development:

*   **Robust State Management in Components**: The application form implements a "destroy and recreate" strategy (`createForm()`). Every time an application is loaded for editing, the `FormGroup` is completely rebuilt. This is a crucial and robust pattern that **guarantees a clean state** and prevents "stale state" or "ghost data" from leaking between different application views.
*   **Complex API Orchestration with RxJS**:
    *   **`switchMap`**: Used for dependent, sequential operations. For example, when creating a new contact, the application first waits for the `createContact` API call to complete and return the new contact's ID. This ID is then used in the subsequent `updateApplication` call to correctly link the two records.
    *   **`forkJoin`**: Used to run multiple independent API calls in parallel for maximum efficiency, such as updating the application, company, and contact details simultaneously when no new records are being created.
*   **Advanced Angular Reactive Forms**:
    *   **Nested `FormGroup`s**: The form is structured with nested groups (`details.company`, `details.contact`) for clean data organization.
    *   **`FormArray`**: Dynamically manages an array of notes, allowing users to add or remove them on the fly.
    *   **Custom Validators**: Implements a custom validator (`contactRequiredValidator`) to enforce complex business rules, such as requiring both a first and last name if a user begins to fill out the contact section.
*   **Service-Based Architecture**: A clear separation of concerns is maintained by using dedicated services for API communication (`ApiService`) and user notifications (`NotificationService`), making the code modular and easier to maintain.

## ⚙️ Setup & Installation

Follow these steps to set up and run the project locally.

#### 1. Prerequisites
*   Node.js (LTS version recommended)
*   Angular CLI (`npm install -g @angular/cli`)
*   A running instance of the [backend API](https://github.com/MartinBock1/Job-Application-Tracker.git).

#### 2. Clone the Project
```bash
git clone https://github.com/MartinBock1/application-tracker-fe.git
cd application-tracker-fe
```

#### 3. Install Dependencies
```bash
npm install
```

#### 4. Run the Development Server
```bash
ng serve -o
```
This will start the local development server and automatically open your browser to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## 🛠️ Angular CLI Commands

#### Code Scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:
```bash
ng generate component component-name
```
You can also generate `directives`, `pipes`, `services`, `classes`, `guards`, `interfaces`, `enums`, and `modules`.

#### Building the Project

To create a production-ready build of the project, run:
```bash
ng build
```
This will compile your project and store the optimized build artifacts in the `dist/` directory.
