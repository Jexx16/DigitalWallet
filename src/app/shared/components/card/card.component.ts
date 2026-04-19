import { Component, Input } from '@angular/core';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-card',
  standalone: false,
  template: `
    <div class="wallet-card" [style.background]="getCardGradient()">
      <div class="card-top">
        <div class="card-chip">
          <div class="chip-line"></div>
          <div class="chip-line"></div>
          <div class="chip-line"></div>
          <div class="chip-line"></div>
        </div>
        <div class="card-franchise">
          <img *ngIf="card.franchise === 'visa'"
               src="assets/icon/visa-logo.svg"
               alt="Visa"
               class="franchise-logo" />
          <img *ngIf="card.franchise === 'mastercard'"
               src="assets/icon/mastercard-logo.svg"
               alt="Mastercard"
               class="franchise-logo" />
          <ion-icon *ngIf="card.franchise === 'unknown'"
                    name="card-outline"
                    class="franchise-icon"></ion-icon>
        </div>
      </div>

      <div class="card-number">
        <span class="masked">•••• •••• ••••</span>
        <span class="last-four">{{ card.cardNumber }}</span>
      </div>

      <div class="card-bottom">
        <div class="card-holder">
          <span class="card-label">TITULAR</span>
          <span class="card-value">{{ card.cardHolder | uppercase }}</span>
        </div>
        <div class="card-expiry">
          <span class="card-label">VENCE</span>
          <span class="card-value">{{ card.expiryDate }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wallet-card {
      width: 320px;
      height: 195px;
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .wallet-card::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);
      pointer-events: none;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .card-chip {
      width: 45px;
      height: 35px;
      background: linear-gradient(135deg, #FFD700, #FFC700);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 4px 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .chip-line {
      height: 2px;
      background: rgba(0, 0, 0, 0.15);
      margin: 2px 0;
      border-radius: 1px;
    }

    .card-franchise {
      display: flex;
      align-items: center;
    }

    .franchise-logo {
      height: 32px;
      filter: brightness(0) invert(1);
    }

    .franchise-icon {
      font-size: 36px;
      color: rgba(255, 255, 255, 0.9);
    }

    .card-number {
      font-size: 18px;
      letter-spacing: 3px;
      color: #ffffff;
      font-weight: 500;
    }

    .masked {
      opacity: 0.65;
      margin-right: 8px;
    }

    .last-four {
      font-weight: 700;
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .card-label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.7;
      color: #ffffff;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .card-value {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
  `]
})
export class CardComponent {
  @Input() card!: Card;

  getCardGradient(): string {
    if (this.card?.color) {
      return `linear-gradient(135deg, ${this.card.color}, ${this.adjustColor(this.card.color, -35)})`;
    }
    return 'linear-gradient(135deg, #1e63db, #1550b8)';
  }

  private adjustColor(hex: string, amount: number): string {
    let color = hex.replace('#', '');
    const num = parseInt(color, 16);
    let r = Math.min(255, Math.max(0, (num >> 16) + amount));
    let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  }
}
