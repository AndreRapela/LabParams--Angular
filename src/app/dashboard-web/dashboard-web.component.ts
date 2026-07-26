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
        },
      });
  }

  filtrar(): void {
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
    this.filtroService.clear();
    this.filtroParametro = [];
    this.filtrar();
  }

  removerMatriz(): void {
    this.selectedMatriz = null;
    this.filtrar();
  }

  removerLegislacao(): void {
    this.selectedLegislacao = null;
    this.filtrar();
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

  formatValue(value: number | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'N/D';
    }
    return this.numberFormatter.format(Number(value));
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

    const percentage = ((parameter.current_value - minimum) / (maximum - minimum)) * 100;
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
    };
  }

  private applyDashboard(response: {
    data: ComplianceData[];
    statistics: DashboardStatistics;
    last_updated: string;
  }): void {
    this.parameters = response.data;
    this.statistics = response.statistics;
    this.lastUpdated = new Date(response.last_updated).toLocaleString('pt-BR');
  }
}
