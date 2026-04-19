import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Transaction } from '../../models/transaction.model';
import { Observable } from 'rxjs';
import { Timestamp, collection, query, where, orderBy, limit, collectionData, Firestore } from '@angular/fire/firestore';
import { NativeBiometric } from 'capacitor-native-biometric';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(
    private firestoreService: FirestoreService,
    private firestore: Firestore
  ) {}

  /**
   * Registra una transacción exitosa en Firestore
   */
  async processPayment(
    uid: string,
    transactionData: Omit<Transaction, 'id' | 'date' | 'status'>,
    biometricEnabled: boolean = false
  ): Promise<void> {
    if (biometricEnabled) {
      await NativeBiometric.verifyIdentity({
        reason: 'Confirma este pago',
        title: 'Pago seguro'
      });
    }

    const tx: Omit<Transaction, 'id'> = {
      ...transactionData,
      date: Timestamp.now(),
      status: 'success'
    };
    await this.firestoreService.addDocument(`users/${uid}/transactions`, tx);
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
    return collectionData(q, { idField: 'id' }) as Observable<Transaction[]>;
  }

  /**
   * Obtiene todas las transacciones del usuario
   */
  getAllTransactions(uid: string, limitCount: number = 50): Observable<Transaction[]> {
    const ref = collection(this.firestore, `users/${uid}/transactions`);
    const q = query(ref, orderBy('date', 'desc'), limit(limitCount));
    return collectionData(q, { idField: 'id' }) as Observable<Transaction[]>;
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
    return collectionData(q, { idField: 'id' }) as Observable<Transaction[]>;
  }

  /**
   * Actualiza el emoji de una transacción
   */
  async updateTransactionEmoji(uid: string, txId: string, emoji: string): Promise<void> {
    return this.firestoreService.updateDocument(`users/${uid}/transactions/${txId}`, { emoji });
  }
}
