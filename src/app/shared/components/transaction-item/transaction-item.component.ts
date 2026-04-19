import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Transaction } from '../../../models/transaction.model';

@Component({
  selector: 'app-transaction-item',
  standalone: false,
  template: `
    <div class="transaction-item card-glass"
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
      padding: 14px 16px;
      margin-bottom: 8px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 0.2s ease, background 0.2s ease;
      cursor: pointer;
    }

    .transaction-item:active {
      transform: scale(0.98);
      background: rgba(255, 255, 255, 0.08);
    }

    .tx-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tx-emoji {
      font-size: 28px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .tx-info {
      display: flex;
      flex-direction: column;
    }

    .tx-merchant {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
    }

    .tx-date {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 2px;
    }

    .tx-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tx-amount {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-primary);
    }

    .tx-amount.failed {
      color: #ff4757;
      font-size: 12px;
    }

    .tx-status {
      font-size: 14px;
      font-weight: 700;
    }

    .tx-status.success {
      color: #2ed573;
    }

    .tx-status.fail {
      color: #ff4757;
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

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
