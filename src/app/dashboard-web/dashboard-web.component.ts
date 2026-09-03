import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Subscription,
  finalize,
  forkJoin,
  retry,
  skip,
  timer,
  timeout,
} from 'rxjs';
import { ParametrosFilterService } from '../shared/filtro-parametros.service';
import { ApiPagination } from '../shared/pilot-workflow/api.types';
import {
  ComplianceData,
  ComplianceStatus,
  DashboardFilters,
  DashboardStatistics,
  DashboardWebService,
  Legislacao,
  Matriz,
} from './dashboard-web.service';

const EMPTY_STATISTICS: DashboardStatistics = {
  compliant_count: 0,
  alert_count: 0,
  critical_count: 0,
  non_compliant_count: 0,
  total_parameters: 0,
};

const EMPTY_PAGINATION: ApiPagination = {
  page: 1,
  page_size: 12,
  total: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
};

@Component({
  selector: 'app-dashboard-web',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-web.component.html',
  styleUrls: ['./dashboard-web.component.css'],
})
export class DashboardWebComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly numberFormatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  });
  private readonly relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', {
    numeric: 'auto',
  });
  private filterRequest?: Subscription;

  selectedMatriz: number | null = null;
  selectedLegislacao: number | null = null;
  filtroAmostraNumero = '';
  filtroDataColeta = '';
  filtroDataPublicacao = '';
  filtroStatus = '';
  filtroParametro: number[] = [];

  parameters: ComplianceData[] = [];
  legislacoes: Legislacao[] = [];
  matrizes: Matriz[] = [];
  statistics: DashboardStatistics = EMPTY_STATISTICS;
  pagination: ApiPagination = EMPTY_PAGINATION;
  page = 1;
  readonly pageSize = 12;

  loading = true;
  loadingFilters = true;
  error: string | null = null;
  lastUpdated = '';

  constructor(
    private readonly dashboardService: DashboardWebService,
    private readonly filtroService: ParametrosFilterService
  ) {}

  ngOnInit(): void {
    this.filtroParametro = this.filtroService.snapshot();
    this.loadInitialData();

    this.filtroService
      .get()
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((ids) => {
        this.filtroParametro = ids;
        this.filtrar();
      });
  }

  ngOnDestroy(): void {
    this.filterRequest?.unsubscribe();
  }

  loadInitialData(): void {
    this.page = 1;
    this.loading = true;
    this.loadingFilters = true;
    this.error = null;

    forkJoin({
      options: this.dashboardService.getFilterOptions(),
      dashboard: this.dashboardService.getDashboardData(this.buildFilters()),
    })
      .pipe(
        timeout(15_000),
        retry({ count: 2, delay: (_error, attempt) => timer(attempt * 750) }),
        finalize(() => {
          this.loading = false;
          this.loadingFilters = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ options, dashboard }) => {
          this.matrizes = [...options.matrizes].sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR')
          );
          this.legislacoes = [...options.legislacoes].sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR')
          );
          this.applyDashboard(dashboard);
        },
        error: (error: Error) => {
          this.error = error.message;
          this.parameters = [];
          this.statistics = EMPTY_STATISTICS;
          this.pagination = { ...EMPTY_PAGINATION, page_size: this.pageSize };
        },
      });
  }

  filtrar(resetPage = true): void {
    if (resetPage) this.page = 1;
    this.filterRequest?.unsubscribe();
    this.loading = true;
    this.error = null;

    this.filterRequest = this.dashboardService
      .getDashboardData(this.buildFilters())
      .pipe(
        timeout(15_000),
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => this.applyDashboard(response),
        error: (error: Error) => {
          this.error = error.message;
          this.parameters = [];
          this.statistics = EMPTY_STATISTICS;
          this.pagination = {
            ...EMPTY_PAGINATION,
            page: this.page,
            page_size: this.pageSize,
          };
        },
      });
  }

  limparFiltros(): void {
    this.selectedMatriz = null;
    this.selectedLegislacao = null;
    this.filtroAmostraNumero = '';
    this.filtroDataColeta = '';
    this.filtroDataPublicacao = '';
    this.filtroStatus = '';
    const hadParameterFilter = this.filtroParametro.length > 0;
    this.filtroService.clear();
    this.filtroParametro = [];
    if (!hadParameterFilter) this.filtrar();
  }

  removerMatriz(): void {
    this.selectedMatriz = null;
    this.filtrar();
  }

  removerLegislacao(): void {
    this.selectedLegislacao = null;
    this.filtrar();
  }

  mudarPagina(page: number): void {
    if (
      this.loading ||
      page < 1 ||
      page > this.pagination.total_pages ||
      page === this.page
    ) {
      return;
    }
    this.page = page;
    this.filtrar(false);
  }

  get rangeStart(): number {
    return this.pagination.total
      ? (this.page - 1) * this.pagination.page_size + 1
      : 0;
  }

  get rangeEnd(): number {
    return Math.min(
      this.page * this.pagination.page_size,
      this.pagination.total
    );
  }

  get hasActiveFilters(): boolean {
    return Boolean(
      this.selectedMatriz ||
        this.selectedLegislacao ||
        this.filtroAmostraNumero ||
        this.filtroDataColeta ||
        this.filtroDataPublicacao ||
        this.filtroStatus ||
        this.filtroParametro.length
    );
  }

  get nonCompliantTotal(): number {
    return this.statistics.non_compliant_count + this.statistics.critical_count;
  }

  getMatrizNome(id: number): string {
    return this.matrizes.find((matriz) => matriz.id === id)?.nome ?? `Matriz ${id}`;
  }

  getLegislacaoNome(id: number): string {
    return (
      this.legislacoes.find((legislacao) => legislacao.id === id)?.nome ??
      `Legislação ${id}`
    );
  }

  getStatusText(status: ComplianceStatus): string {
    const labels: Record<ComplianceStatus, string> = {
      conforme: 'Conforme',
      alerta: 'Alerta',
      critico: 'Crítico',
      'nao-conforme': 'Não conforme',
      informativo: 'Informativo',
    };
    return labels[status];
  }

  getStatusBadgeClass(status: ComplianceStatus): string {
    return `status-badge status-${status}`;
  }

  getUnit(parameter: ComplianceData): string {
    return parameter.unidade_medida ?? parameter.unit ?? '';
  }

  getMinimum(parameter: ComplianceData): number | undefined {
    return parameter.limite_minimo ?? parameter.min_limit;
  }

  getMaximum(parameter: ComplianceData): number | undefined {
    return parameter.limite_maximo ?? parameter.max_limit;
  }

  formatValue(value: number | string | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return typeof value === 'string' && value.trim() ? value : 'N/D';
    }
    return this.numberFormatter.format(Number(value));
  }

  getLimitLabel(parameter: ComplianceData): string {
    if (parameter.criterio_legal) return parameter.criterio_legal;
    const minimum = this.getMinimum(parameter);
    const maximum = this.getMaximum(parameter);
    const unit = this.getUnit(parameter);
    if (minimum !== undefined && maximum !== undefined) {
      return `${this.formatValue(minimum)} – ${this.formatValue(maximum)} ${unit}`.trim();
    }
    if (minimum !== undefined) return `Mínimo ${this.formatValue(minimum)} ${unit}`.trim();
    if (maximum !== undefined) return `Máximo ${this.formatValue(maximum)} ${unit}`.trim();
    return 'Critério informativo';
  }

  getTimeAgo(dateString: string): string {
    const timestamp = Date.parse(dateString);
    if (Number.isNaN(timestamp)) return 'Data não informada';

    const differenceMinutes = Math.round((timestamp - Date.now()) / 60_000);
    if (Math.abs(differenceMinutes) < 60) {
      return this.relativeTimeFormatter.format(differenceMinutes, 'minute');
    }

    const differenceHours = Math.round(differenceMinutes / 60);
    if (Math.abs(differenceHours) < 24) {
      return this.relativeTimeFormatter.format(differenceHours, 'hour');
    }

    return this.relativeTimeFormatter.format(Math.round(differenceHours / 24), 'day');
  }

  getProgressWidth(parameter: ComplianceData): string {
    if (parameter.porcentagem !== undefined) {
      return `${Math.min(100, Math.max(0, parameter.porcentagem))}%`;
    }

    const minimum = this.getMinimum(parameter) ?? 0;
    const maximum = this.getMaximum(parameter) ?? 1;
    if (maximum === minimum) return '50%';

    const numericValue = Number(parameter.current_value);
    if (!Number.isFinite(numericValue)) return '0%';
    const percentage = ((numericValue - minimum) / (maximum - minimum)) * 100;
    return `${Math.min(100, Math.max(0, percentage))}%`;
  }

  trackByParametroId(_index: number, item: ComplianceData): number {
    return item.id;
  }

  private buildFilters(): DashboardFilters {
    return {
      matrizId: this.selectedMatriz,
      legislacaoId: this.selectedLegislacao,
      amostra_numero: this.filtroAmostraNumero.trim() || undefined,
      parametro_id: this.filtroParametro.length ? this.filtroParametro : undefined,
      data_coleta: this.filtroDataColeta || undefined,
      data_publicacao: this.filtroDataPublicacao || undefined,
      status: this.filtroStatus || undefined,
      page: this.page,
      page_size: this.pageSize,
    };
  }

  private applyDashboard(response: {
    data: ComplianceData[];
    statistics: DashboardStatistics;
    last_updated: string;
    pagination: ApiPagination;
  }): void {
    this.parameters = response.data;
    this.statistics = response.statistics;
    this.pagination = response.pagination;
    this.page = response.pagination.page;
    const lastUpdated = new Date(response.last_updated);
    this.lastUpdated = Number.isNaN(lastUpdated.getTime())
      ? ''
      : lastUpdated.toLocaleString('pt-BR');
  }
}
