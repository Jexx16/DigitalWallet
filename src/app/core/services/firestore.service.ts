import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentReference,
  CollectionReference
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: Firestore) {}

  /**
   * Obtiene una referencia a una colección
   */
  getCollectionRef(path: string): CollectionReference {
    return collection(this.firestore, path);
  }

  /**
   * Obtiene una referencia a un documento
   */
  getDocRef(path: string): DocumentReference {
    return doc(this.firestore, path);
  }

  /**
   * Obtiene todos los documentos de una colección como Observable
   */
  getCollection<T>(path: string): Observable<T[]> {
    const ref = collection(this.firestore, path);
    return collectionData(ref, { idField: 'id' }) as Observable<T[]>;
  }

  /**
   * Obtiene un documento por su path como Observable
   */
  getDocument<T>(path: string): Observable<T> {
    const ref = doc(this.firestore, path);
    return docData(ref, { idField: 'id' }) as Observable<T>;
  }

  /**
   * Agrega un nuevo documento a una colección
   */
  async addDocument(path: string, data: any): Promise<DocumentReference> {
    const ref = collection(this.firestore, path);
    return addDoc(ref, data);
  }

  /**
   * Actualiza un documento existente
   */
  async updateDocument(path: string, data: any): Promise<void> {
    const ref = doc(this.firestore, path);
    return updateDoc(ref, data);
  }

  /**
   * Elimina un documento
   */
  async deleteDocument(path: string): Promise<void> {
    const ref = doc(this.firestore, path);
    return deleteDoc(ref);
  }

  /**
   * Obtiene una colección con query personalizada
   */
  getCollectionWithQuery<T>(
    path: string,
    fieldPath: string,
    operator: any,
    value: any,
    orderField?: string,
    limitCount?: number
  ): Observable<T[]> {
    const ref = collection(this.firestore, path);
    let q = query(ref, where(fieldPath, operator, value));

    if (orderField) {
      q = query(ref, where(fieldPath, operator, value), orderBy(orderField, 'desc'));
    }

    if (limitCount) {
      q = query(ref, where(fieldPath, operator, value), orderBy(orderField || fieldPath, 'desc'), limit(limitCount));
    }

    return collectionData(q, { idField: 'id' }) as Observable<T[]>;
  }
}
