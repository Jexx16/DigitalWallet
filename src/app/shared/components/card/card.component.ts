import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import anime from 'animejs';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-card',
  standalone: false,
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
  @Input() card!: Card;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.animateEntrance();
  }

  private animateEntrance(): void {
    anime({
      targets: this.el.nativeElement.querySelector('.wallet-card'),
      translateY: [20, 0],
      opacity: [0, 1],
      easing: 'easeOutExpo',
      duration: 1200,
      delay: 100
    });
  }

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
