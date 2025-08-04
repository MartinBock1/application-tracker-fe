import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastr = inject(ToastrService);

  showSuccess(message: string, title: string = 'Erfolgreich') {
    this.toastr.success(message, title);
  }

  showError(message: string, title: string = 'Fehler') {
    this.toastr.error(message, title);
  }

  showInfo(message: string, title: string = 'Info') {
    this.toastr.info(message, title);
  }

  showWarning(message: string, title: string = 'Warnung') {
    this.toastr.warning(message, title);
  }
}
