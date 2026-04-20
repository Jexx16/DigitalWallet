import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Transaction } from '../../models/transaction.model';
import { PaymentService } from './payment.service';

export interface TransactionStats {
  totalSpent: number;
  transactionCount: number;
  averagePerTransaction: number;
  transactions: Transaction[];
}

export interface MonthlyStats {
  month: string;
  year: number;
  totalSpent: number;
  transactionCount: number;
  averagePerTransaction: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionStatsService {

  constructor(private paymentService: PaymentService) {}

  /**
   * Obtiene las estadísticas del mes actual (Gasto total, cantidad, promedio)
   * @param uid - ID del usuario
   * @returns Observable con las estadísticas del mes actual
   */
  getCurrentMonthStats(uid: string): Observable<TransactionStats> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return this.paymentService.getAllTransactions(uid, 200).pipe(
      map(transactions => this.calculateCurrentMonthStats(transactions, currentMonth, currentYear))
    );
  }

  /**
   * Obtiene las estadísticas de un mes específico
   * @param uid - ID del usuario
   * @param month - Mes (0-11)
   * @param year - Año
   * @returns Observable con las estadísticas del mes especificado
   */
  getMonthStats(uid: string, month: number, year: number): Observable<MonthlyStats> {
    return this.paymentService.getAllTransactions(uid, 200).pipe(
      map(transactions => this.calculateMonthStats(transactions, month, year))
    );
  }

  /**
   * Obtiene las estadísticas de un rango de fechas
   * @param uid - ID del usuario
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Observable con las estadísticas del rango especificado
   */
  getDateRangeStats(uid: string, startDate: Date, endDate: Date): Observable<TransactionStats> {
    return this.paymentService.getAllTransactions(uid, 200).pipe(
      map(transactions => this.calculateDateRangeStats(transactions, startDate, endDate))
    );
  }

  /**
   * Obtiene el total gastado en el mes actual
   * @param uid - ID del usuario
   * @returns Observable con el total gastado
   */
  getCurrentMonthTotal(uid: string): Observable<number> {
    return this.getCurrentMonthStats(uid).pipe(
      map(stats => stats.totalSpent)
    );
  }

  /**
   * Obtiene la cantidad de transacciones del mes actual
   * @param uid - ID del usuario
   * @returns Observable con la cantidad de transacciones
   */
  getCurrentMonthTransactionCount(uid: string): Observable<number> {
    return this.getCurrentMonthStats(uid).pipe(
      map(stats => stats.transactionCount)
    );
  }

  /**
   * Obtiene el promedio de gasto por transacción del mes actual
   * @param uid - ID del usuario
   * @returns Observable con el promedio por transacción
   */
  getCurrentMonthAverage(uid: string): Observable<number> {
    return this.getCurrentMonthStats(uid).pipe(
      map(stats => stats.averagePerTransaction)
    );
  }

  /**
   * Calcula las estadísticas del mes actual a partir de un array de transacciones
   * @private
   */
  private calculateCurrentMonthStats(
    transactions: Transaction[],
    currentMonth: number,
    currentYear: number
  ): TransactionStats {
    const monthTransactions = this.filterByMonth(transactions, currentMonth, currentYear);
    return this.calculateStats(monthTransactions);
  }

  /**
   * Calcula las estadísticas de un mes específico
   * @private
   */
  private calculateMonthStats(
    transactions: Transaction[],
    month: number,
    year: number
  ): MonthlyStats {
    const monthTransactions = this.filterByMonth(transactions, month, year);
    const stats = this.calculateStats(monthTransactions);
    
    const monthName = new Date(year, month, 1).toLocaleDateString('es-CO', { month: 'long' });
    
    return {
      month: monthName,
      year,
      totalSpent: stats.totalSpent,
      transactionCount: stats.transactionCount,
      averagePerTransaction: stats.averagePerTransaction
    };
  }

  /**
   * Calcula las estadísticas de un rango de fechas
   * @private
   */
  private calculateDateRangeStats(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date
  ): TransactionStats {
    const rangeTransactions = this.filterByDateRange(transactions, startDate, endDate);
    return this.calculateStats(rangeTransactions);
  }

  /**
   * Filtra transacciones por mes y año
   * @private
   */
  private filterByMonth(
    transactions: Transaction[],
    month: number,
    year: number
  ): Transaction[] {
    return transactions.filter(tx => {
      const txDate = this.timestampToDate(tx.date);
      return txDate.getMonth() === month && txDate.getFullYear() === year;
    });
  }

  /**
   * Filtra transacciones por rango de fechas
   * @private
   */
  private filterByDateRange(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date
  ): Transaction[] {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return transactions.filter(tx => {
      const txDate = this.timestampToDate(tx.date);
      return txDate >= start && txDate <= end;
    });
  }

  /**
   * Calcula las estadísticas a partir de un array de transacciones
   * @private
   */
  private calculateStats(transactions: Transaction[]): TransactionStats {
    if (transactions.length === 0) {
      return {
        totalSpent: 0,
        transactionCount: 0,
        averagePerTransaction: 0,
        transactions: []
      };
    }

    const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const transactionCount = transactions.length;
    const averagePerTransaction = totalSpent / transactionCount;

    return {
      totalSpent,
      transactionCount,
      averagePerTransaction,
      transactions
    };
  }

  /**
   * Convierte un Timestamp de Firestore a Date
   * @private
   */
  private timestampToDate(timestamp: Timestamp | Date): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return timestamp;
  }

  /**
   * Obtiene estadísticas por categoría del mes actual
   * @param uid - ID del usuario
   * @returns Observable con estadísticas agrupadas por categoría
   */
  getCurrentMonthStatsByCategory(uid: string): Observable<Map<string, TransactionStats>> {
    return this.getCurrentMonthStats(uid).pipe(
      map(stats => this.groupByCategory(stats.transactions))
    );
  }

  /**
   * Agrupa transacciones por categoría y calcula estadísticas
   * @private
   */
  private groupByCategory(transactions: Transaction[]): Map<string, TransactionStats> {
    const grouped = new Map<string, Transaction[]>();

    transactions.forEach(tx => {
      const category = tx.category || 'Sin categoría';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)?.push(tx);
    });

    const result = new Map<string, TransactionStats>();
    grouped.forEach((txs, category) => {
      result.set(category, this.calculateStats(txs));
    });

    return result;
  }
}
