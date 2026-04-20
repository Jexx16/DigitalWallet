# 🔐 Guía de Implementación: Biometría Completa

## Resumen

Se ha implementado un sistema completo de validación biométrica para pagos seguros. Este documento explica cómo integrar esta funcionalidad en tus páginas.

---

## 📦 Servicios Disponibles

### 1. **BiometricService**
Servicio especializado para validación biométrica.

**Ubicación**: `src/app/core/services/biometric.service.ts`

**Métodos principales**:

```typescript
// Verificar disponibilidad
await biometricService.checkBiometricAvailability(): Promise<BiometricAvailability>

// Validar identidad (básico)
await biometricService.verifyIdentity(reason: string, title: string): Promise<boolean>

// Validar pago con biometría
await biometricService.validatePaymentAuthorization(amount: number, merchant: string): Promise<boolean>

// Doble validación de seguridad
await biometricService.performSecurePaymentValidation(amount: number, merchant: string): Promise<boolean>

// Estado
biometricService.biometricAvailability$: Observable<BiometricAvailability>
```

### 2. **PaymentService** (Mejorado)
Procesa pagos con validación biométrica integrada.

**Métodos**:

```typescript
// Procesar pago con biometría
await paymentService.processPayment(
  uid: string,
  paymentRequest: PaymentRequest,
  biometricEnabled: boolean,
  requireBiometric: boolean
): Promise<PaymentResult>

// Validar pago antes de procesar
await paymentService.validatePayment(paymentRequest: PaymentRequest): Promise<{ valid: boolean; error?: string }>
```

### 3. **ModalService** (Mejorado)
Facilita abrir el modal de confirmación de pago.

```typescript
// Abrir modal de confirmación
const result = await modalService.openPaymentConfirmation(
  paymentRequest: PaymentRequest,
  userId: string,
  biometricEnabled: boolean
): Promise<PaymentResult | null>
```

---

## 🎯 Ejemplo de Uso Completo

### En una página (ej: payment.page.ts)

```typescript
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService, PaymentRequest } from '../../core/services/payment.service';
import { ModalService } from '../../core/services/modal.service';
import { BiometricService } from '../../core/services/biometric.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss']
})
export class PaymentPage implements OnInit {

  userId!: string;
  biometricEnabled = false;
  selectedCard: string = '';
  amount: number = 0;
  merchant: string = '';

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private modalService: ModalService,
    private biometricService: BiometricService,
    private toastService: ToastService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.userId = this.authService.getCurrentUid() || '';
    this.checkBiometricStatus();
  }

  /**
   * Verifica si el usuario tiene biometría habilitada
   */
  private async checkBiometricStatus(): Promise<void> {
    try {
      const availability = await this.biometricService.checkBiometricAvailability();
      this.biometricEnabled = availability.isAvailable;
    } catch (error) {
      console.warn('Biometría no disponible:', error);
      this.biometricEnabled = false;
    }
  }

  /**
   * Inicia el proceso de pago
   */
  async initiatePayment(): Promise<void> {
    try {
      this.loadingService.show('Preparando pago...');

      // Crear objeto de solicitud
      const paymentRequest: PaymentRequest = {
        cardId: this.selectedCard,
        merchant: this.merchant,
        amount: this.amount,
        description: 'Compra en tienda'
      };

      // Validar antes de procesar
      const validation = await this.paymentService.validatePayment(paymentRequest);
      if (!validation.valid) {
        this.toastService.showError(validation.error || 'Validación fallida');
        return;
      }

      this.loadingService.hide();

      // Abrir modal de confirmación con biometría
      const result = await this.modalService.openPaymentConfirmation(
        paymentRequest,
        this.userId,
        this.biometricEnabled
      );

      if (result?.success) {
        this.toastService.showSuccess('¡Pago realizado exitosamente!');
        // Redirigir a home o historial
        // this.router.navigate(['/home']);
      } else if (result?.error) {
        this.toastService.showError(result.error);
      } else {
        this.toastService.showInfo('Pago cancelado');
      }

    } catch (error: any) {
      this.loadingService.hide();
      this.toastService.showError(error?.message || 'Error procesando pago');
      console.error('Error:', error);
    }
  }

  /**
   * Habilitar biometría si aún no está activa
   */
  async enableBiometric(): Promise<void> {
    try {
      const availability = await this.biometricService.checkBiometricAvailability();
      
      if (!availability.isAvailable) {
        this.toastService.showError('Biometría no disponible en este dispositivo');
        return;
      }

      // Aquí se usaría el AuthService para habilitar biometría
      // await this.authService.enableBiometric(password);
      
      this.toastService.showSuccess('Biometría habilitada correctamente');
      this.biometricEnabled = true;

    } catch (error: any) {
      this.toastService.showError(error?.message || 'Error habilitando biometría');
    }
  }
}
```

### En el template (payment.page.html)

```html
<ion-header>
  <ion-toolbar color="primary">
    <ion-title>Realizar Pago</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <form>
    <!-- Selector de Tarjeta -->
    <ion-item>
      <ion-label position="stacked">Tarjeta</ion-label>
      <ion-select [(ngModel)]="selectedCard" name="card">
        <ion-select-option value="card-1">Visa 1234</ion-select-option>
        <ion-select-option value="card-2">Mastercard 5678</ion-select-option>
      </ion-select>
    </ion-item>

    <!-- Comercio -->
    <ion-item>
      <ion-label position="stacked">Comercio</ion-label>
      <ion-input 
        [(ngModel)]="merchant" 
        name="merchant"
        placeholder="Nombre del comercio">
      </ion-input>
    </ion-item>

    <!-- Monto -->
    <ion-item>
      <ion-label position="stacked">Monto ($)</ion-label>
      <ion-input 
        [(ngModel)]="amount" 
        name="amount"
        type="number"
        placeholder="0">
      </ion-input>
    </ion-item>

    <!-- Status de Biometría -->
    <ion-card *ngIf="biometricEnabled" color="success">
      <ion-card-content>
        <ion-icon name="shield-checkmark"></ion-icon>
        <span>Biometría activa - Tu pago será protegido</span>
      </ion-card-content>
    </ion-card>

    <ion-card *ngIf="!biometricEnabled" color="warning">
      <ion-card-content>
        <ion-icon name="alert-circle"></ion-icon>
        <span>Habilita biometría para pagos más seguros</span>
        <ion-button size="small" (click)="enableBiometric()">
          Habilitar
        </ion-button>
      </ion-card-content>
    </ion-card>

    <!-- Botón Procesar -->
    <ion-button 
      expand="block" 
      color="primary"
      size="large"
      (click)="initiatePayment()"
      class="ion-margin-top">
      <ion-icon name="card"></ion-icon>
      Procesar Pago
    </ion-button>
  </form>
</ion-content>
```

---

## 🔄 Flujo de Operación

```
Usuario hace clic en "Procesar Pago"
    ↓
[paymentPage] validaPayment()
    ↓
modalService.openPaymentConfirmation()
    ↓
[Modal] Muestra resumen y opciones
    ↓
Usuario selecciona "Autorizar con Biometría"
    ↓
biometricService.performSecurePaymentValidation()
    ↓
¿Biometría disponible?
  SI  → Muestra diálogo de biometría
        ↓
        ¿Usuario valida?
        SI  → paymentService.processPayment() → Firestore
        NO  → Muestra error
  NO  → Opción de procesar sin biometría
```

---

## ⚙️ Configuración Requerida

### 1. **Modelos/Types**

Asegúrate de que tu modelo `UserProfile` tenga:

```typescript
export interface UserProfile {
  uid: string;
  email: string;
  biometricEnabled: boolean;  // ← IMPORTANTE
  // ... otros campos
}
```

### 2. **Firestore Security Rules**

Asegúrate de que las transacciones estén protegidas:

```typescript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/transactions/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### 3. **Capacitor Config** (capacitor.config.ts)

Verifica que los plugins estén configurados:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mydigitalwallet.app',
  appName: 'MyDigitalWallet',
  webDir: 'www',
  plugins: {
    NativeBiometric: {
      iosBiometricReason: 'MyDigitalWallet - Validación de identidad'
    }
  }
};

export const config = config;
```

---

## 🧪 Testing Local

### En dispositivo Android:

```bash
# 1. Build
ionic build

# 2. Agregar Android
ionic capacitor add android

# 3. Sync
ionic capacitor sync android

# 4. Abrir y compilar
ionic capacitor open android

# 5. Ejecutar en emulador con biometría
# En Android Studio, usa el emulador con Google Play Services
```

### En emulador con biometría:

Android Studio permite simular huella dactilar:
- Menu → Extended Controls → Finger
- Simula el toque biométrico

---

## 🐛 Troubleshooting

### "La biometría no está disponible"

**Causa**: El dispositivo no tiene capacidad biométrica activada.

**Solución**:
- Usar emulador con Google Play Services
- Probar en dispositivo real
- Fallback a validación sin biometría

```typescript
if (!availability.isAvailable) {
  // Procesar sin biometría
  await paymentService.processPayment(uid, paymentRequest, false, false);
}
```

### "Error: Credenciales inválidas"

**Causa**: Las credenciales no se guardaron correctamente en biometría.

**Solución**:
```typescript
// Primero, habilitar biometría correctamente
await authService.enableBiometric(userPassword);

// Luego, usar en pagos
await biometricService.validatePaymentAuthorization(amount, merchant);
```

---

## 📚 Referencias

- [Capacitor Native Biometric](https://github.com/epicshaggy/capacitor-native-biometric)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Ionic Security](https://ionicframework.com/docs/guides/security)

---

**Última actualización**: 19 de Abril, 2026
