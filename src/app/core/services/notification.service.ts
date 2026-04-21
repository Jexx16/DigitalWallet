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
      console.warn('[Notifications] UID requerido para inicializar notificaciones push.');
      return;
    }

    // Validar que estemos en plataforma nativa
    if (!this.isNativePlatform()) {
      console.log('[Notifications] ⚠️ Push notifications no disponibles en navegador. Saltando inicialización.');
      return;
    }

    // Evitar reinicialización si ya está activo con el mismo UID
    if (this.activeUid === uid && this.registrationListener && this.foregroundListener) {
      console.log('[Notifications] Push notifications ya inicializadas para este UID.');
      return;
    }

    try {
      await this.removeListeners();
      this.activeUid = uid;

      // 1️⃣ Solicitar permisos
      console.log('[Notifications] 📋 Solicitando permisos de notificaciones...');
      const permStatus = await PushNotifications.requestPermissions();
      console.log('[Notifications] Permiso:', JSON.stringify(permStatus));

      if (permStatus.receive !== 'granted') {
        this.pushNotificationSummary(
          'Notificaciones desactivadas',
          'No se concedieron permisos para notificaciones push.',
          'system'
        );
        console.warn('[Notifications] ❌ Permisos de notificaciones push denegados.');
        return;
      }

      console.log('[Notifications] ✅ Permisos concedidos.');

      // 2️⃣ Agregar listeners ANTES de registrarse
      // Listener para registro exitoso
      this.registrationListener = await PushNotifications.addListener('registration', (token) => {
        try {
          // Validar que el token no sea null o vacío
          if (!token.value) {
            console.error('[Notifications] ❌ Token FCM vacío o nulo.');
            return;
          }
          console.log('[Notifications] 🔑 FCM Token recibido:', token.value.substring(0, 30) + '...');
          console.log('[Notifications] 🔑 FCM Token completo (debug):', token.value);

          // Guardar token en Firestore - NO usar await en el callback del listener
          this.userService.updateFcmToken(uid, token.value)
            .then(() => {
              console.log('[Notifications] ✅ FCM token guardado en Firestore correctamente.');
            })
            .catch((error) => {
              console.error('[Notifications] ❌ Error al guardar FCM token en Firestore:', error);
            });
        } catch (error) {
          console.error('[Notifications] Error en registration listener:', error);
        }
      });

      // Listener para notificaciones recibidas en foreground
      this.foregroundListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        try {
          const title = notification.title || 'Nueva notificación';
          const body = notification.body || 'Tienes una nueva notificación push.';
          this.pushNotificationSummary(title, body, 'push');
          console.log('[Notifications] 📬 Push notification recibida en foreground:', title, '-', body);

          // Mostrar toast al usuario
          this.toastService.show(`${title}: ${body}`).catch((error) => {
            console.error('[Notifications] Error al mostrar toast:', error);
          });
        } catch (error) {
          console.error('[Notifications] Error al procesar notificación recibida:', error);
        }
      });

      // Listener para errores de registro
      this.registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
        try {
          const errorMsg = error.error || 'desconocido';
          console.error('[Notifications] ❌ Registration error:', errorMsg);
          this.pushNotificationSummary(
            'Error de notificaciones',
            `No se pudo registrar push: ${errorMsg}`,
            'system'
          );
        } catch (err) {
          console.error('[Notifications] Error manejando registration error listener:', err);
        }
      });

      // 3️⃣ Registrarse después de configurar listeners
      console.log('[Notifications] 📲 Registrando dispositivo para push...');
      await PushNotifications.register();
      console.log('[Notifications] ✅ Push notifications registered successfully.');

      // 4️⃣ Pre-autenticar con el servicio de notificaciones
      this.preAuthenticateNotificationService();

    } catch (error) {
      console.error('[Notifications] ❌ Error inicializando push notifications:', error);
      await this.toastService.showError(this.getErrorMessage(error));
    }
  }

  /**
   * Pre-autentica con el servicio de notificaciones para tener el JWT listo
   * cuando se necesite enviar una notificación
   */
  private preAuthenticateNotificationService(): void {
    console.log('[Notifications] 🔐 Pre-autenticando con servicio de notificaciones...');
    this.httpService.loginNotificationService(
      environment.notificationServiceEmail,
      environment.notificationServicePassword
    ).then((token) => {
      this.jwtToken = token;
      console.log('[Notifications] ✅ JWT pre-autenticado y listo para enviar notificaciones.');
    }).catch((error) => {
      console.warn('[Notifications] ⚠️ No se pudo pre-autenticar con servicio de notificaciones:', error);
      // No es crítico, se reintentará al enviar
    });
  }

  /**
   * Limpia la sesión de notificaciones push
   */
  async clearPushSession(): Promise<void> {
    try {
      this.activeUid = null;
      this.jwtToken = null;
      this.notificationsSubject.next([]);
      await this.removeListeners();
      console.log('[Notifications] Push notifications session cleared.');
    } catch (error) {
      console.error('[Notifications] Error al limpiar sesión de push:', error);
    }
  }

  /**
   * Envía una notificación push al dispositivo del usuario
   * Valida token FCM antes de enviar
   * Reintenta login si el JWT expiró
   */
  async sendPush(fcmToken: string, title: string, body: string): Promise<void> {
    console.log('[Notifications] 📤 Iniciando envío de notificación push...');

    // Validar FCM token no sea null, undefined o vacío
    if (!fcmToken || fcmToken.trim() === '') {
      console.warn('[Notifications] ⚠️ FCM token no disponible para enviar notificación. El usuario no tiene token registrado.');
      return; // No es un error crítico, solo log
    }

    // Validar título y cuerpo
    if (!title || !body) {
      console.warn('[Notifications] ⚠️ Título y cuerpo son requeridos para enviar notificación.');
      return;
    }

    try {
      // Obtener o renovar JWT si no lo tenemos
      if (!this.jwtToken) {
        console.log('[Notifications] 🔐 JWT no disponible, autenticando...');
        this.jwtToken = await this.httpService.loginNotificationService(
          environment.notificationServiceEmail,
          environment.notificationServicePassword
        );
        console.log('[Notifications] ✅ JWT obtenido.');
      }

      // Intentar enviar la notificación
      try {
        await this.httpService.sendPushNotification(
          this.jwtToken,
          fcmToken,
          title,
          body
        );
        this.pushNotificationSummary(title, body, 'payment');
        console.log('[Notifications] ✅ Push notification enviada exitosamente.');
      } catch (sendError: any) {
        // Si el error es 401/403 (token expirado), intentar re-login y reenviar
        if (sendError?.status === 401 || sendError?.status === 403) {
          console.log('[Notifications] 🔄 JWT expirado, reintentando login...');
          this.jwtToken = null;

          this.jwtToken = await this.httpService.loginNotificationService(
            environment.notificationServiceEmail,
            environment.notificationServicePassword
          );

          // Reintentar envío con nuevo token
          await this.httpService.sendPushNotification(
            this.jwtToken,
            fcmToken,
            title,
            body
          );
          this.pushNotificationSummary(title, body, 'payment');
          console.log('[Notifications] ✅ Push notification enviada exitosamente tras re-login.');
        } else {
          throw sendError; // Propagar otros errores
        }
      }
    } catch (error: any) {
      console.error('[Notifications] ❌ Error al enviar notificación push:', error);
      if (error?.status) {
        console.error('[Notifications] HTTP Status:', error.status);
        console.error('[Notifications] HTTP Error:', JSON.stringify(error.error));
      }
      // Reset del token para reintentar en próxima oportunidad
      this.jwtToken = null;
      // No relanzamos el error - la notificación es un bonus, no crítica
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
      console.log('[Notifications] Push listeners removed.');
    } catch (error) {
      console.error('[Notifications] Error al remover listeners:', error);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Error en el módulo de notificaciones.';
  }
}
