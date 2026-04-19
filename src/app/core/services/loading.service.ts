import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  private loading: HTMLIonLoadingElement | null = null;

  constructor(private loadingController: LoadingController) {}

  /**
   * Muestra el overlay spinner de carga
   */
  async show(message: string = 'Cargando...'): Promise<void> {
    // Evitar múltiples overlays
    if (this.loading) {
      return;
    }

    this.loading = await this.loadingController.create({
      message,
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });

    await this.loading.present();
  }

  /**
   * Oculta el overlay spinner
   */
  async hide(): Promise<void> {
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = null;
    }
  }
}
