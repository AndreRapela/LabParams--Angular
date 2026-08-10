import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../acessos/auth/auth.service';
import { apiErrorMessage } from '../shared/http/api-error';
import {
  DecisaoRevisao,
  HistoricoWorkflow,
  ResultadoWorkflow,
  StatusResultado,
} from './revisao-resultado.model';
import { RevisaoResultadosService } from './revisao-resultados.service';

type WorkflowAction = 'submeter' | 'revisar' | 'publicar';

type ActionForm = FormGroup<{
  decisao: FormControl<DecisaoRevisao>;
  senha: FormControl<string>;
  comentario: FormControl<string>;
}>;

@Component({
  selector: 'app-revisao-resultados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './revisao-resultados.component.html',
  styleUrls: [
    '../shared/pilot-workflow/pilot-workflow.css',
    './revisao-resultados.component.css',
  ],
})
export class RevisaoResultadosComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions: ReadonlyArray<{
    value: StatusResultado | '';
    label: string;
  }> = [
    { value: '', label: 'Todos os status' },
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'em_revisao', label: 'Em revisão' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'rejeitado', label: 'Rejeitado' },
    { value: 'publicado', label: 'Publicado' },
  ];

  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<StatusResultado | ''>('', {
    nonNullable: true,
  });
  readonly actionForm: ActionForm = new FormGroup({
    decisao: new FormControl<DecisaoRevisao>('aprovar', { nonNullable: true }),
    senha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    comentario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });

  resultados: ResultadoWorkflow[] = [];
  historico: HistoricoWorkflow[] = [];
  selecionado: ResultadoWorkflow | null = null;
  action: WorkflowAction | null = null;
  loading = false;
  loadingDetail = false;
  saving = false;
  error = '';
  detailError = '';
  feedback = '';
  isGestor = false;

  constructor(
    private readonly service: RevisaoResultadosService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.carregar();
    void this.carregarPerfil();
  }

  get resultadosFiltrados(): ResultadoWorkflow[] {
    const termo = this.buscaControl.value.trim().toLocaleLowerCase('pt-BR');
    const status = this.statusControl.value;
    return this.resultados.filter((resultado) => {
      const currentStatus = this.statusOf(resultado);
      const matchesStatus = !status || currentStatus === status;
      const matchesText =
        !termo ||
        [
          resultado.amostra_codigo,
          resultado.amostra_numero,
          resultado.codigodaamostra,
          resultado.numerodaamostra,
          resultado.parametro_nome,
          resultado.matriz_nome,
          resultado.matriz,
        ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(termo));
      return matchesStatus && matchesText;
    });
  }

  get aguardandoRevisao(): number {
    return this.resultados.filter(
      (resultado) => this.statusOf(resultado) === 'em_revisao',
    ).length;
  }

  get aguardandoPublicacao(): number {
    return this.resultados.filter(
      (resultado) => this.statusOf(resultado) === 'aprovado',
    ).length;
  }

  carregar(): void {
    this.loading = true;
    this.error = '';
    this.service
      .listar()
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => (this.resultados = response.data ?? []),
        error: (error: unknown) => {
          this.resultados = [];
          this.error = apiErrorMessage(
            error,
            'Não foi possível carregar a central de revisão.',
          );
        },
      });
  }

  abrir(resultado: ResultadoWorkflow): void {
    this.selecionado = resultado;
    this.historico = [];
    this.action = null;
    this.detailError = '';
    this.loadingDetail = true;
    forkJoin({
      detalhe: this.service.buscarPorId(resultado.id),
      historico: this.service.historico(resultado.id),
    })
      .pipe(
        finalize(() => (this.loadingDetail = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ detalhe, historico }) => {
          this.selecionado = detalhe.data;
          this.historico = historico.data ?? [];
        },
        error: (error: unknown) => {
          this.detailError = apiErrorMessage(
            error,
            'Não foi possível carregar os detalhes e o histórico.',
          );
        },
      });
  }

  fechar(): void {
    if (this.saving) return;
    this.actionForm.controls.senha.reset('');
    this.selecionado = null;
    this.action = null;
  }

  iniciarAcao(action: WorkflowAction): void {
    this.action = action;
    this.detailError = '';
    this.actionForm.reset({ decisao: 'aprovar', senha: '', comentario: '' });
    this.updateActionValidators();
  }

  cancelarAcao(): void {
    if (!this.saving) {
      this.actionForm.controls.senha.reset('');
      this.action = null;
    }
  }

  decisaoAlterada(): void {
    this.updateActionValidators();
  }

  confirmarAcao(): void {
    if (!this.selecionado || !this.action) return;
    this.updateActionValidators();
    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }
    const selected = this.selecionado;
    const action = this.action;
    const value = this.actionForm.getRawValue();
    const comentario = value.comentario.trim() || null;
    this.saving = true;
    this.detailError = '';
    const operation =
      action === 'submeter'
        ? this.service.submeter(selected.id, { comentario })
        : action === 'revisar'
          ? this.service.revisar(selected.id, {
              decisao: value.decisao,
              senha: value.senha,
              comentario,
            })
          : this.service.publicar(selected.id, {
              senha: value.senha,
              comentario,
            });

    operation
      .pipe(
        finalize(() => {
          this.saving = false;
          this.actionForm.controls.senha.reset('');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback = this.successMessage(action, value.decisao);
          this.selecionado = null;
          this.action = null;
          this.carregar();
        },
        error: (error: unknown) =>
          (this.detailError = apiErrorMessage(
            error,
            'Não foi possível concluir a ação de workflow.',
          )),
      });
  }

  statusOf(resultado: ResultadoWorkflow): StatusResultado {
    return resultado.status_resultado ?? 'rascunho';
  }

  statusLabel(status: StatusResultado): string {
    return (
      this.statusOptions.find((option) => option.value === status)?.label ??
      status
    );
  }

  statusTone(
    status: StatusResultado,
  ): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    if (status === 'publicado' || status === 'aprovado') return 'success';
    if (status === 'em_revisao') return 'warning';
    if (status === 'rejeitado') return 'danger';
    return 'neutral';
  }

  conformidadeLabel(resultado: ResultadoWorkflow): string {
    const labels = {
      conforme: 'Conforme',
      'nao-conforme': 'Não conforme',
      informativo: 'Informativo',
    };
    return resultado.status_conformidade
      ? labels[resultado.status_conformidade]
      : 'Não avaliado';
  }

  valorResultado(resultado: ResultadoWorkflow): string {
    if (resultado.valor_qualitativo) return resultado.valor_qualitativo;
    if (resultado.valor_medido === null) return 'Não informado';
    const value = new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 8,
    }).format(resultado.valor_medido);
    return `${value}${resultado.unidade_medida ? ` ${resultado.unidade_medida}` : ''}`;
  }

  amostraLabel(resultado: ResultadoWorkflow): string {
    return (
      resultado.amostra_numero ??
      resultado.numerodaamostra ??
      resultado.amostra_codigo ??
      resultado.codigodaamostra ??
      `Amostra ${resultado.amostra_id}`
    );
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  actionTitle(): string {
    if (this.action === 'submeter') return 'Submeter para revisão';
    if (this.action === 'publicar') return 'Publicar resultado';
    return 'Registrar decisão da revisão';
  }

  requiresPassword(): boolean {
    return this.action === 'publicar' || this.action === 'revisar';
  }

  requiresComment(): boolean {
    return this.action === 'revisar';
  }

  actionLabel(action: string): string {
    const labels: Readonly<Record<string, string>> = {
      SUBMIT: 'Submetido para revisão',
      APPROVE: 'Resultado aprovado',
      REJECT: 'Resultado rejeitado',
      PUBLISH: 'Resultado publicado',
      REOPEN: 'Resultado reaberto',
      STATUS_CHANGE: 'Status alterado',
    };
    const normalizedAction = action.trim().toLocaleUpperCase('en-US');
    return labels[normalizedAction] ?? action;
  }

  canSubmit(resultado: ResultadoWorkflow): boolean {
    return this.statusOf(resultado) === 'rascunho';
  }

  trackByResultId(_index: number, resultado: ResultadoWorkflow): number {
    return resultado.id;
  }

  trackByHistoryId(_index: number, event: HistoricoWorkflow): number {
    return event.id;
  }

  private updateActionValidators(): void {
    const senha = this.actionForm.controls.senha;
    const comentario = this.actionForm.controls.comentario;
    senha.setValidators(
      this.requiresPassword()
        ? [Validators.required, Validators.maxLength(200)]
        : [Validators.maxLength(200)],
    );
    comentario.setValidators(
      this.requiresComment()
        ? [Validators.required, Validators.maxLength(1000)]
        : [Validators.maxLength(1000)],
    );
    senha.updateValueAndValidity({ emitEvent: false });
    comentario.updateValueAndValidity({ emitEvent: false });
  }

  private successMessage(
    action: WorkflowAction,
    decisao: DecisaoRevisao,
  ): string {
    if (action === 'submeter') return 'Resultado submetido para revisão.';
    if (action === 'publicar')
      return 'Resultado publicado e bloqueado para edição.';
    return decisao === 'aprovar'
      ? 'Resultado aprovado com assinatura eletrônica.'
      : 'Resultado rejeitado e devolvido para correção.';
  }

  private async carregarPerfil(): Promise<void> {
    const session = await this.authService.getSession();
    const perfil = session?.user.app_metadata?.['perfil'];
    this.isGestor =
      typeof perfil === 'string' &&
      perfil.toLocaleLowerCase('pt-BR') === 'gestor';
  }
}
