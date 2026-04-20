import { Injectable } from '@angular/core';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface BiometricAvailability {
  isAvailable: boolean;
  isFaceID: boolean;
  isFingerprint: boolean;
  strongBiometryIsAvailable: boolean;
  biometryType: 'facial' | 'fingerprint' | 'iris' | 'unknown';
}

@Injectable({
  providedIn: 'root'
})
export class BiometricService {

  private biometricAvailabilitySubject = new BehaviorSubject<BiometricAvailability | null>(null);
  public biometricAvailability$ = this.biometricAvailabilitySubject.asObservable();

  private biometricEnabledSubject = new BehaviorSubject<boolean>(false);
  public biometricEnabled$ = this.biometricEnabledSubject.asObservable();

  constructor() {
    this.initializeBiometric();
  }

  /**
   * Inicializa y verifica disponibilidad de biometría al cargar el servicio
   */
  private async initializeBiometric(): Promise<void> {
    try {
      const availability = await this.checkBiometricAvailability();
      this.biometricAvailabilitySubject.next(availability);
    } catch (error) {
      console.warn('No se pudo verificar biometría:', error);
      this.biometricAvailabilitySubject.next(this.getUnavailableBiometricState());
    }
  }

  /**
   * Verifica disponibilidad de biometría en el dispositivo
   */
  async checkBiometricAvailability(): Promise<BiometricAvailability> {
    if (!Capacitor.isNativePlatform()) {
      return this.getUnavailableBiometricState();
    }

    try {
      const result = await NativeBiometric.isAvailable();
      
      return {
        isAvailable: result.isAvailable || false,
        isFaceID: false, // capacitor-native-biometric no diferencia entre Face ID y huella
        isFingerprint: result.isAvailable || false,
        strongBiometryIsAvailable: result.isAvailable || false,
        biometryType: this.determineBiometryType(result)
      };
    } catch (error) {
      console.error('Error verificando disponibilidad de biometría:', error);
      return this.getUnavailableBiometricState();
    }
  }

  /**
   * Realiza validación biométrica (huella dactilar o Face ID)
   * @param reason - Razón mostrada al usuario
   * @param title - Título del diálogo
   */
  async verifyIdentity(reason: string, title: string = 'MyDigitalWallet'): Promise<boolean> {
    try {
      const availability = await this.checkBiometricAvailability();
      
      if (!availability.isAvailable) {
        throw new Error('La biometría no está disponible en este dispositivo');
      }

      await NativeBiometric.verifyIdentity({
        reason,
        title,
        subtitle: 'Validación de seguridad',
        description: 'Por favor, completa la autenticación'
      });

      return true;
    } catch (error: any) {
      console.error('Error durante validación biométrica:', error);
      
      // Si el usuario cancela, no es un error fatal
      if (error?.message?.includes('cancel') || error?.message?.includes('Cancel')) {
        throw new Error('Validación biométrica cancelada');
      }
      
      throw new Error('Error durante la validación biométrica: ' + error?.message);
    }
  }

  /**
   * Valida identidad para autorizar pagos
   * Intenta biometría primero, fallback a verificación adicional si es necesario
   */
  async validatePaymentAuthorization(amount: number, merchant: string): Promise<boolean> {
    try {
      const availability = await this.checkBiometricAvailability();
      
      if (!availability.isAvailable) {
        throw new Error('Biometría no disponible');
      }

      const biometryTypeText = availability.isFaceID ? 'Face ID' : 'huella dactilar';
      const reason = `Autoriza este pago de $${amount.toLocaleString()} a ${merchant}`;

      await this.verifyIdentity(reason, `Confirma tu ${biometryTypeText}`);
      return true;

    } catch (error) {
      console.error('Error validando pago:', error);
      throw error;
    }
  }

  /**
   * Realiza doble validación de seguridad:
   * 1. Biometría
   * 2. Segunda confirmación opcional (en futuras versiones)
   */
  async performSecurePaymentValidation(amount: number, merchant: string): Promise<boolean> {
    try {
      // Primera validación: biometría
      const biometricSuccess = await this.validatePaymentAuthorization(amount, merchant);
      
      if (!biometricSuccess) {
        throw new Error('Validación biométrica fallida');
      }

      // Potencial segunda validación (se puede expandir)
      // Ej: PIN del dispositivo, pregunta de seguridad, etc.

      return true;
    } catch (error) {
      console.error('Error en validación segura de pago:', error);
      throw error;
    }
  }

  /**
   * Obtiene el tipo de biometría disponible como string legible
   */
  getBiometryTypeLabel(biometryType: string): string {
    switch (biometryType.toLowerCase()) {
      case 'facial':
      case 'faceid':
        return 'Face ID';
      case 'fingerprint':
        return 'Huella Dactilar';
      case 'iris':
        return 'Reconocimiento de Iris';
      default:
        return 'Biometría';
    }
  }

  /**
   * Actualiza el estado de biometría habilitada
   */
  setBiometricEnabled(enabled: boolean): void {
    this.biometricEnabledSubject.next(enabled);
  }

  /**
   * Obtiene el estado actual de biometría habilitada
   */
  isBiometricEnabled(): Observable<boolean> {
    return this.biometricEnabledSubject.asObservable();
  }

  /**
   * Valida si la app está corriendo en dispositivo nativo
   */
  isNativeDevice(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Determina el tipo de biometría disponible
   */
  private determineBiometryType(result: any): 'facial' | 'fingerprint' | 'iris' | 'unknown' {
    if (result.isAvailable) {
      // capacitor-native-biometric no especifica el tipo, asumimos huella
      return 'fingerprint';
    }
    return 'unknown';
  }

  private getUnavailableBiometricState(): BiometricAvailability {
    return {
      isAvailable: false,
      isFaceID: false,
      isFingerprint: false,
      strongBiometryIsAvailable: false,
      biometryType: 'unknown'
    };
  }
}
