import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { BiometricService } from './biometric.service';
import { Transaction } from '../../models/transaction.model';
import { Observable, catchError, throwError } from 'rxjs';
import { Timestamp, collection, query, where, orderBy, limit, collectionData, Firestore } from '@angular/fire/firestore';

export interface PaymentRequest {
  cardId: string;
  merchant: string;
  amount: number;
  description?: string;
  category?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(
    private firestoreService: FirestoreService,
    private biometricService: BiometricService,
    private firestore: Firestore
  ) {}

  /**
   * Procesa un pago con validación biométrica completa
   * 
   * @param uid - ID del usuario
   * @param paymentRequest - Datos del pago
   * @param biometricEnabled - Si la biometría está habilitada para este usuario
   * @param requireBiometric - Forzar validación biométrica incluso si no está habilitada
   * @returns Resultado del pago
   */
  async processPayment(
    uid: string,
    paymentRequest: PaymentRequest,
    biometricEnabled: boolean = false,
    requireBiometric: boolean = true
  ): Promise<PaymentResult> {
    try {
      // Validar que el dispositivo tenga biometría si es requerida
      // Solo en dispositivos nativos (Android/iOS)
      if ((requireBiometric || biometricEnabled) && this.biometricService.isNativeDevice()) {
        // Validar disponibilidad de biometría
        const availability = await this.biometricService.checkBiometricAvailability();
        if (!availability.isAvailable) {
          throw new Error('La biometría no está disponible en este dispositivo');
        }

        // Realizar validación biométrica segura para pagos
        await this.biometricService.performSecurePaymentValidation(
          paymentRequest.amount,
          paymentRequest.merchant
        );
      }

      // Crear registro de transacción
      const transaction: Omit<Transaction, 'id'> = {
        cardId: paymentRequest.cardId,
        merchant: paymentRequest.merchant,
        amount: paymentRequest.amount,
        description: paymentRequest.description || '',
        category: paymentRequest.category?.trim() || 'General',
        date: Timestamp.now(),
        status: 'success',
        emoji: ''
      };

      // Guardar en Firestore
      const docRef = await this.firestoreService.addDocument(
        `users/${uid}/transactions`,
        transaction
      );

      return {
        success: true,
        transactionId: docRef.id,
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('Error procesando pago:', error);
      return {
        success: false,
        error: error?.message || 'Error procesando el pago',
        timestamp: new Date()
      };
    }
  }

  /**
   * Valida un pago antes de procesarlo
   * 
   * @param paymentRequest - Datos del pago a validar
   * @returns Validación correcta o error
   */
  async validatePayment(paymentRequest: PaymentRequest): Promise<{ valid: boolean; error?: string }> {
    // Validar monto
    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      return { valid: false, error: 'El monto debe ser mayor a 0' };
    }

    // Validar tarjeta
    if (!paymentRequest.cardId || paymentRequest.cardId.trim() === '') {
      return { valid: false, error: 'Debe seleccionar una tarjeta' };
    }

    // Validar comercio
    if (!paymentRequest.merchant || paymentRequest.merchant.trim() === '') {
      return { valid: false, error: 'Comercio inválido' };
    }

    // Validación de monto máximo (opcional)
    const MAX_PAYMENT = 10000000; // $10M COP
    if (paymentRequest.amount > MAX_PAYMENT) {
      return { valid: false, error: `Monto máximo permitido: $${MAX_PAYMENT.toLocaleString()}` };
    }

    return { valid: true };
  }

  /**
   * Simula un pago con biometría (para desarrollo/testing)
   */
  async simulatePaymentWithBiometric(
    uid: string,
    paymentRequest: PaymentRequest,
    biometricEnabled: boolean = false
  ): Promise<PaymentResult> {
    return this.processPayment(uid, paymentRequest, biometricEnabled, true);
  }

  /**
   * Obtiene las últimas N transacciones de una tarjeta específica
   */
  getTransactionsByCard(uid: string, cardId: string, limitCount: number = 10): Observable<Transaction[]> {
    const ref = collection(this.firestore, `users/${uid}/transactions`);
    const q = query(
      ref,
      where('cardId', '==', cardId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      catchError(error => {
        console.error('Error fetching transactions by card:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene todas las transacciones del usuario
   */
  getAllTransactions(uid: string, limitCount: number = 50): Observable<Transaction[]> {
    const ref = collection(this.firestore, `users/${uid}/transactions`);
    const q = query(ref, orderBy('date', 'desc'), limit(limitCount));
    return (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      catchError(error => {
        console.error('Error fetching all transactions:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene transacciones filtradas por fecha específica
   */
  getTransactionsByDate(uid: string, date: Date): Observable<Transaction[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const ref = collection(this.firestore, `users/${uid}/transactions`);
    const q = query(
      ref,
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date', 'desc')
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      catchError(error => {
        console.error('Error fetching transactions by date:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualiza el emoji de una transacción
   */
  async updateTransactionEmoji(uid: string, txId: string, emoji: string): Promise<void> {
    return this.firestoreService.updateDocument(`users/${uid}/transactions/${txId}`, { emoji });
  }

  /**
   * Guarda una transacción simple sin validación biométrica
   * Útil para transferencias y otros tipos de transacciones
   */
  async saveTransaction(uid: string, transaction: Omit<Transaction, 'id'>): Promise<string> {
    try {
      const transactionData: Omit<Transaction, 'id'> = {
        ...transaction,
        description: transaction.description?.trim() || '',
        category: transaction.category?.trim() || 'General',
        emoji: transaction.emoji || ''
      };
      
      const docRef = await this.firestoreService.addDocument(
        `users/${uid}/transactions`,
        transactionData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error guardando transacción:', error);
      throw error;
    }
  }
}
