import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  biometricQuickAccess = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private loadingService: LoadingService,
    private toastService: ToastService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.handleGoogleRedirectLogin();
    await this.checkBiometricQuickAccess();
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.submitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    await this.loadingService.show('Iniciando sesión...');
    try {
      const { email, password } = this.loginForm.getRawValue();
      await this.authService.loginWithEmail(email, password);
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.loadingService.hide();
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.submitting = true;
    await this.loadingService.show('Conectando con Google...');
    try {
      const result = await this.authService.startGoogleLogin();
      if (result === 'redirecting') {
        return;
      }
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.loadingService.hide();
    }
  }

  async loginWithBiometric(): Promise<void> {
    if (!this.biometricQuickAccess || this.submitting) {
      return;
    }

    this.submitting = true;
    await this.loadingService.show('Validando biometría...');
    try {
      await this.authService.loginWithBiometric();
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.loadingService.hide();
    }
  }

  goToRegister(): void {
    void this.router.navigate(['/register']);
  }

  controlHasError(controlName: 'email' | 'password', errorName: string): boolean {
    const control = this.loginForm.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  private async checkBiometricQuickAccess(): Promise<void> {
    try {
      this.biometricQuickAccess = await this.authService.canUseBiometricLogin();
    } catch {
      this.biometricQuickAccess = false;
    }
  }

  private async handleGoogleRedirectLogin(): Promise<void> {
    const hash = window.location.hash || '';
    if (!hash.includes('id_token') && !hash.includes('error=')) {
      return;
    }

    this.submitting = true;
    await this.loadingService.show('Completando acceso con Google...');
    try {
      const user = await this.authService.handleGoogleRedirectResult();
      if (user) {
        await this.router.navigate(['/home']);
      }
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    } finally {
      this.submitting = false;
      await this.loadingService.hide();
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'No fue posible iniciar sesión.';
  }
}
