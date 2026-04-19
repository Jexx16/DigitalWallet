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
      padding: 32px 24px;
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg-secondary) 100%);
      border-radius: 16px;
      border: 1px solid var(--color-primary);
      box-shadow: 0 4px 6px -1px rgba(30, 99, 219, 0.1);
      margin: 16px;
    }

    .balance-label {
      font-size: 13px;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }

    .balance-amount-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
    }

    .balance-amount {
      font-size: 44px;
      font-weight: 800;
      color: var(--color-primary);
      margin: 0;
      letter-spacing: -1.5px;
    }

    .toggle-visibility {
      font-size: 24px;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 8px;
      border-radius: 8px;
      
      &:hover {
        color: var(--color-primary);
        background: rgba(30, 99, 219, 0.1);
      }
    }

    .balance-subtitle {
      display: block;
      font-size: 13px;
      color: var(--color-success);
      margin-top: 8px;
      font-weight: 600;
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
