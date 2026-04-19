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
      margin-bottom: 16px;
    }

    .custom-input-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 6px;
      opacity: 0.8;
    }

    .input-container {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0 14px;
      transition: all 0.3s ease;
    }

    .has-focus .input-container {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.15);
    }

    .has-error .input-container {
      border-color: #ff4757;
    }

    .input-icon {
      color: rgba(255, 255, 255, 0.4);
      font-size: 18px;
      margin-right: 10px;
    }

    .custom-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--color-text);
      font-size: 15px;
      padding: 14px 0;
      font-family: var(--ion-font-family);
    }

    .custom-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .toggle-password {
      color: rgba(255, 255, 255, 0.4);
      font-size: 20px;
      cursor: pointer;
    }

    .error-message {
      display: block;
      color: #ff4757;
      font-size: 12px;
      margin-top: 4px;
      padding-left: 4px;
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
    this.type = this.showPassword ? 'text' : 'password';
  }
}
