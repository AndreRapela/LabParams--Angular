import { AsyncPipe, NgClass, NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [AsyncPipe, NgClass, NgFor],
  template: `
    <section class="toast-stack" aria-live="polite" aria-label="Notificações">
      <article
        *ngFor="let notification of notifications.notifications$ | async"
        class="app-toast"
        [ngClass]="'toast-' + notification.kind"
        [attr.role]="notification.kind === 'error' ? 'alert' : 'status'"
      >
        <i class="fa-solid" [ngClass]="icon(notification.kind)" aria-hidden="true"></i>
        <span>{{ notification.message }}</span>
        <button type="button" (click)="notifications.dismiss(notification.id)" aria-label="Fechar notificação">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </article>
    </section>
  `,
  styles: [`
    .toast-stack { position: fixed; z-index: 2500; top: 1rem; right: 1rem; width: min(25rem, calc(100vw - 2rem)); display: grid; gap: .65rem; pointer-events: none; }
    .app-toast { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .7rem; padding: .85rem .9rem; border: 1px solid #cfe0ec; border-radius: .8rem; color: #213348; background: #fff; box-shadow: 0 16px 40px rgba(20,48,75,.18); pointer-events: auto; animation: toast-in 180ms ease-out; }
    .toast-success { border-left: 4px solid var(--success-color); }
    .toast-error { border-left: 4px solid var(--danger-color); }
    .toast-warning { border-left: 4px solid var(--warning-color); }
    .toast-info { border-left: 4px solid var(--primary-color); }
    .toast-success > i { color: var(--success-color); }
    .toast-error > i { color: var(--danger-color); }
    .toast-warning > i { color: var(--warning-color); }
    .toast-info > i { color: var(--primary-color); }
    button { width: 2rem; height: 2rem; border: 0; border-radius: .5rem; color: #607086; background: transparent; cursor: pointer; }
    button:hover { background: #eef3f7; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(-.4rem); } }
  `],
})
export class ToastContainerComponent {
  constructor(readonly notifications: NotificationService) {}

  icon(kind: string): string {
    if (kind === 'success') return 'fa-circle-check';
    if (kind === 'error') return 'fa-circle-exclamation';
    if (kind === 'warning') return 'fa-triangle-exclamation';
    return 'fa-circle-info';
  }
}
