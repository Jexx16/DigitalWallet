import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  standalone: false,
  template: `
    <div class="custom-input-wrapper" [class.has-error]="showError" [class.has-focus]="isFocused">
      <label class="custom-input-label" *ngIf="label">{{ label }}</label>
      <div class="input-container">
        <ion-icon *ngIf="icon" [name]="icon" class="input-icon"></ion-icon>
        <input
          [type]="type"
          [placeholder]="placeholder"
          [value]="value"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          [disabled]="disabled"
          class="custom-input"
        />
        <ion-icon
          *ngIf="type === 'password'"
          [name]="showPassword ? 'eye-off-outline' : 'eye-outline'"
          class="toggle-password"
          (click)="togglePassword()"
        ></ion-icon>
      </div>
      <span class="error-message" *ngIf="showError">{{ errorMessage }}</span>
    </div>
  `,
  styles: [`
    .custom-input-wrapper {
      margin-bottom: 20px;
    }

    .custom-input-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .input-container {
      display: flex;
      align-items: center;
      background: var(--color-bg-secondary);
      border: 2px solid var(--color-border);
      border-radius: 8px;
      padding: 0 14px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      height: 48px;
    }

    .has-focus .input-container {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .has-error .input-container {
      border-color: var(--color-error);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .input-icon {
      color: var(--color-text-tertiary);
      font-size: 18px;
      margin-right: 10px;
      flex-shrink: 0;
    }

    .custom-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--color-text-primary);
      font-size: 15px;
      padding: 0;
      font-family: var(--ion-font-family);
      font-weight: 500;
    }

    .custom-input::placeholder {
      color: var(--color-text-tertiary);
    }

    .custom-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toggle-password {
      color: var(--color-text-tertiary);
      font-size: 20px;
      cursor: pointer;
      flex-shrink: 0;
      transition: color 0.2s ease;
      
      &:hover {
        color: var(--color-text-secondary);
      }
    }

    .error-message {
      display: block;
      color: var(--color-error);
      font-size: 12px;
      margin-top: 6px;
      padding-left: 4px;
      font-weight: 500;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: CustomInputComponent,
      multi: true
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() icon: string = '';
  @Input() errorMessage: string = '';
  @Input() showError: boolean = false;

  value: string = '';
  disabled: boolean = false;
  isFocused: boolean = false;
  showPassword: boolean = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
