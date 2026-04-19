import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-calendar',
  standalone: false,
  template: `
    <div class="calendar-wrapper card-glass">
      <div class="calendar-header">
        <ion-icon name="calendar-outline"></ion-icon>
        <span>Filtrar por fecha</span>
      </div>
      <ion-datetime
        presentation="date"
        [max]="maxDate"
        (ionChange)="onDateSelected($event)"
        class="custom-datetime">
      </ion-datetime>
    </div>
  `,
  styles: [`
    .calendar-wrapper {
      padding: 16px;
      margin-bottom: 20px;
    }

    .calendar-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .calendar-header ion-icon {
      font-size: 18px;
    }

    .custom-datetime {
      --background: transparent;
      --background-rgb: transparent;
      --title-color: var(--color-text);
      --highlight-background: var(--color-primary);
      --highlight-color: #ffffff;
      --color: var(--color-text);
      border-radius: 12px;
    }
  `]
})
export class CalendarComponent {
  @Output() dateSelected = new EventEmitter<Date>();

  // Limitar calendario hasta el día de hoy
  maxDate: string = new Date().toISOString();

  onDateSelected(event: any): void {
    if (event.detail.value) {
      this.dateSelected.emit(new Date(event.detail.value));
    }
  }
}
