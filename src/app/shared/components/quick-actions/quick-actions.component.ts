import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-quick-actions',
  standalone: false,
  template: `
    <div class="quick-actions">
      <div class="action-item" (click)="onAction('transfer')">
        <div class="action-btn">
          <ion-icon name="swap-horizontal-outline"></ion-icon>
        </div>
        <span>Transferir</span>
      </div>

      <div class="action-item" (click)="onAction('pay')">
        <div class="action-btn highlight">
          <ion-icon name="scan-outline"></ion-icon>
        </div>
        <span>Pagar</span>
      </div>

      <div class="action-item" (click)="onAction('add')">
        <div class="action-btn">
          <ion-icon name="add-outline"></ion-icon>
        </div>
        <span>Tarjetas</span>
      </div>

      <div class="action-item" (click)="onAction('history')">
        <div class="action-btn">
          <ion-icon name="time-outline"></ion-icon>
        </div>
        <span>Historial</span>
      </div>
    </div>
  `,
  styles: [`
    .quick-actions {
      display: flex;
      justify-content: space-around;
      padding: 24px 16px;
      margin: 16px;
      background: var(--color-bg-secondary);
      border-radius: 16px;
      border: 1px solid var(--color-border);
    }

    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .action-btn {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: var(--color-bg-primary);
      border: 2px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: var(--color-text-primary);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .action-btn:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }

    .action-btn.highlight {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(30, 99, 219, 0.3);
    }

    .action-btn.highlight:hover {
      box-shadow: 0 6px 20px rgba(30, 99, 219, 0.4);
      transform: translateY(-2px);
    }

    .action-item:active .action-btn {
      transform: scale(0.95);
    }

    .action-item span {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary);
      text-align: center;
    }
  `]
})
export class QuickActionsComponent {
  @Output() action = new EventEmitter<'transfer' | 'pay' | 'add' | 'history'>();

  onAction(type: 'transfer' | 'pay' | 'add' | 'history'): void {
    this.action.emit(type);
  }
}
