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
    const rawValue = event?.detail?.value;
    if (!rawValue || typeof rawValue !== 'string') {
      return;
    }

    const normalizedDate = this.parseLocalCalendarDate(rawValue);
    if (normalizedDate) {
      this.dateSelected.emit(normalizedDate);
    }
  }

  private parseLocalCalendarDate(value: string): Date | null {
    const dateText = value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    // Usar hora media para evitar desfaces por zona horaria/UTC.
    return new Date(year, month, day, 12, 0, 0, 0);
  }
}
