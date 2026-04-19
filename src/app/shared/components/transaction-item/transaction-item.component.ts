import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Transaction } from '../../../models/transaction.model';

@Component({
  selector: 'app-transaction-item',
  standalone: false,
  template: `
    <div class="transaction-item"
         (mousedown)="onPressStart()"
         (mouseup)="onPressEnd()"
         (mouseleave)="onPressEnd()"
         (touchstart)="onPressStart()"
         (touchend)="onPressEnd()"
         (touchcancel)="onPressEnd()">
      <div class="tx-left">
        <div class="tx-emoji">
          {{ transaction.emoji || getDefaultEmoji() }}
        </div>
        <div class="tx-info">
          <span class="tx-merchant">{{ transaction.merchant }}</span>
          <span class="tx-date">{{ formatDate(transaction.date) }}</span>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount" [class.failed]="transaction.status === 'failed'">
          {{ transaction.status === 'failed' ? 'Fallido' : formatAmount(transaction.amount) }}
        </span>
        <span class="tx-status" [class.success]="transaction.status === 'success'"
                                [class.fail]="transaction.status === 'failed'">
          {{ transaction.status === 'success' ? '✓' : '✗' }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .transaction-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      margin-bottom: 10px;
      border-radius: 12px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .transaction-item:active {
      transform: scale(0.98);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .transaction-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--color-primary);
    }

    .tx-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .tx-emoji {
      font-size: 28px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary);
      border-radius: 12px;
      border: 1px solid var(--color-border);
    }

    .tx-info {
      display: flex;
      flex-direction: column;
    }

    .tx-merchant {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .tx-date {
      font-size: 12px;
      color: var(--color-text-tertiary);
      margin-top: 4px;
    }

    .tx-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tx-amount {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-primary);
      text-align: right;
    }

    .tx-amount.failed {
      color: var(--color-error);
      font-size: 13px;
    }

    .tx-status {
      font-size: 16px;
      font-weight: 700;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .tx-status.success {
      color: var(--color-success);
      background: rgba(16, 185, 129, 0.1);
    }

    .tx-status.fail {
      color: var(--color-error);
      background: rgba(239, 68, 68, 0.1);
    }
  `]
})
export class TransactionItemComponent {
  @Input() transaction!: Transaction;
  @Output() longPress = new EventEmitter<Transaction>();

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  onPressStart(): void {
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      this.longPress.emit(this.transaction);
    }, 2000);
  }

  onPressEnd(): void {
    this.clearLongPressTimer();
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  getDefaultEmoji(): string {
    return '💳';
  }

  formatDate(date: Timestamp): string {
    if (date?.toDate) {
      const d = date.toDate();
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return '';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
