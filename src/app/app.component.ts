import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { BiometricService } from './core/services/biometric.service';
import { App } from '@capacitor/app';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  private readonly authSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private biometricService: BiometricService
  ) {
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      if (user) {
        void this.notificationService.initPushNotifications(user.uid);
        // Verificar bloqueo biométrico inicial si ya está autenticado
        void this.checkInitialLock();
        return;
      }

      void this.notificationService.clearPushSession();
    });

    this.initAppListeners();
  }

  private initAppListeners(): void {
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        await this.checkInitialLock();
      }
    });
  }

  private async checkInitialLock(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const isEnabled = this.biometricService.isBiometricEnabled();
    if (!isEnabled) return;

    try {
      console.log('[AppLock] Solicitando validación biométrica para acceso rápido...');
      await this.biometricService.performSecurePaymentValidation(0, 'Acceso a la Billetera');
    } catch (error) {
      console.error('[AppLock] Fallo en la validación biométrica:', error);
      // Si falla, podrías forzar logout o pedir PIN, pero por ahora solo logueamos
      // El requerimiento dice "opcional pero recomendado".
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}
