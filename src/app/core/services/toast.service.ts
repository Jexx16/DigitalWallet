import { Injectable } from '@angular/core';
import { Toast } from '@capacitor/toast';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor() {}

  /**
   * Muestra un toast nativo con mensaje
   */
  async show(text: string, duration: 'short' | 'long' = 'short', position: 'top' | 'center' | 'bottom' = 'bottom'): Promise<void> {
    await Toast.show({
      text,
      duration,
      position
    });
  }

  /**
   * Muestra un toast de éxito
   */
  async showSuccess(message: string): Promise<void> {
    await this.show(`✅ ${message}`);
  }

  /**
   * Muestra un toast de error
   */
  async showError(message: string): Promise<void> {
    await this.show(`❌ ${message}`, 'long');
  }
}
