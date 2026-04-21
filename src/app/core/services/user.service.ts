import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { UserProfile } from '../../models/user.model';
import { Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {}

  /**
   * Obtiene el perfil del usuario actual
   */
  getUserProfile(uid: string): Observable<UserProfile> {
    return this.firestoreService.getDocument<UserProfile>(`users/${uid}`);
  }

  /**
   * Crea el perfil del usuario en Firestore tras el registro
   */
  async createUserProfile(data: Omit<UserProfile, 'createdAt'>): Promise<void> {
    const profile: any = {
      ...data,
      biometricEnabled: false,
      createdAt: Timestamp.now()
    };
    const ref = this.firestoreService.getDocRef(`users/${data.uid}`);
    const { setDoc } = await import('@angular/fire/firestore');
    await setDoc(ref, profile);
  }

  /**
   * Actualiza campos del perfil del usuario
   */
  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    return this.firestoreService.updateDocument(`users/${uid}`, data);
  }

  /**
   * Habilita o deshabilita la biometría
   */
  async toggleBiometric(uid: string, enabled: boolean): Promise<void> {
    return this.updateUserProfile(uid, { biometricEnabled: enabled });
  }

  /**
   * Actualiza el token FCM del usuario
   */
  async updateFcmToken(uid: string, token: string): Promise<void> {
    return this.updateUserProfile(uid, { fcmToken: token } as any);
  }
  /**
   * Asegura que el perfil del usuario exista en Firestore.
   * Útil para inicios de sesión con Google donde no hay un paso de registro previo.
   */
  async ensureUserProfileExists(uid: string, email: string, displayName?: string): Promise<void> {
    try {
      const doc = await this.firestoreService.getDocumentOnce<UserProfile>(`users/${uid}`);
      
      if (!doc) {
        console.log('[UserService] Perfil no encontrado, creando perfil básico para Google Login...');
        const nameParts = displayName ? displayName.split(' ') : [];
        const nombre = nameParts[0] || 'Usuario';
        const apellido = nameParts.slice(1).join(' ') || '';

        const profile: Omit<UserProfile, 'createdAt'> = {
          uid,
          nombre,
          apellido,
          email,
          tipoDocumento: 'CC', // Valor por defecto
          numeroDocumento: 'Pendiente',
          pais: 'Colombia', // Valor por defecto
          biometricEnabled: false
        };

        await this.createUserProfile(profile);
      }
    } catch (error) {
      console.error('[UserService] Error al asegurar el perfil del usuario:', error);
      throw error;
    }
  }
}
