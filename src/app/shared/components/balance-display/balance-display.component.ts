import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-balance-display',
  standalone: false,
  template: `
    <div class="balance-container">
      <span class="balance-label">Saldo total</span>
      <div class="balance-amount-row">
        <h1 class="balance-amount" *ngIf="!hidden">
          {{ formatAmount(balance) }}
        </h1>
        <h1 class="balance-amount" *ngIf="hidden">
          •••••••
        </h1>
        <ion-icon
          [name]="hidden ? 'eye-outline' : 'eye-off-outline'"
          class="toggle-visibility"
          (click)="toggleVisibility()"
        ></ion-icon>
      </div>
      <span class="balance-subtitle" *ngIf="!hidden">
        {{ balance >= 0 ? 'Balance positivo' : 'Balance negativo' }}
      </span>
    </div>
  `,
  styles: [`
    .balance-container {
      text-align: center;
      padding: 28px 20px 20px;
    }

    .balance-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 500;
    }

    .balance-amount-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 6px;
    }

    .balance-amount {
      font-size: 36px;
      font-weight: 800;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -1px;
    }

    .toggle-visibility {
      font-size: 22px;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      transition: color 0.2s;
    }

    .toggle-visibility:hover {
      color: var(--color-primary);
    }

    .balance-subtitle {
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 4px;
    }
  `]
})
export class BalanceDisplayComponent {
  @Input() balance: number = 0;
  hidden: boolean = false;

  toggleVisibility(): void {
    this.hidden = !this.hidden;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
