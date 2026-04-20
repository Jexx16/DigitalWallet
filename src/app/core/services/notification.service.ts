import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
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
   * Verifica si la plataforma es nativa (Android/iOS)
   */
  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Inicializa las notificaciones push: permisos, registro y listeners
   * Solo se ejecuta en dispositivos nativos (Android/iOS)
   */
  async initPushNotifications(uid: string): Promise<void> {
    if (!uid) {
      console.warn('UID requerido para inicializar notificaciones push.');
      return;
    }

    // Validar que estemos en plataforma nativa
    if (!this.isNativePlatform()) {
      console.log('Push notifications no disponibles en navegador. Saltando inicialización.');
      return;
    }

    // Evitar reinicialización si ya está activo con el mismo UID
    if (this.activeUid === uid && this.registrationListener && this.foregroundListener) {
      console.log('Push notifications ya inicializadas para este UID.');
      return;
    }

    try {
      await this.removeListeners();
      this.activeUid = uid;

      // 1️⃣ Solicitar permisos
      const permStatus = await PushNotifications.requestPermissions();
      console.log('Push permission status:', permStatus);

      if (permStatus.receive !== 'granted') {
        this.pushNotificationSummary(
          'Notificaciones desactivadas',
          'No se concedieron permisos para notificaciones push.',
          'system'
        );
        console.warn('Permisos de notificaciones push denegados.');
        return;
      }

      // 2️⃣ Agregar listeners ANTES de registrarse
      // Listener para registro exitoso
      this.registrationListener = await PushNotifications.addListener('registration', async (token) => {
        try {
          // Validar que el token no sea null o vacío
          if (!token.value) {
            throw new Error('Token FCM vacío o nulo.');
          }
          console.log('FCM Token recibido:', token.value.substring(0, 20) + '...');
          await this.userService.updateFcmToken(uid, token.value);
        } catch (error) {
          console.error('Error al guardar FCM token:', error);
          await this.toastService.showError(this.getErrorMessage(error));
        }
      });

      // Listener para notificaciones recibidas en foreground
      this.foregroundListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        try {
          const title = notification.title || 'Nueva notificación';
          const body = notification.body || 'Tienes una nueva notificación push.';
          this.pushNotificationSummary(title, body, 'push');
          void this.toastService.show(title);
          console.log('Push notification received in foreground:', title);
        } catch (error) {
          console.error('Error al procesar notificación recibida:', error);
        }
      });

      // Listener para errores de registro
      this.registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
        try {
          const errorMsg = error.error || 'desconocido';
          console.error('Registration error:', errorMsg);
          this.pushNotificationSummary(
            'Error de notificaciones',
            `No se pudo registrar push: ${errorMsg}`,
            'system'
          );
          void this.toastService.showError(`Error registrando notificaciones: ${errorMsg}`);
        } catch (err) {
          console.error('Error manejando registration error listener:', err);
        }
      });

      // 3️⃣ Registrarse después de configurar listeners
      await PushNotifications.register();
      console.log('Push notifications registered successfully.');
    } catch (error) {
      console.error('Error inicializando push notifications:', error);
      await this.toastService.showError(this.getErrorMessage(error));
    }
  }

  /**
   * Limpia la sesión de notificaciones push
   */
  async clearPushSession(): Promise<void> {
    try {
      this.activeUid = null;
      this.notificationsSubject.next([]);
      await this.removeListeners();
      console.log('Push notifications session cleared.');
    } catch (error) {
      console.error('Error al limpiar sesión de push:', error);
    }
  }

  /**
   * Envía una notificación push al dispositivo del usuario
   * Valida token FCM antes de enviar
   */
  async sendPush(fcmToken: string, title: string, body: string): Promise<void> {
    try {
      // Validar que estemos en plataforma nativa
      if (!this.isNativePlatform()) {
        console.log('Push envío no disponible en navegador.');
        return;
      }

      // Validar FCM token no sea null, undefined o vacío
      if (!fcmToken || fcmToken.trim() === '') {
        throw new Error('FCM token no disponible o inválido para enviar notificación.');
      }

      // Validar título y cuerpo
      if (!title || !body) {
        throw new Error('Título y cuerpo son requeridos para enviar notificación.');
      }

      // Obtener JWT si no lo tenemos
      if (!this.jwtToken) {
        this.jwtToken = await this.httpService.loginNotificationService(
          environment.notificationServiceEmail,
          environment.notificationServicePassword
        );
      }

      if (!this.jwtToken) {
        throw new Error('No se pudo obtener JWT para enviar notificación.');
      }

      await this.httpService.sendPushNotification(
        this.jwtToken,
        fcmToken,
        title,
        body
      );

      this.pushNotificationSummary(title, body, 'payment');
      console.log('Push notification sent successfully.');
    } catch (error) {
      console.error('Error al enviar notificación push:', error);
      await this.toastService.showError(this.getErrorMessage(error));
      // Reintentar con nuevo token en próximo intento
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
    try {
      if (this.registrationListener) {
        await this.registrationListener.remove();
        this.registrationListener = undefined;
      }
      if (this.registrationErrorListener) {
        await this.registrationErrorListener.remove();
        this.registrationErrorListener = undefined;
      }
      if (this.foregroundListener) {
        await this.foregroundListener.remove();
        this.foregroundListener = undefined;
      }
      console.log('Push listeners removed.');
    } catch (error) {
      console.error('Error al remover listeners:', error);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Error en el módulo de notificaciones.';
  }
}
