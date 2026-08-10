import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationRequest, ConfirmationService } from './confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="request" class="confirm-backdrop" role="presentation" (click)="finish(false)">
      <section class="confirm-dialog" role="alertdialog" aria-modal="true" [attr.aria-labelledby]="'confirm-title'" [attr.aria-describedby]="'confirm-message'" (click)="$event.stopPropagation()">
        <span class="confirm-icon" [class.danger]="request.danger" aria-hidden="true">
          <i class="fa-solid" [ngClass]="request.danger ? 'fa-triangle-exclamation' : 'fa-circle-question'"></i>
        </span>
        <h2 id="confirm-title">{{ request.title }}</h2>
        <p id="confirm-message">{{ request.message }}</p>
        <div class="confirm-actions">
          <button type="button" class="cancel" (click)="finish(false)">{{ request.cancelLabel }}</button>
          <button type="button" class="confirm" [class.danger]="request.danger" (click)="finish(true)">{{ request.confirmLabel }}</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .confirm-backdrop { position: fixed; z-index: 2400; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(12,25,39,.58); backdrop-filter: blur(3px); }
    .confirm-dialog { width: min(100%, 27rem); padding: 1.5rem; border-radius: 1rem; background: #fff; box-shadow: 0 24px 70px rgba(0,0,0,.28); text-align: center; }
    .confirm-icon { width: 3rem; height: 3rem; margin: 0 auto .8rem; display: grid; place-items: center; border-radius: 50%; color: var(--primary-dark); background: var(--primary-light); font-size: 1.25rem; }
    .confirm-icon.danger { color: #a42b35; background: #fff0f1; }
    h2 { margin: 0; font-size: 1.15rem; }
    p { margin: .55rem 0 1.25rem; color: var(--text-muted); line-height: 1.5; }
    .confirm-actions { display: flex; justify-content: center; gap: .65rem; }
    button { min-height: 2.6rem; padding: .55rem 1rem; border: 1px solid var(--border-color); border-radius: .65rem; font-weight: 750; cursor: pointer; }
    .cancel { color: var(--text-dark); background: #fff; }
    .confirm { border-color: var(--primary-color); color: #fff; background: var(--primary-color); }
    .confirm.danger { border-color: var(--danger-color); background: var(--danger-color); }
  `],
})
export class ConfirmationDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  request: ConfirmationRequest | null = null;

  constructor(confirmations: ConfirmationService) {
    confirmations.requests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((request) => {
        this.request?.resolve(false);
        this.request = request;
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.finish(false);
  }

  finish(result: boolean): void {
    if (!this.request) return;
    const request = this.request;
    this.request = null;
    request.resolve(result);
  }
}
