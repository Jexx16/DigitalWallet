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
      padding: 20px 10px;
      margin-bottom: 10px;
    }

    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .action-btn {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: var(--color-text);
      transition: all 0.2s ease;
    }

    .action-btn.highlight {
      background: var(--color-primary);
      border-color: var(--color-primary);
      box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4);
    }

    .action-item:active .action-btn {
      transform: scale(0.92);
    }

    .action-item span {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
    }
  `]
})
export class QuickActionsComponent {
  @Output() action = new EventEmitter<'transfer' | 'pay' | 'add' | 'history'>();

  onAction(type: 'transfer' | 'pay' | 'add' | 'history'): void {
    this.action.emit(type);
  }
}
