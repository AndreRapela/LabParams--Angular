import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmationRequest extends Required<ConfirmationOptions> {
  resolve: (result: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly requests = new Subject<ConfirmationRequest>();
  readonly requests$ = this.requests.asObservable();

  confirm(options: string | ConfirmationOptions): Promise<boolean> {
    const normalized = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      this.requests.next({
        title: normalized.title ?? 'Confirmar ação',
        message: normalized.message,
        confirmLabel: normalized.confirmLabel ?? 'Confirmar',
        cancelLabel: normalized.cancelLabel ?? 'Cancelar',
        danger: normalized.danger ?? false,
        resolve,
      });
    });
  }
}
