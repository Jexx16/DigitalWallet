import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { faker } from '@faker-js/faker';

@Component({
  selector: 'app-payment-simulator',
  standalone: false,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="transparent">
        <ion-title>Confirmar pago</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="simulator-container">
        <div class="merchant-icon">
          <ion-icon name="storefront-outline"></ion-icon>
        </div>
        
        <h2 class="merchant-name">{{ merchantName }}</h2>
        <p class="merchant-category">{{ merchantCategory }}</p>

        <div class="amount-display">
          <span class="currency">$</span>
          <span class="amount">{{ amount | number:'1.0-0' }}</span>
        </div>

        <div class="payment-details card-glass">
          <div class="detail-row">
            <span>Tarjeta</span>
            <span class="detail-value">•••• •••• •••• {{ cardLastFour }}</span>
          </div>
          <div class="detail-row">
            <span>Comercio</span>
            <span class="detail-value">{{ merchantName }}</span>
          </div>
          <div class="detail-row">
            <span>Fecha</span>
            <span class="detail-value">{{ getCurrentDate() }}</span>
          </div>
          <div class="detail-row">
            <span>Estado</span>
            <span class="detail-value detail-success">Pendiente de biometría</span>
          </div>
        </div>

        <button class="confirm-btn block-btn" (click)="confirm()">
          <ion-icon name="finger-print-outline"></ion-icon>
          Autorizar con biometría
        </button>
        
        <button class="generate-btn" (click)="generateNewRandomData()">
          <ion-icon name="refresh-outline"></ion-icon>
          Generar otros datos
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--color-bg-dark);
    }

    .simulator-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 20px;
    }

    .merchant-icon {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: var(--color-primary);
      margin-bottom: 16px;
    }

    .merchant-name {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 4px;
      text-align: center;
    }

    .merchant-category {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 32px;
    }

    .amount-display {
      display: flex;
      align-items: flex-start;
      margin-bottom: 40px;
    }

    .currency {
      font-size: 24px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 8px;
    }

    .amount {
      font-size: 54px;
      font-weight: 800;
      color: var(--color-text);
      letter-spacing: -2px;
    }

    .payment-details {
      width: 100%;
      padding: 20px;
      margin-bottom: 40px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-value {
      font-weight: 600;
      color: var(--color-text);
    }

    .detail-success {
      color: var(--color-success) !important;
    }

    .confirm-btn {
      width: 100%;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 14px;
      padding: 18px;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 16px;
      box-shadow: 0 8px 24px rgba(233, 69, 96, 0.3);
    }
    
    .confirm-btn ion-icon {
      font-size: 22px;
    }

    .generate-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px;
    }
  `]
})
export class PaymentSimulatorComponent implements OnInit {
  @Input() cardLastFour: string = '';
  
  merchantName: string = '';
  merchantCategory: string = '';
  amount: number = 0;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.generateNewRandomData();
  }

  generateNewRandomData(): void {
    this.merchantName = faker.company.name();
    this.merchantCategory = faker.commerce.department();
    const rawAmount = faker.finance.amount({ min: 5000, max: 500000, dec: 0 });
    this.amount = parseInt(rawAmount, 10);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-CO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  cancel(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  confirm(): void {
    this.modalController.dismiss({
      merchant: this.merchantName,
      amount: this.amount
    }, 'confirm');
  }
}
