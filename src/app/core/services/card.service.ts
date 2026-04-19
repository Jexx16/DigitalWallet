import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Card } from '../../models/card.model';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {}

  /**
   * Algoritmo de Luhn para validar número de tarjeta
   */
  luhnCheck(cardNumber: string): boolean {
    const normalized = this.normalizeCardNumber(cardNumber);
    if (!/^\d{13,19}$/.test(normalized)) {
      return false;
    }

    const digits = normalized.split('').map(Number);
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits[i];
      if (isEven) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  /**
   * Detecta la franquicia según el BIN de la tarjeta
   */
  detectFranchise(cardNumber: string): 'visa' | 'mastercard' | 'unknown' {
    const num = this.normalizeCardNumber(cardNumber);
    if (!/^\d+$/.test(num)) {
      return 'unknown';
    }

    if (num.startsWith('4')) return 'visa';
    const bin4 = parseInt(num.substring(0, 4));
    const bin2 = parseInt(num.substring(0, 2));
    if ((bin2 >= 51 && bin2 <= 55) || (bin4 >= 2221 && bin4 <= 2720)) return 'mastercard';
    return 'unknown';
  }

  /**
   * Formatea el número de tarjeta en bloques de 4
   */
  formatCardNumber(value: string): string {
    const cleaned = value.replace(/\D/g, '').substring(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  }

  /**
   * Formatea la fecha de expiración MM/YY
   */
  formatExpiryDate(value: string): string {
    const cleaned = value.replace(/\D/g, '').substring(0, 4);
    if (cleaned.length >= 3) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    return cleaned;
  }

  /**
   * Obtiene todas las tarjetas del usuario
   */
  getCards(uid: string): Observable<Card[]> {
    const safeUid = this.resolveUid(uid);
    return this.firestoreService.getCollection<Card>(`users/${safeUid}/cards`);
  }

  /**
   * Agrega una nueva tarjeta (valida Luhn antes)
   */
  async addCard(uid: string, cardData: Omit<Card, 'id' | 'createdAt'>): Promise<void> {
    const safeUid = this.resolveUid(uid);
    const fullNumber = this.normalizeCardNumber(cardData.cardNumber);

    if (!this.luhnCheck(fullNumber)) {
      throw new Error('Número de tarjeta inválido (Luhn)');
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardData.expiryDate)) {
      throw new Error('Fecha de expiración inválida. Usa formato MM/YY.');
    }

    const trimmedHolder = cardData.cardHolder.trim();
    if (!trimmedHolder) {
      throw new Error('El nombre del titular es obligatorio.');
    }

    const card: Omit<Card, 'id'> = {
      ...cardData,
      cardHolder: trimmedHolder,
      cardNumber: fullNumber.slice(-4), // Solo guardar últimos 4 dígitos
      franchise: this.detectFranchise(fullNumber),
      createdAt: Timestamp.now()
    };

    await this.firestoreService.addDocument(`users/${safeUid}/cards`, card);
  }

  /**
   * Elimina una tarjeta
   */
  async deleteCard(uid: string, cardId: string): Promise<void> {
    const safeUid = this.resolveUid(uid);
    return this.firestoreService.deleteDocument(`users/${safeUid}/cards/${cardId}`);
  }

  private normalizeCardNumber(cardNumber: string): string {
    return cardNumber.replace(/\s+/g, '').replace(/-/g, '').trim();
  }

  private resolveUid(uid: string): string {
    const currentUid = this.authService.getCurrentUid();
    if (!currentUid) {
      throw new Error('No hay usuario autenticado.');
    }

    if (uid !== currentUid) {
      throw new Error('Operación no autorizada para el usuario solicitado.');
    }

    return currentUid;
  }
}
