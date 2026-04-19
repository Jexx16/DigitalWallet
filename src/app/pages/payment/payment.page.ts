import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Subscription, filter, firstValueFrom, take } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CardService } from '../../core/services/card.service';
import { LoadingService } from '../../core/services/loading.service';
import { ModalService } from '../../core/services/modal.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentService } from '../../core/services/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { Card } from '../../models/card.model';
import { UserProfile } from '../../models/user.model';
import { PaymentSimulatorComponent } from '../../shared/components/payment-simulator/payment-simulator.component';

@Component({
  standalone: false,
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit, OnDestroy {
  cards: Card[] = [];
  selectedCardId: string | null = null;
  userProfile: UserProfile | null = null;
  loading = true;
  processing = false;

  private uid: string | null = null;
  private cardsSub?: Subscription;
  private profileSub?: Subscription;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cardService: CardService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    private toastService: ToastService,
    private modalService: ModalService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  ngOnDestroy(): void {
    this.cardsSub?.unsubscribe();
    this.profileSub?.unsubscribe();
  }

  get selectedCard(): Card | undefined {
    return this.cards.find((card) => card.id === this.selectedCardId);
  }

  onCardSelected(cardId: string): void {
    this.selectedCardId = cardId;
  }

  async openSimulator(): Promise<void> {
    if (!this.uid || !this.selectedCard || this.processing) {
      return;
    }

    const result = await this.modalService.open(
      PaymentSimulatorComponent,
      { cardLastFour: this.selectedCard.cardNumber },
      'payment-simulator-modal'
    ) as PaymentModalResult | null;

    if (!result) {
      return;
    }

    await this.confirmPayment(result);
  }

  async goToAddCard(): Promise<void> {
    await this.router.navigate(['/add-card']);
  }

  private async loadData(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.authService.currentUser$.pipe(
          filter((authUser: User | null): authUser is User => !!authUser),
          take(1)
        )
      );

      this.uid = user.uid;
      this.subscribeUserProfile();
      this.subscribeCards();
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    }
  }

  private subscribeUserProfile(): void {
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

  private subscribeCards(): void {
    if (!this.uid) {
      return;
    }

    this.cardsSub = this.cardService.getCards(this.uid).subscribe({
      next: (cards) => {
        this.cards = cards;
        this.loading = false;

        if (cards.length === 0) {
          this.selectedCardId = null;
          return;
        }

        const queryCardId = this.route.snapshot.queryParamMap.get('cardId');
        const validQueryCard = !!queryCardId && cards.some((card) => card.id === queryCardId);
        this.selectedCardId = validQueryCard ? queryCardId : cards[0].id;
      },
      error: async (error) => {
        this.loading = false;
        await this.toastService.showError(this.getErrorMessage(error));
      }
    });
  }

  private async confirmPayment(result: PaymentModalResult): Promise<void> {
    if (!this.uid || !this.selectedCard) {
      await this.toastService.showError('Selecciona una tarjeta para continuar.');
      return;
    }

    this.processing = true;
    await this.loadingService.show('Procesando pago...');
    try {
      await this.paymentService.processPayment(this.uid, {
        cardId: this.selectedCard.id,
        merchant: result.merchant,
        amount: result.amount
      }, !!this.userProfile?.biometricEnabled);

      await Haptics.impact({ style: ImpactStyle.Medium });

      if (this.userProfile?.fcmToken) {
        await this.notificationService.sendPush(
          this.userProfile.fcmToken,
          'Pago Exitoso',
          `Pago por ${this.formatCurrency(result.amount)} en ${result.merchant}`
        );
      }

      await this.toastService.showSuccess('Pago realizado con éxito');
      await this.router.navigate(['/home']);
    } catch (error) {
      await this.toastService.showError(this.getErrorMessage(error));
    } finally {
      this.processing = false;
      await this.loadingService.hide();
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'No fue posible completar el pago.';
  }
}

interface PaymentModalResult {
  merchant: string;
  amount: number;
}
