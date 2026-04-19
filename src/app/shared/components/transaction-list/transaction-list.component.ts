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
      padding: 0 4px;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .list-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }

    .list-count {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.08);
      padding: 4px 10px;
      border-radius: 20px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: rgba(255, 255, 255, 0.4);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.4;
    }

    .empty-state p {
      font-size: 14px;
      margin: 0;
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
