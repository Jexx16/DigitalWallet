import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { PluginListenerHandle } from '@capacitor/core';
import { HttpService } from './http.service';
import { UserService } from './user.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private jwtToken: string | null = null;
  private activeUid: string | null = null;
  private registrationListener?: PluginListenerHandle;
  private registrationErrorListener?: PluginListenerHandle;
  private foregroundListener?: PluginListenerHandle;

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
        void this.toastService.show(
          notification.title || 'Nueva notificación'
        );
      });

      this.registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
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
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
      // Reintentar con nuevo token
      this.jwtToken = null;
    }
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
