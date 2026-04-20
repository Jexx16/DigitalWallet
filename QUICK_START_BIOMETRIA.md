# ⚡ QUICK START: BIOMETRÍA EN 5 MINUTOS

## 1️⃣ Inyectar Servicios

```typescript
import { Component } from '@angular/core';
import { ModalService } from '../../core/services/modal.service';
import { AuthService } from '../../core/services/auth.service';

@Component({...})
export class YourPage {
  constructor(
    private modalService: ModalService,
    private authService: AuthService
  ) {}
}
```

## 2️⃣ Crear Solicitud de Pago

```typescript
const payment = {
  cardId: 'tu-id-tarjeta',
  merchant: 'Starbucks',
  amount: 15000,
  description: 'Café'
};
```

## 3️⃣ Abrir Modal con Biometría

```typescript
async handlePayment() {
  const result = await this.modalService.openPaymentConfirmation(
    payment,
    this.authService.getCurrentUid(),
    true  // biometría habilitada
  );
  
  if (result?.success) {
    console.log('✅ Pago exitoso!', result.transactionId);
  } else {
    console.log('❌ Error:', result?.error);
  }
}
```

## 4️⃣ Listo! 🎉

El modal:
- ✅ Detecta biometría automáticamente
- ✅ Valida el pago
- ✅ Solicita huella/Face ID
- ✅ Guarda en Firestore
- ✅ Muestra resultado

---

## 📱 En HTML

```html
<ion-button (click)="handlePayment()" expand="block" color="primary">
  <ion-icon name="card"></ion-icon>
  Pagar con Biometría
</ion-button>
```

---

## 🔧 Si necesitas más control:

```typescript
import { BiometricService, PaymentRequest } from '../../core/services/...';

constructor(
  private biometricService: BiometricService,
  private paymentService: PaymentService
) {}

// Verificar biometría disponible
const available = await this.biometricService.checkBiometricAvailability();
if (available.isAvailable) {
  console.log('Tipo:', available.biometryType); // 'facial' o 'fingerprint'
}

// Procesar directamente (sin modal)
const result = await this.paymentService.processPayment(
  userId,
  paymentRequest,
  true,  // biometría habilitada
  true   // requerir biometría
);
```

---

## 📚 Documentación Completa

- `BIOMETRIA_GUIA_IMPLEMENTACION.md` - Guía técnica
- `BIOMETRIA_IMPLEMENTACION_RESUMEN.md` - Detalles

---

**¡Eso es todo! Tu app ahora tiene pagos seguros con biometría.** 🔐
