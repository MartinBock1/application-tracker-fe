import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Api } from './api'; // Pfad ggf. anpassen

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiService = inject(Api);
  const authToken = apiService.getToken();

  // Prüfen, ob die Anfrage an unsere API geht und ein Token vorhanden ist
  if (authToken && req.url.startsWith('/api')) {
    // Die Anfrage klonen, da sie unveränderlich ist
    const authReq = req.clone({
      setHeaders: {
        // Das 'Token'-Schema ist üblich für Django REST Framework's TokenAuthentication.
        // Für JWT wäre es oft 'Bearer '.
        Authorization: `Token ${authToken}`
      }
    });
    // Die modifizierte Anfrage weiterleiten
    return next(authReq);
  }

  // Für Anfragen ohne Token (z.B. Login/Register) oder an externe URLs,
  // die ursprüngliche Anfrage unverändert weiterleiten.
  return next(req);
};
