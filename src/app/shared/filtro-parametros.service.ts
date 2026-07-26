// src/app/shared/parametros-filter.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ParametrosFilterService {
  private readonly parametrosAtivos$ = new BehaviorSubject<number[]>([]);

  set(ids: number[]): void {
    const uniqueIds = [...new Set(ids.map(Number).filter((id) => id > 0))];
    if (this.areEqual(uniqueIds, this.parametrosAtivos$.value)) return;
    this.parametrosAtivos$.next(uniqueIds);
  }

  get(): Observable<number[]> {
    return this.parametrosAtivos$.asObservable();
  }

  snapshot(): number[] {
    return [...this.parametrosAtivos$.value];
  }

  clear(): void {
    if (this.parametrosAtivos$.value.length) {
      this.parametrosAtivos$.next([]);
    }
  }

  private areEqual(first: number[], second: number[]): boolean {
    return first.length === second.length && first.every((id) => second.includes(id));
  }
}
