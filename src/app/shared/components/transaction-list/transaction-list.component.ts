import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Transaction } from '../../../models/transaction.model';

@Component({
  selector: 'app-transaction-list',
  standalone: false,
  template: `
    <div class="transaction-list">
      <div class="list-header">
        <h3 class="list-title">{{ title }}</h3>
        <span class="list-count" *ngIf="transactions.length > 0">
          {{ transactions.length }} movimientos
        </span>
      </div>

      <div *ngIf="loading">
        <app-skeleton-loading [count]="3"></app-skeleton-loading>
      </div>

      <div *ngIf="!loading && transactions.length === 0" class="empty-state">
        <ion-icon name="receipt-outline" class="empty-icon"></ion-icon>
        <p>No hay transacciones aún</p>
      </div>

      <div *ngIf="!loading">
        <app-transaction-item
          *ngFor="let tx of transactions"
          [transaction]="tx"
          (longPress)="onTransactionLongPress($event)"
        ></app-transaction-item>
      </div>
    </div>
  `,
  styles: [`
    .transaction-list {
      padding: 0;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 0 0 12px;
      border-bottom: 1px solid var(--color-border);
    }

    .list-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .list-count {
      font-size: 12px;
      color: var(--color-text-tertiary);
      background: var(--color-bg-secondary);
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 48px 20px;
      color: var(--color-text-tertiary);
    }

    .empty-icon {
      font-size: 56px;
      margin-bottom: 12px;
      color: var(--color-text-tertiary);
    }

    .empty-state p {
      font-size: 15px;
      margin: 0;
      color: var(--color-text-secondary);
      font-weight: 500;
    }
  `]
})
export class TransactionListComponent {
  @Input() transactions: Transaction[] = [];
  @Input() title: string = 'Últimos movimientos';
  @Input() loading: boolean = false;
  @Output() transactionLongPress = new EventEmitter<Transaction>();

  onTransactionLongPress(transaction: Transaction): void {
    this.transactionLongPress.emit(transaction);
  }
}
