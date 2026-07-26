import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DashboardTvService,
  ComplianceData,
  DashboardTvResponse,
} from './dashboardtv.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ParametrosFilterService } from '../shared/filtro-parametros.service';

@Component({
  selector: 'app-dashboard-tv',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-tv.component.html',
  styleUrls: ['./dashboard-tv.component.css'],
})
export class DashboardTvComponent implements OnInit, OnDestroy {
  dashboardData: DashboardTvResponse | null = null;
  loading: boolean = true;
  error: string | null = null;



  private refreshSubscription!: Subscription;
  private filtroSubscription!: Subscription;


  constructor(
    private dashboardService: DashboardTvService,
    private filtroService: ParametrosFilterService,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    this.listenFiltroParametros();
    this.setupAutoRefresh();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) this.refreshSubscription.unsubscribe();
    if (this.filtroSubscription) this.filtroSubscription.unsubscribe();
  }

  // duas casas após o ponto no parâmetro
  formatValue(value: any): string {
    const num = parseFloat(value);

    if (isNaN(num)) {
      return '0.00';
    }

    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(num)
      .replace(',', '.'); // ← Adicione esta linha
  }

  // Atualização automática a cada 30s
  setupAutoRefresh(): void {
    this.refreshSubscription = interval(30000)
      .pipe(switchMap(() => this.dashboardService.getDashboardData()))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.loading = false;
        },
        error: (e) => console.error('Erro na atualização automática:', e),
      });
  }

listenFiltroParametros(): void {
  this.filtroSubscription = this.filtroService.get().subscribe(ids => {
    this.loadDashboardData(ids);
  });
}


  // Carregamento inicial
  loadDashboardData(parametroIds: number[] = []): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDashboardData(parametroIds).subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erro ao carregar dados do dashboard';
        this.loading = false;
      },
    });
  }

  // ============================================================
  // NORMALIZAR STATUS (SEM ACENTO / SEM ESPAÇO)
  // ============================================================

  normalizeStatus(status: string): string {
    return status
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/\s+/g, '-'); // troca espaços por "-"
  }

  // ============================================================
  // CLASSES DE LAYOUT - ATUALIZADAS PARA O NOVO TEMPLATE
  // ============================================================

  getStatusBadgeClass(status: string): string {
    const normalized = this.normalizeStatus(status);

    const statusMap: { [key: string]: string } = {
      conforme: 'status-conforme',
      alerta: 'status-alerta',
      critico: 'status-critico',
      'nao-conforme': 'status-nao-conforme',
    };

    return statusMap[normalized] || 'status-nao-conforme';
  }

  getProgressBarClass(status: string): string {
    const normalized = this.normalizeStatus(status);

    const progressMap: { [key: string]: string } = {
      conforme: 'progress-bar-conforme',
      alerta: 'progress-bar-alerta',
      critico: 'progress-bar-critico',
      'nao-conforme': 'progress-bar-nao-conforme',
    };

    return progressMap[normalized] || 'progress-bar-nao-conforme';
  }

  // ============================================================
  // ÍCONES DE STATUS
  // ============================================================

  getStatusIcon(status: string): string {
    const normalized = this.normalizeStatus(status);

    switch (normalized) {
      case 'conforme':
        return 'fas fa-check-circle';
      case 'alerta':
        return 'fas fa-exclamation-triangle';
      case 'critico':
        return 'fas fa-times-circle';
      case 'nao-conforme':
        return 'fas fa-ban';
      default:
        return 'fas fa-question-circle';
    }
  }

  // ============================================================
  // TEXTO DO STATUS - ATUALIZADO PARA "ATENÇÃO"
  // ============================================================

  getStatusText(status: string): string {
    const normalized = this.normalizeStatus(status);

    switch (normalized) {
      case 'conforme':
        return 'Conforme';
      case 'alerta':
        return 'Atenção'; // Mudado de "Alerta" para "Atenção"
      case 'critico':
        return 'Crítico';
      case 'nao-conforme':
        return 'Não Conforme';
      default:
        return status;
    }
  }

  // ============================================================
  // PROGRESS BAR
  // ============================================================

  getProgressBarWidth(param: ComplianceData): string {
    if (param.current_value < param.limite_minimo) return '0%';
    if (param.current_value > param.limite_maximo) return '100%';

    const range = param.limite_maximo - param.limite_minimo;
    if (range === 0) return '0%';

    const calc = ((param.current_value - param.limite_minimo) / range) * 100;
    return `${Math.min(Math.max(calc, 0), 100)}%`;
  }

  // ============================================================
  // TEMPO RELATIVO
  // ============================================================

  getTimeAgo(lastUpdate: string): string {
    try {
      const now = new Date();
      const update = new Date(lastUpdate);
      const diff = now.getTime() - update.getTime();

      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (mins < 1) return 'Agora mesmo';
      if (mins < 60) return `${mins} min atrás`;

      if (hours < 24) {
        const remainingMins = mins % 60;
        // Formato: "1h3 min atrás", "3h56 min atrás"
        return `${hours}h${remainingMins} min atrás`;
      }

      return `${days}d atrás`;
    } catch {
      return 'Data inválida';
    }
  }

  // ============================================================
  // GETTERS SEGUROS PARA O TEMPLATE
  // ============================================================

  get parameters(): ComplianceData[] {
    return this.dashboardData?.data || [];
  }

  get compliantCount(): number {
    return this.dashboardData?.compliant_count || 0;
  }

  get alertCount(): number {
    return this.dashboardData?.alert_count || 0;
  }

  get criticalCount(): number {
    return this.dashboardData?.critical_count || 0;
  }

  get nonCompliantCount(): number {
    return this.dashboardData?.non_compliant_count || 0;
  }

  get totalParameters(): number {
    return this.dashboardData?.total_parameters || 0;
  }

  get lastUpdated(): string {
    return this.dashboardData?.last_updated || '';
  }

  get hasData(): boolean {
    return !this.loading && !this.error && this.parameters.length > 0;
  }

  get isEmpty(): boolean {
    return !this.loading && !this.error && this.parameters.length === 0;
  }

  get complianceRate(): number {
    return this.totalParameters === 0
      ? 0
      : (this.compliantCount / this.totalParameters) * 100;
  }
}
