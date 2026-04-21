import { Injectable, Injector } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential
} from '@angular/fire/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn, SignInResult } from '@capawesome/capacitor-google-sign-in';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private readonly biometricServer = 'my-digital-wallet-auth';
  private googleInitialized = false;

  constructor(
    private auth: Auth,
    private injector: Injector
  ) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  /**
   * Login con email y contraseña
   */
  async loginWithEmail(email: string, password: string): Promise<User> {
    this.ensureFirebaseConfigured();
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return credential.user;
  }

  /**
   * Login con Google (via Capacitor plugin)
   */
  async loginWithGoogle(idToken: string): Promise<User> {
    this.ensureFirebaseConfigured();

    const normalizedToken = idToken.trim();
    if (!normalizedToken) {
      throw new Error('No se recibió un token válido de Google.');
    }

    try {
      const credential = GoogleAuthProvider.credential(normalizedToken);
      const result = await signInWithCredential(this.auth, credential);
      
      // Sincronización automática con Firestore (Requerimiento del Mega Resumen)
      const userService = this.injector.get(UserService);
      await userService.ensureUserProfileExists(
        result.user.uid,
        result.user.email || '',
        result.user.displayName || undefined
      );

      console.log('✅ Login exitoso con Google y perfil sincronizado:', result.user.email);
      return result.user;
    } catch (error: any) {
      console.error('❌ Error en loginWithGoogle:', error);
      
      // Detectar errores específicos
      if (error.code === 'auth/invalid-oauth-provider') {
        throw new Error('Google no está habilitado en Firebase Console. Contacta al administrador.');
      }
      
      if (error.message?.includes('400')) {
        throw new Error('Token de Google inválido. Intenta nuevamente.');
      }
      
      throw new Error(`Error: ${error.message || 'Error desconocido en login de Google'}`);
    }
  }

  /**
   * Inicia login con Google. En web dispara redirección OAuth.
   */
  async startGoogleLogin(): Promise<User | 'redirecting'> {
    this.ensureFirebaseConfigured();
    await this.ensureGoogleInitialized();

    if (Capacitor.getPlatform() === 'web') {
      void GoogleSignIn.signIn();
      return 'redirecting';
    }

    const result = await GoogleSignIn.signIn();
    return this.loginWithGoogleResult(result);
  }

  /**
   * Procesa callback OAuth de Google al volver de la redirección en web.
   */
  async handleGoogleRedirectResult(): Promise<User | null> {
    if (Capacitor.getPlatform() !== 'web' || !this.hasGoogleRedirectParams()) {
      return null;
    }

    this.ensureFirebaseConfigured();
    await this.ensureGoogleInitialized();

    const result = await GoogleSignIn.handleRedirectCallback();
    return this.loginWithGoogleResult(result);
  }

  /**
   * Registro con email y contraseña
   */
  async register(email: string, password: string): Promise<User> {
    this.ensureFirebaseConfigured();
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    return credential.user;
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    return signOut(this.auth);
  }

  /**
   * Re-autenticar usuario (requerido antes de habilitar biometría)
   */
  async reauthenticate(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No hay usuario autenticado');
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  /**
   * Habilita biometría para el usuario actual:
   * 1) Reautentica con contraseña
   * 2) Persiste credenciales en almacenamiento seguro del dispositivo
   */
  async enableBiometric(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No hay usuario autenticado');
    }

    await this.reauthenticate(password);
    await this.setBiometricCredentials(user.email, password);
  }

  /**
   * Elimina credenciales biométricas almacenadas en el dispositivo.
   */
  async disableBiometric(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await NativeBiometric.deleteCredentials({ server: this.biometricServer });
  }

  /**
   * Verifica si existe acceso biométrico listo para usar.
   */
  async canUseBiometricLogin(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const availability = await NativeBiometric.isAvailable();
    if (!availability.isAvailable) {
      return false;
    }

    await NativeBiometric.getCredentials({ server: this.biometricServer });
    return true;
  }

  /**
   * Login usando biometría + credenciales almacenadas.
   */
  async loginWithBiometric(): Promise<User> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('La biometría solo está disponible en dispositivos nativos.');
    }

    const availability = await NativeBiometric.isAvailable();
    if (!availability.isAvailable) {
      throw new Error('La biometría no está disponible en este dispositivo.');
    }

    await NativeBiometric.verifyIdentity({
      reason: 'Ingresa de forma segura',
      title: 'MyDigitalWallet'
    });

    const credentials = await NativeBiometric.getCredentials({
      server: this.biometricServer
    });

    const email = credentials.username?.trim();
    const password = credentials.password;
    if (!email || !password) {
      throw new Error('Credenciales biométricas inválidas o incompletas.');
    }

    return this.loginWithEmail(email, password);
  }

  /**
   * Persiste credenciales para acceso biométrico rápido.
   */
  async setBiometricCredentials(email: string, password: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('La biometría solo está disponible en dispositivos nativos.');
    }

    const availability = await NativeBiometric.isAvailable();
    if (!availability.isAvailable) {
      throw new Error('La biometría no está disponible en este dispositivo.');
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      throw new Error('Credenciales inválidas para habilitar biometría.');
    }

    await NativeBiometric.setCredentials({
      username: normalizedEmail,
      password,
      server: this.biometricServer
    });
  }

  /**
   * Obtener el usuario actual de forma síncrona
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Obtener el UID del usuario actual
   */
  getCurrentUid(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  private async ensureGoogleInitialized(): Promise<void> {
    if (this.googleInitialized) {
      return;
    }

    const clientId = environment.googleWebClientId?.trim();
    if (!clientId || this.isPlaceholderValue(clientId)) {
      throw new Error(
        'Configura googleWebClientId en environment.ts para usar inicio de sesión con Google.'
      );
    }

    const initializeOptions: { clientId: string; redirectUrl?: string } = { clientId };
    if (Capacitor.getPlatform() === 'web') {
      initializeOptions.redirectUrl = environment.googleRedirectUrl?.trim() || `${window.location.origin}/login`;
    }

    try {
      await GoogleSignIn.initialize(initializeOptions);
      this.googleInitialized = true;
      console.log('✅ GoogleSignIn inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando GoogleSignIn:', error);
      throw new Error(`No se pudo inicializar Google Sign-In: ${error}`);
    }
  }

  private hasGoogleRedirectParams(): boolean {
    const hash = window.location.hash || '';
    return hash.includes('id_token') || hash.includes('error=');
  }

  private async loginWithGoogleResult(result: SignInResult): Promise<User> {
    if (!result.idToken) {
      throw new Error('Google no retornó idToken.');
    }

    return this.loginWithGoogle(result.idToken);
  }

  private ensureFirebaseConfigured(): void {
    const firebaseConfig = environment.firebaseConfig;
    const requiredValues = [
      firebaseConfig.apiKey,
      firebaseConfig.authDomain,
      firebaseConfig.projectId,
      firebaseConfig.storageBucket,
      firebaseConfig.messagingSenderId,
      firebaseConfig.appId
    ];

    const hasInvalidValue = requiredValues.some((value) => !value || this.isPlaceholderValue(value));
    if (hasInvalidValue) {
      throw new Error(
        'Firebase no está configurado. Reemplaza los placeholders en src/environments/environment.ts y environment.prod.ts.'
      );
    }
  }

  private isPlaceholderValue(value: string): boolean {
    return value.includes('YOUR_');
  }
}
