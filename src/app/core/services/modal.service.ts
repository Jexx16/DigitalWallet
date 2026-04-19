import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  constructor(private modalController: ModalController) {}

  /**
   * Abre un modal con el componente indicado
   */
  async open(component: any, componentProps?: any, cssClass?: string): Promise<any> {
    const modal = await this.modalController.create({
      component,
      componentProps,
      cssClass: cssClass || 'custom-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    return data;
  }

  /**
   * Cierra el modal activo
   */
  async dismiss(data?: any): Promise<void> {
    await this.modalController.dismiss(data);
  }
}
