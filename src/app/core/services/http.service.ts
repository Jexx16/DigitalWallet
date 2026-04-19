import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  private readonly NOTIFICATION_BASE =
    'https://sendnotificationfirebase-production.up.railway.app';

  constructor(private http: HttpClient) {}

  /**
   * POST /user/login → retorna JWT del servicio de notificaciones
   */
  async loginNotificationService(email: string, password: string): Promise<string> {
    const body = { email, password };
    const response = await firstValueFrom(
      this.http.post<any>(`${this.NOTIFICATION_BASE}/user/login`, body)
    );
    return response.token || response.access_token;
  }

  /**
   * POST /notifications/ con Authorization header
   * Envía la notificación push a través del backend de Railway
   */
  async sendPushNotification(
    jwtToken: string,
    fcmToken: string,
    title: string,
    body: string
  ): Promise<void> {
    const headers = new HttpHeaders({
      'Authorization': jwtToken,
      'Content-Type': 'application/json'
    });

    const payload = {
      token: fcmToken,
      notification: { title, body },
      android: { priority: 'high', data: {} }
    };

    await firstValueFrom(
      this.http.post(`${this.NOTIFICATION_BASE}/notifications/`, payload, { headers })
    );
  }
}
