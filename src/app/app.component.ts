import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  private readonly authSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      if (user) {
        void this.notificationService.initPushNotifications(user.uid);
        return;
      }

      void this.notificationService.clearPushSession();
    });
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}
