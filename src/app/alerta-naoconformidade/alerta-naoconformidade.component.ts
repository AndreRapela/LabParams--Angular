import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, finalize } from 'rxjs';
import { apiErrorMessage } from '../shared/http/api-error';
import { ApiPagination } from '../shared/pilot-workflow/api.types';
import {
  Alerta,
  AlertaNaoConformidadeService,
  AlertaStats,
  AlertaStatusFilter,
} from './alerta-naoconformidade.service';

const EMPTY_STATS: AlertaStats = {
  total: 0,
  alerta: 0,
  naoConforme: 0,
  critico: 0,
};

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerta-naoconformidade.component.html',
  styleUrls: ['./alerta-naoconformidade.component.css'],
})
export class AlertaNaoConformidadeComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<void>();
  private request?: Subscription;

  alertasFiltrados: Alerta[] = [];
  stats: AlertaStats = EMPTY_STATS;
  filtroTexto = '';
  filtroStatus: AlertaStatusFilter = '';
  isLoading = false;
  erroApi = '';

  page = 1;
  readonly pageSize = 20;
  pagination: ApiPagination = {
    page: 1,
    page_size: this.pageSize,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  };

  constructor(
    private readonly alertaNaoConformidadeService: AlertaNaoConformidadeService,
  ) {}

  ngOnInit(): void {
    this.searchChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  carregarDados(): void {
    this.request?.unsubscribe();
    this.isLoading = true;
    this.erroApi = '';

    this.request = this.alertaNaoConformidadeService
      .getAlertas({
        q: this.filtroTexto.trim() || undefined,
        status: this.filtroStatus || undefined,
        page: this.page,
        page_size: this.pageSize,
      })
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.handleError(response.error || 'A API não concluiu a consulta.');
            return;
          }
          this.alertasFiltrados = response.data;
          this.stats = response.stats;
          this.pagination = response.pagination;
          this.page = response.pagination.page;
        },
        error: (error: unknown) =>
          this.handleError(
            apiErrorMessage(error, 'Não foi possível carregar os alertas.'),
          ),
      });
  }

  agendarFiltroTexto(): void {
    this.searchChanges.next();
  }

  aplicarFiltros(): void {
    this.page = 1;
    this.carregarDados();
  }

  limparFiltros(): void {
    if (!this.filtroTexto && !this.filtroStatus) return;
    this.filtroTexto = '';
    this.filtroStatus = '';
    this.aplicarFiltros();
  }

  limparTexto(): void {
    if (!this.filtroTexto) return;
    this.filtroTexto = '';
    this.aplicarFiltros();
  }

  mudarPagina(page: number): void {
    if (
      this.isLoading ||
      page < 1 ||
      page > this.pagination.total_pages ||
      page === this.page
    ) {
      return;
    }
    this.page = page;
    this.carregarDados();
  }

  get rangeStart(): number {
    return this.pagination.total
      ? (this.page - 1) * this.pagination.page_size + 1
      : 0;
  }

  get rangeEnd(): number {
    return Math.min(
      this.page * this.pagination.page_size,
      this.pagination.total,
    );
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.filtroTexto.trim() || this.filtroStatus);
  }

  trackByAlertaId(_index: number, alerta: Alerta): number {
    return alerta.id;
  }

  private handleError(message: string): void {
    this.erroApi = message;
    this.alertasFiltrados = [];
    this.stats = EMPTY_STATS;
    this.pagination = {
      page: this.page,
      page_size: this.pageSize,
      total: 0,
      total_pages: 0,
      has_next: false,
      has_previous: false,
    };
  }
}
