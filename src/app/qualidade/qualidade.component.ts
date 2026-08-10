import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../acessos/auth/auth.service';
import { NotificationService } from '../shared/feedback/notification.service';
import { apiErrorMessage } from '../shared/http/api-error';
import {
  AcaoCapa,
  CapaInput,
  OccurrenceInput,
  OcorrenciaQualidade,
  QualidadeService,
  QualitySummary,
  ResponsibleUser,
  StatusCapa,
  StatusOcorrencia,
} from './qualidade.service';

@Component({
  selector: 'app-qualidade',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qualidade.component.html',
  styleUrls: ['../shared/styles/module-page.css', './qualidade.component.css'],
})
export class QualidadeComponent implements OnInit {
  occurrences: OcorrenciaQualidade[] = [];
  selected: OcorrenciaQualidade | null = null;
  responsibles: ResponsibleUser[] = [];
  summary: QualitySummary = {
    ocorrencias_abertas: 0,
    criticas_abertas: 0,
    ocorrencias_vencidas: 0,
    acoes_capa_vencidas: 0,
    encerradas_no_mes: 0,
  };
  search = '';
  status = '';
  type = '';
  overdueOnly = false;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;
  detailLoading = false;
  saving = false;
  showCreate = false;
  showCapa = false;
  showDecision = false;
  canOperate = false;
  isManager = false;
  selectedAction: AcaoCapa | null = null;
  actionMode: 'complete' | 'cancel' | null = null;

  newOccurrence: OccurrenceInput = this.emptyOccurrence();
  newCapa: CapaInput = this.emptyCapa();
  decision: {
    status: StatusOcorrencia;
    decisao: string;
    causa_raiz: string;
    verificacao_eficacia: string;
  } = this.emptyDecision();
  actionUpdate: { evidencia: string; motivo: string } = {
    evidencia: '',
    motivo: '',
  };

  readonly statuses: StatusOcorrencia[] = [
    'ABERTA',
    'EM_INVESTIGACAO',
    'PLANO_ACAO',
    'VERIFICACAO',
    'ENCERRADA',
    'CANCELADA',
  ];

  constructor(
    private readonly quality: QualidadeService,
    private readonly auth: AuthService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    void this.initialize();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get allowedTransitions(): StatusOcorrencia[] {
    if (!this.selected) return [];
    const transitions: Record<StatusOcorrencia, StatusOcorrencia[]> = {
      ABERTA: ['EM_INVESTIGACAO', 'CANCELADA'],
      EM_INVESTIGACAO: ['PLANO_ACAO', 'CANCELADA'],
      PLANO_ACAO: ['VERIFICACAO', 'CANCELADA'],
      VERIFICACAO: ['ENCERRADA', 'PLANO_ACAO'],
      ENCERRADA: ['EM_INVESTIGACAO'],
      CANCELADA: ['ABERTA'],
    };
    return transitions[this.selected.status];
  }

  load(page = 1): void {
    this.loading = true;
    this.page = page;
    forkJoin({
      list: this.quality.list({
        page,
        pageSize: this.pageSize,
        search: this.search.trim(),
        status: this.status,
        tipo: this.type,
        vencidas: this.overdueOnly,
      }),
      summary: this.quality.summary(),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ list, summary }) => {
          this.occurrences = list.data;
          this.total = list.meta.total;
          this.page = list.meta.page;
          this.summary = summary.data;
        },
        error: (error: unknown) => {
          this.occurrences = [];
          this.total = 0;
          this.notifications.error(
            apiErrorMessage(
              error,
              'Não foi possível carregar o módulo da qualidade.',
            ),
          );
        },
      });
  }

  select(occurrence: OcorrenciaQualidade): void {
    this.selected = occurrence;
    this.detailLoading = true;
    this.showCapa = false;
    this.showDecision = false;
    this.selectedAction = null;
    this.actionMode = null;
    this.quality
      .get(occurrence.id)
      .pipe(finalize(() => (this.detailLoading = false)))
      .subscribe({
        next: (response) => {
          this.selected = response.data;
          this.showDecision = false;
          this.selectedAction = null;
        },
        error: (error: unknown) =>
          this.notifications.error(
            apiErrorMessage(error, 'Não foi possível abrir a ocorrência.'),
          ),
      });
  }

  saveOccurrence(): void {
    if (this.saving) return;
    this.saving = true;
    this.quality
      .create(this.newOccurrence)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.notifications.success(
            `Ocorrência ${response.data.codigo} registrada.`,
          );
          this.newOccurrence = this.emptyOccurrence();
          this.showCreate = false;
          this.load(1);
          this.select(response.data);
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  saveCapa(): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.quality
      .createAction(this.selected.id, this.newCapa)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.notifications.success('Ação CAPA adicionada ao plano.');
          this.newCapa = this.emptyCapa();
          this.showCapa = false;
          this.refreshSelected();
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  openDecision(): void {
    this.decision = this.emptyDecision();
    this.decision.status = this.allowedTransitions[0] || 'EM_INVESTIGACAO';
    this.decision.causa_raiz = this.selected?.causa_raiz || '';
    this.decision.verificacao_eficacia =
      this.selected?.verificacao_eficacia || '';
    this.showDecision = true;
  }

  saveDecision(): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.quality
      .decide(this.selected.id, {
        status: this.decision.status,
        decisao: this.decision.decisao,
        causa_raiz: this.decision.causa_raiz || undefined,
        verificacao_eficacia: this.decision.verificacao_eficacia || undefined,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.notifications.success(
            'Decisão da qualidade registrada na trilha de auditoria.',
          );
          this.showDecision = false;
          this.refreshSelected();
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  startAction(action: AcaoCapa): void {
    this.updateAction(action, 'EM_ANDAMENTO');
  }

  openAction(action: AcaoCapa, mode: 'complete' | 'cancel'): void {
    this.selectedAction = action;
    this.actionMode = mode;
    this.actionUpdate = { evidencia: '', motivo: '' };
  }

  saveAction(): void {
    if (
      !this.selected ||
      !this.selectedAction ||
      !this.actionMode ||
      this.saving
    )
      return;
    if (this.actionMode === 'cancel') {
      this.saving = true;
      this.quality
        .cancelAction(
          this.selected.id,
          this.selectedAction.id,
          this.actionUpdate.motivo,
        )
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => this.afterAction('Ação CAPA cancelada.'),
          error: (error: unknown) =>
            this.notifications.error(apiErrorMessage(error)),
        });
      return;
    }
    this.updateAction(
      this.selectedAction,
      'CONCLUIDA',
      this.actionUpdate.evidencia,
    );
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      ABERTA: 'Aberta',
      EM_INVESTIGACAO: 'Em investigação',
      PLANO_ACAO: 'Plano de ação',
      VERIFICACAO: 'Verificação',
      ENCERRADA: 'Encerrada',
      CANCELADA: 'Cancelada',
      PENDENTE: 'Pendente',
      EM_ANDAMENTO: 'Em andamento',
      CONCLUIDA: 'Concluída',
    };
    return labels[status] || status.replaceAll('_', ' ');
  }

  date(value: string | null | undefined): string {
    if (!value) return 'Sem prazo';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
      new Date(`${value.slice(0, 10)}T00:00:00Z`),
    );
  }

  timestamp(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  closeDetail(): void {
    this.selected = null;
    this.showCapa = false;
    this.showDecision = false;
    this.selectedAction = null;
    this.actionMode = null;
    this.detailLoading = false;
  }

  private updateAction(
    action: AcaoCapa,
    status: Exclude<StatusCapa, 'CANCELADA'>,
    evidencia?: string,
  ): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.quality
      .updateAction(this.selected.id, action.id, { status, evidencia })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () =>
          this.afterAction(
            status === 'CONCLUIDA'
              ? 'Ação CAPA concluída com evidência.'
              : 'Ação CAPA iniciada.',
          ),
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  private afterAction(message: string): void {
    this.notifications.success(message);
    this.selectedAction = null;
    this.actionMode = null;
    this.refreshSelected();
  }

  private refreshSelected(): void {
    if (this.selected) this.select(this.selected);
    this.load(this.page);
  }

  private async initialize(): Promise<void> {
    const session = await this.auth.getSession();
    const role = String(
      session?.user.app_metadata?.['perfil'] || '',
    ).toLocaleLowerCase('pt-BR');
    this.canOperate = role === 'gestor' || role === 'analista';
    this.isManager = role === 'gestor';
    if (this.canOperate) {
      this.quality.responsibles().subscribe({
        next: (response) => (this.responsibles = response.data),
        error: () => (this.responsibles = []),
      });
    }
    this.load();
  }

  private emptyOccurrence(): OccurrenceInput {
    return {
      tipo: 'NAO_CONFORMIDADE',
      titulo: '',
      descricao: '',
      origem: '',
      gravidade: 'MEDIA',
      responsavel_id: '',
      prazo: '',
      contencao: '',
    };
  }

  private emptyCapa(): CapaInput {
    return { tipo: 'CORRETIVA', descricao: '', responsavel_id: '', prazo: '' };
  }

  private emptyDecision(): {
    status: StatusOcorrencia;
    decisao: string;
    causa_raiz: string;
    verificacao_eficacia: string;
  } {
    return {
      status: 'EM_INVESTIGACAO',
      decisao: '',
      causa_raiz: '',
      verificacao_eficacia: '',
    };
  }
}
