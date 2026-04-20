import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { EmojiEvent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { Subscription, filter, firstValueFrom, take } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CardService } from '../../core/services/card.service';
import { PaymentService } from '../../core/services/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { Card } from '../../models/card.model';
import { Transaction } from '../../models/transaction.model';
import { UserProfile } from '../../models/user.model';

@Component({
  standalone: false,
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  cards: Card[] = [];
  activeCardId: string | null = null;
  transactions: Transaction[] = [];
  balance = 0;
  loadingCards = true;
  loadingTransactions = true;
  showEmojiPicker = false;
  selectedTransaction: Transaction | null = null;

  private uid: string | null = null;
  private cardsSub?: Subscription;
  private allTransactionsSub?: Subscription;
  private cardTransactionsSub?: Subscription;
  private profileSub?: Subscription;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cardService: CardService,
    private paymentService: PaymentService,
    private toastService: ToastService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.cardsSub?.unsubscribe();
    this.allTransactionsSub?.unsubscribe();
    this.cardTransactionsSub?.unsubscribe();
    this.profileSub?.unsubscribe();
  }

  async onAction(action: 'transfer' | 'pay' | 'add' | 'history'): Promise<void> {
    if (action === 'transfer') {
      await this.router.navigate(['/transfer']);
      return;
    }

    if (action === 'pay') {
      const queryParams = this.activeCardId ? { cardId: this.activeCardId } : {};
      await this.router.navigate(['/payment'], { queryParams });
      return;
    }

    if (action === 'add') {
      await this.router.navigate(['/add-card']);
      return;
    }

    if (action === 'history') {
      document.getElementById('transaction-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }

  onCardSelected(cardId: string): void {
    this.activeCardId = cardId;
    this.subscribeToCardTransactions();
  }

  onTransactionLongPress(transaction: Transaction): void {
    this.selectedTransaction = transaction;
    this.showEmojiPicker = true;
  }

  async onEmojiSelected(event: EmojiEvent): Promise<void> {
    if (!this.uid || !this.selectedTransaction?.id) {
      this.closeEmojiPicker();
      return;
    }

    const emoji = event.emoji.native;
    if (!emoji) {
      this.closeEmojiPicker();
      return;
    }

    try {
      await this.paymentService.updateTransactionEmoji(
        this.uid,
        this.selectedTransaction.id,
        emoji
      );
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    } finally {
      this.closeEmojiPicker();
    }
  }

  closeEmojiPicker(): void {
    this.showEmojiPicker = false;
    this.selectedTransaction = null;
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      await this.toastService.show('✅ Sesión cerrada.');
      await this.router.navigate(['/login']);
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    }
  }

  private async loadDashboardData(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.authService.currentUser$.pipe(
          filter((authUser: User | null): authUser is User => !!authUser),
          take(1)
        )
      );

      this.uid = user.uid;
      this.subscribeToProfile();
      this.subscribeToCards();
      this.subscribeToAllTransactions();
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    }
  }

  private subscribeToProfile(): void {
    if (!this.uid) {
      return;
    }

    this.profileSub = this.userService.getUserProfile(this.uid).subscribe({
      next: (profile) => {
        this.userProfile = profile;
      },
      error: async (error) => {
        await this.toastService.showError(this.getErrorMessage(error));
      }
    });
  }

  private subscribeToCards(): void {
    if (!this.uid) {
      return;
    }

    this.loadingCards = true;
    this.cardsSub = this.cardService.getCards(this.uid).subscribe({
      next: (cards) => {
        this.cards = cards;
        if (cards.length === 0) {
          this.activeCardId = null;
          this.transactions = [];
          this.loadingCards = false;
          this.loadingTransactions = false;
          return;
        }

        // Buscar tarjeta por defecto, o usar la primera si no existe
        const defaultCard = cards.find((card) => card.isDefault);
        const cardStillExists = cards.some((card) => card.id === this.activeCardId);
        
        if (defaultCard) {
          this.activeCardId = defaultCard.id;
        } else if (!cardStillExists) {
          this.activeCardId = cards[0].id;
        }

        this.loadingCards = false;
        this.subscribeToCardTransactions();
      },
      error: async (error) => {
        this.loadingCards = false;
        await this.toastService.showError(this.getErrorMessage(error));
      }
    });
  }

  private subscribeToAllTransactions(): void {
    if (!this.uid) {
      return;
    }

    this.allTransactionsSub = this.paymentService.getAllTransactions(this.uid).subscribe({
      next: (transactions) => {
        this.balance = transactions.reduce((acc, tx) => acc - tx.amount, 0);
      },
      error: async (error) => {
        await this.toastService.showError(this.getErrorMessage(error));
      }
    });
  }

  private subscribeToCardTransactions(): void {
    if (!this.uid || !this.activeCardId) {
      this.transactions = [];
      this.loadingTransactions = false;
      return;
    }

    this.loadingTransactions = true;
    this.cardTransactionsSub?.unsubscribe();
    this.cardTransactionsSub = this.paymentService
      .getTransactionsByCard(this.uid, this.activeCardId, 10)
      .subscribe({
        next: (transactions) => {
          this.transactions = transactions;
          this.loadingTransactions = false;
        },
        error: async (error) => {
          this.loadingTransactions = false;
          await this.toastService.showError(this.getErrorMessage(error));
        }
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Ocurrió un error inesperado.';
  }
}
