import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { PluginListenerHandle } from '@capacitor/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpService } from './http.service';
import { UserService } from './user.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

export interface NotificationSummary {
  id: string;
  title: string;
  body: string;
  source: 'push' | 'payment' | 'system';
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private jwtToken: string | null = null;
  private activeUid: string | null = null;
  private registrationListener?: PluginListenerHandle;
  private registrationErrorListener?: PluginListenerHandle;
  private foregroundListener?: PluginListenerHandle;
  private readonly notificationsSubject = new BehaviorSubject<NotificationSummary[]>([]);
  public readonly notifications$: Observable<NotificationSummary[]> = this.notificationsSubject.asObservable();

  constructor(
    private httpService: HttpService,
    private userService: UserService,
    private toastService: ToastService
  ) {}

  /**
   * Inicializa las notificaciones push: permisos, registro y listeners
   */
  async initPushNotifications(uid: string): Promise<void> {
    if (!uid) {
      throw new Error('UID requerido para inicializar notificaciones push.');
    }

    if (this.activeUid === uid && this.registrationListener && this.foregroundListener) {
      return;
    }

    try {
      await this.removeListeners();
      this.activeUid = uid;

      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive !== 'granted') {
        this.pushNotificationSummary(
          'Notificaciones desactivadas',
          'No se concedieron permisos para notificaciones push.',
          'system'
        );
        await this.toastService.showError('Permiso de notificaciones denegado.');
        return;
      }

      this.registrationListener = await PushNotifications.addListener('registration', async (token) => {
        try {
          await this.userService.updateFcmToken(uid, token.value);
        } catch (error) {
          await this.toastService.showError(this.getErrorMessage(error));
        }
      });

      this.foregroundListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        this.pushNotificationSummary(
          notification.title || 'Nueva notificación',
          notification.body || 'Tienes una nueva notificación push.',
          'push'
        );
        void this.toastService.show(
          notification.title || 'Nueva notificación'
        );
      });

      this.registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
        this.pushNotificationSummary(
          'Error de notificaciones',
          `No se pudo registrar push: ${error.error || 'desconocido'}`,
          'system'
        );
        void this.toastService.showError(
          `Error registrando notificaciones: ${error.error || 'desconocido'}`
        );
      });

      await PushNotifications.register();
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    }
  }

  async clearPushSession(): Promise<void> {
    this.activeUid = null;
    this.notificationsSubject.next([]);
    await this.removeListeners();
  }

  /**
   * Envía una notificación push al dispositivo del usuario
   */
  async sendPush(fcmToken: string, title: string, body: string): Promise<void> {
    try {
      if (!fcmToken) {
        throw new Error('FCM token no disponible para enviar notificación.');
      }

      // Obtener JWT si no lo tenemos
      if (!this.jwtToken) {
        this.jwtToken = await this.httpService.loginNotificationService(
          environment.notificationServiceEmail,
          environment.notificationServicePassword
        );
      }

      await this.httpService.sendPushNotification(
        this.jwtToken,
        fcmToken,
        title,
        body
      );

      this.pushNotificationSummary(title, body, 'payment');
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
      // Reintentar con nuevo token
      this.jwtToken = null;
    }
  }

  getRecentNotifications(limitCount: number = 10): NotificationSummary[] {
    return this.notificationsSubject.value.slice(0, limitCount);
  }

  private pushNotificationSummary(
    title: string,
    body: string,
    source: NotificationSummary['source']
  ): void {
    const item: NotificationSummary = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      title: title.trim() || 'Notificación',
      body: body.trim() || 'Sin detalles',
      source,
      createdAt: new Date()
    };

    const updated = [item, ...this.notificationsSubject.value].slice(0, 25);
    this.notificationsSubject.next(updated);
  }

  private async removeListeners(): Promise<void> {
    await this.registrationListener?.remove();
    await this.registrationErrorListener?.remove();
    await this.foregroundListener?.remove();
    this.registrationListener = undefined;
    this.registrationErrorListener = undefined;
    this.foregroundListener = undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Error en el módulo de notificaciones.';
  }
}
