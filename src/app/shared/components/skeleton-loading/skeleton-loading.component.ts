import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loading',
  standalone: false,
  template: `
    <div class="skeleton-container">
      <div *ngFor="let item of [].constructor(count)" class="skeleton-item card-glass">
        <ion-skeleton-text animated style="width: 44px; height: 44px; border-radius: 12px;"></ion-skeleton-text>
        <div class="skeleton-info">
          <ion-skeleton-text animated style="width: 50%; height: 16px; border-radius: 4px; margin-bottom: 6px;"></ion-skeleton-text>
          <ion-skeleton-text animated style="width: 30%; height: 12px; border-radius: 4px;"></ion-skeleton-text>
        </div>
        <ion-skeleton-text animated style="width: 25%; height: 18px; border-radius: 4px;"></ion-skeleton-text>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-container {
      width: 100%;
    }

    .skeleton-item {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      margin-bottom: 8px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
    }

    .skeleton-info {
      flex: 1;
      margin-left: 12px;
      display: flex;
      flex-direction: column;
    }
    
    ion-skeleton-text {
      --background: rgba(255, 255, 255, 0.05);
      --background-rgb: 255, 255, 255;
    }
  `]
})
export class SkeletonLoadingComponent {
  @Input() count: number = 3;
}
