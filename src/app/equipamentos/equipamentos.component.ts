import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, Observable } from 'rxjs';
import { AuthService } from '../acessos/auth/auth.service';
import { NotificationService } from '../shared/feedback/notification.service';
import { apiErrorMessage } from '../shared/http/api-error';
import {
  Equipamento,
  EquipamentoInput,
  EquipamentosService,
  EventoEquipamento,
  EventoInput,
  StatusEquipamento,
} from './equipamentos.service';

type EventAction = 'complete' | 'cancel' | null;

@Component({
  selector: 'app-equipamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipamentos.component.html',
  styleUrls: [
    '../shared/styles/module-page.css',
    './equipamentos.component.css',
  ],
})
export class EquipamentosComponent implements OnInit {
  equipment: Equipamento[] = [];
  selected: Equipamento | null = null;
  events: EventoEquipamento[] = [];
  selectedEvent: EventoEquipamento | null = null;
  eventAction: EventAction = null;
  search = '';
  blockedOnly = false;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;
  detailLoading = false;
  saving = false;
  showCreate = false;
  showEventForm = false;
  showStatusForm = false;
  showCalibrationForm = false;
  canOperate = false;
  isManager = false;

  newEquipment: EquipamentoInput = this.emptyEquipment();
  newEvent: EventoInput = this.emptyEvent();
  statusForm: { status: StatusEquipamento; motivo: string } = {
    status: 'MANUTENCAO',
    motivo: '',
  };
  calibrationForm = {
    requer_calibracao: true,
    frequencia_calibracao_dias: 365 as number | null,
    motivo: '',
  };
  completionForm: {
    resultado: 'APROVADO' | 'REPROVADO' | 'NAO_APLICAVEL';
    proxima_calibracao: string;
    certificado_url: string;
    observacao: string;
    motivo: string;
  } = this.emptyCompletion();

  constructor(
    private readonly equipmentService: EquipamentosService,
    private readonly auth: AuthService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    void this.resolvePermissions();
    this.load();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get blockedCount(): number {
    return this.equipment.filter(
      (item) => item.status_operacional !== 'DISPONIVEL',
    ).length;
  }

  get calibrationAlerts(): number {
    return this.equipment.filter(
      (item) =>
        item.requer_calibracao &&
        (item.dias_para_calibracao === null ||
          Number(item.dias_para_calibracao) <= 30),
    ).length;
  }

  load(page = 1): void {
    this.loading = true;
    this.page = page;
    this.equipmentService
      .list({
        page,
        pageSize: this.pageSize,
        search: this.search.trim(),
        somenteBloqueados: this.blockedOnly,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.equipment = response.data;
          this.total = response.meta.total;
          this.page = response.meta.page;
        },
        error: (error: unknown) => {
          this.equipment = [];
          this.total = 0;
          this.notifications.error(
            apiErrorMessage(
              error,
              'Não foi possível carregar os equipamentos.',
            ),
          );
        },
      });
  }

  select(item: Equipamento): void {
    this.selected = item;
    this.events = [];
    this.selectedEvent = null;
    this.eventAction = null;
    this.detailLoading = true;
    forkJoin({
      detail: this.equipmentService.get(item.id),
      events: this.equipmentService.events(item.id),
    })
      .pipe(finalize(() => (this.detailLoading = false)))
      .subscribe({
        next: ({ detail, events }) => {
          this.selected = detail.data;
          this.events = events.data;
          this.calibrationForm = {
            requer_calibracao: detail.data.requer_calibracao,
            frequencia_calibracao_dias: detail.data.frequencia_calibracao_dias,
            motivo: '',
          };
        },
        error: (error: unknown) =>
          this.notifications.error(
            apiErrorMessage(error, 'Não foi possível abrir o equipamento.'),
          ),
      });
  }

  saveEquipment(): void {
    if (this.saving) return;
    this.saving = true;
    this.equipmentService
      .create(this.newEquipment)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.notifications.success('Equipamento cadastrado com sucesso.');
          this.newEquipment = this.emptyEquipment();
          this.showCreate = false;
          this.load(1);
          this.select(response.data);
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  saveEvent(): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.equipmentService
      .createEvent(this.selected.id, this.newEvent)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.notifications.success('Intervenção registrada.');
          this.newEvent = this.emptyEvent();
          this.showEventForm = false;
          this.refreshSelected();
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  start(event: EventoEquipamento): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.equipmentService
      .startEvent(this.selected.id, event.id)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.notifications.success(
            'Intervenção iniciada; a disponibilidade foi atualizada.',
          );
          this.refreshSelected();
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  openEventAction(
    event: EventoEquipamento,
    action: Exclude<EventAction, null>,
  ): void {
    this.selectedEvent = event;
    this.eventAction = action;
    this.completionForm = this.emptyCompletion();
    if (
      event.tipo === 'CALIBRACAO' &&
      this.selected?.frequencia_calibracao_dias
    ) {
      const date = new Date();
      date.setUTCDate(
        date.getUTCDate() + this.selected.frequencia_calibracao_dias,
      );
      this.completionForm.proxima_calibracao = date.toISOString().slice(0, 10);
    }
  }

  finishEvent(): void {
    if (
      !this.selected ||
      !this.selectedEvent ||
      !this.eventAction ||
      this.saving
    )
      return;
    const request: Observable<unknown> =
      this.eventAction === 'cancel'
        ? this.equipmentService.cancelEvent(
            this.selected.id,
            this.selectedEvent.id,
            this.completionForm.motivo,
          )
        : this.equipmentService.completeEvent(
            this.selected.id,
            this.selectedEvent.id,
            {
              resultado: this.completionForm.resultado,
              proxima_calibracao:
                this.completionForm.proxima_calibracao || undefined,
              certificado_url: this.completionForm.certificado_url || undefined,
              observacao: this.completionForm.observacao || undefined,
            },
          );
    this.saving = true;
    request.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.notifications.success(
          this.eventAction === 'cancel'
            ? 'Intervenção cancelada.'
            : 'Intervenção concluída e equipamento reavaliado.',
        );
        this.eventAction = null;
        this.selectedEvent = null;
        this.refreshSelected();
      },
      error: (error: unknown) =>
        this.notifications.error(apiErrorMessage(error)),
    });
  }

  changeStatus(): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.equipmentService
      .setStatus(
        this.selected.id,
        this.statusForm.status,
        this.statusForm.motivo,
      )
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.notifications.success('Status do equipamento atualizado.');
          this.statusForm.motivo = '';
          this.showStatusForm = false;
          this.refreshSelected();
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  configureCalibration(): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.equipmentService
      .configureCalibration(this.selected.id, this.calibrationForm)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.notifications.success('Política de calibração atualizada.');
          this.showCalibrationForm = false;
          this.refreshSelected();
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      DISPONIVEL: 'Disponível',
      BLOQUEADO_FORA_DE_USO: 'Fora de uso',
      BLOQUEADO_MANUTENCAO: 'Em manutenção',
      BLOQUEADO_INTERVENCAO: 'Intervenção em curso',
      BLOQUEADO_SEM_CALIBRACAO: 'Sem calibração',
      BLOQUEADO_CALIBRACAO_VENCIDA: 'Calibração vencida',
      ATIVO: 'Ativo',
      MANUTENCAO: 'Manutenção',
      FORA_DE_USO: 'Fora de uso',
      AGENDADO: 'Agendado',
      EM_ANDAMENTO: 'Em andamento',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
    };
    return labels[status] || status.replaceAll('_', ' ');
  }

  date(value: string | null | undefined, withTime = false): string {
    if (!value) return 'Não informada';
    const parsed =
      value.length <= 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
    return new Intl.DateTimeFormat(
      'pt-BR',
      withTime
        ? { dateStyle: 'short', timeStyle: 'short' }
        : { dateStyle: 'short', timeZone: 'UTC' },
    ).format(parsed);
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  closeDetail(): void {
    this.selected = null;
    this.events = [];
    this.selectedEvent = null;
    this.eventAction = null;
    this.showEventForm = false;
    this.showStatusForm = false;
    this.showCalibrationForm = false;
    this.detailLoading = false;
  }

  private refreshSelected(): void {
    if (!this.selected) return;
    const id = this.selected.id;
    this.load(this.page);
    this.select({ ...this.selected, id });
  }

  private async resolvePermissions(): Promise<void> {
    const session = await this.auth.getSession();
    const role = String(
      session?.user.app_metadata?.['perfil'] || '',
    ).toLocaleLowerCase('pt-BR');
    this.canOperate = role === 'gestor' || role === 'analista';
    this.isManager = role === 'gestor';
  }

  private emptyEquipment(): EquipamentoInput {
    return {
      codigo: '',
      nome: '',
      fabricante: '',
      modelo: '',
      numero_serie: '',
      localizacao: '',
      criticidade: 'MEDIA',
      requer_calibracao: true,
      frequencia_calibracao_dias: 365,
      ultima_calibracao: '',
      proxima_calibracao: '',
    };
  }

  private emptyEvent(): EventoInput {
    return {
      tipo: 'CALIBRACAO',
      status: 'AGENDADO',
      descricao: '',
      fornecedor: '',
      agendado_para: '',
    };
  }

  private emptyCompletion(): {
    resultado: 'APROVADO' | 'REPROVADO' | 'NAO_APLICAVEL';
    proxima_calibracao: string;
    certificado_url: string;
    observacao: string;
    motivo: string;
  } {
    return {
      resultado: 'APROVADO',
      proxima_calibracao: '',
      certificado_url: '',
      observacao: '',
      motivo: '',
    };
  }
}
