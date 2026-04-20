import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Card } from '../../models/card.model';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

export interface CardCreationRequest extends Omit<Card, 'id' | 'createdAt'> {
  cvv: string;
}

export interface CardUpdateRequest {
  cardHolder?: string;
  expiryDate?: string;
  color?: string;
}

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
   * Formatea CVV/CVC y limita a 4 dígitos
   */
  formatSecurityCode(value: string): string {
    return value.replace(/\D/g, '').substring(0, 4);
  }

  /**
   * Verifica si la tarjeta está expirada
   * @param expiryDate Fecha en formato MM/YY
   * @returns true si la tarjeta está expirada, false si aún es válida
   */
  isCardExpired(expiryDate: string): boolean {
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Convertir YY a YYYY (asumiendo tarjetas del 2000 en adelante)
    const fullYear = 2000 + parseInt(year);
    const expiryMonth = parseInt(month);

    // La tarjeta es válida hasta el último día del mes de expiración
    if (fullYear < currentYear) {
      return true; // Año pasado
    }

    if (fullYear === currentYear && expiryMonth < currentMonth) {
      return true; // Mes actual pero pasado
    }

    return false; // Tarjeta válida
  }

  /**
   * Obtiene el estado de la tarjeta
   */
  getCardExpiryStatus(expiryDate: string): 'expired' | 'expiring-soon' | 'valid' {
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const fullYear = 2000 + parseInt(year);
    const expiryMonth = parseInt(month);

    if (fullYear < currentYear || (fullYear === currentYear && expiryMonth < currentMonth)) {
      return 'expired';
    }

    // Si es este mes o el próximo mes, es "expiring soon"
    if (fullYear === currentYear && expiryMonth <= currentMonth + 1) {
      return 'expiring-soon';
    }

    return 'valid';
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
  async addCard(uid: string, cardData: CardCreationRequest): Promise<void> {
    const safeUid = this.resolveUid(uid);
    const fullNumber = this.normalizeCardNumber(cardData.cardNumber);
    const securityCode = this.formatSecurityCode(cardData.cvv);

    if (!this.luhnCheck(fullNumber)) {
      throw new Error('Número de tarjeta inválido (Luhn)');
    }

    if (!/^\d{3,4}$/.test(securityCode)) {
      throw new Error('CVV inválido. Debe tener 3 o 4 dígitos.');
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardData.expiryDate)) {
      throw new Error('Fecha de expiración inválida. Usa formato MM/YY.');
    }

    const trimmedHolder = cardData.cardHolder.trim();
    if (!trimmedHolder) {
      throw new Error('El nombre del titular es obligatorio.');
    }

    const { cvv: _cvv, ...safeCardData } = cardData;

    const card: Omit<Card, 'id'> = {
      ...safeCardData,
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

  /**
   * Edita datos permitidos de una tarjeta guardada
   */
  async updateCard(uid: string, cardId: string, updates: CardUpdateRequest): Promise<void> {
    const safeUid = this.resolveUid(uid);

    const normalizedCardId = cardId?.trim();
    if (!normalizedCardId) {
      throw new Error('Tarjeta inválida para actualizar.');
    }

    const payload: CardUpdateRequest = {};

    if (updates.cardHolder !== undefined) {
      const holder = updates.cardHolder.trim();
      if (!holder) {
        throw new Error('El nombre del titular es obligatorio.');
      }
      payload.cardHolder = holder;
    }

    if (updates.expiryDate !== undefined) {
      const expiryDate = this.formatExpiryDate(updates.expiryDate.trim());
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
        throw new Error('Fecha de expiración inválida. Usa formato MM/YY.');
      }
      payload.expiryDate = expiryDate;
    }

    if (updates.color !== undefined) {
      const color = updates.color.trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error('Color inválido para la tarjeta.');
      }
      payload.color = color;
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('No hay cambios para guardar.');
    }

    await this.firestoreService.updateDocument(`users/${safeUid}/cards/${normalizedCardId}`, payload);
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
