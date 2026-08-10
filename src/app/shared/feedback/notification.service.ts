import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationKind = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly state = new BehaviorSubject<AppNotification[]>([]);
  private nextId = 1;

  readonly notifications$ = this.state.asObservable();

  show(message: string, kind: NotificationKind = 'info', durationMs = 5000): number {
    const id = this.nextId++;
    this.state.next([...this.state.value, { id, kind, message }]);
    if (durationMs > 0) window.setTimeout(() => this.dismiss(id), durationMs);
    return id;
  }

  success(message: string): number {
    return this.show(message, 'success');
  }

  error(message: string): number {
    return this.show(message, 'error', 7000);
  }

  warning(message: string): number {
    return this.show(message, 'warning', 6500);
  }

  dismiss(id: number): void {
    this.state.next(this.state.value.filter((notification) => notification.id !== id));
  }
}
