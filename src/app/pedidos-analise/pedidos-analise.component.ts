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
import { Cliente } from '../clientes/cliente.model';
import { ClientesService } from '../clientes/clientes.service';
import { apiErrorMessage } from '../shared/http/api-error';
import {
  PedidoAnalise,
  PedidoAnalisePayload,
  PrioridadePedido,
  StatusPedido,
} from './pedido-analise.model';
import { PedidosAnaliseService } from './pedidos-analise.service';

type PedidoForm = FormGroup<{
  codigo: FormControl<string>;
  cliente_id: FormControl<number | null>;
  solicitante: FormControl<string>;
  descricao: FormControl<string>;
  prioridade: FormControl<PrioridadePedido>;
  data_entrada: FormControl<string>;
  prazo: FormControl<string>;
  status: FormControl<StatusPedido>;
  observacoes: FormControl<string>;
}>;

type StatusForm = FormGroup<{
  status: FormControl<StatusPedido>;
  motivo: FormControl<string>;
}>;

@Component({
  selector: 'app-pedidos-analise',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pedidos-analise.component.html',
  styleUrls: [
    '../shared/pilot-workflow/pilot-workflow.css',
    './pedidos-analise.component.css',
  ],
})
export class PedidosAnaliseComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions: ReadonlyArray<{
    value: StatusPedido | '';
    label: string;
  }> = [
    { value: '', label: 'Todos os status' },
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'recebido', label: 'Recebido' },
    { value: 'em_execucao', label: 'Em execução' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'cancelado', label: 'Cancelado' },
  ];
  readonly prioridadeOptions: ReadonlyArray<{
    value: PrioridadePedido;
    label: string;
  }> = [
    { value: 'normal', label: 'Normal' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' },
  ];

  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly filtroStatusControl = new FormControl<StatusPedido | ''>('', {
    nonNullable: true,
  });
  readonly form: PedidoForm = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    cliente_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    solicitante: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(160)],
    }),
    descricao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    prioridade: new FormControl<PrioridadePedido>('normal', {
      nonNullable: true,
    }),
    data_entrada: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    prazo: new FormControl('', { nonNullable: true }),
    status: new FormControl<StatusPedido>('rascunho', { nonNullable: true }),
    observacoes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });
  readonly statusForm: StatusForm = new FormGroup({
    status: new FormControl<StatusPedido>('recebido', { nonNullable: true }),
    motivo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  pedidos: PedidoAnalise[] = [];
  clientes: Cliente[] = [];
  loading = false;
  saving = false;
  error = '';
  feedback = '';
  editorOpen = false;
  editingId: number | null = null;
  statusPedido: PedidoAnalise | null = null;

  constructor(
    private readonly pedidosService: PedidosAnaliseService,
    private readonly clientesService: ClientesService,
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  get pedidosFiltrados(): PedidoAnalise[] {
    const termo = this.buscaControl.value.trim().toLocaleLowerCase('pt-BR');
    const status = this.filtroStatusControl.value;
    return this.pedidos.filter((pedido) => {
      const correspondeStatus = !status || pedido.status === status;
      const correspondeTexto =
        !termo ||
        [
          pedido.codigo,
          pedido.cliente_nome,
          pedido.solicitante,
          pedido.descricao,
        ].some((valor) => valor?.toLocaleLowerCase('pt-BR').includes(termo));
      return correspondeStatus && correspondeTexto;
    });
  }

  get totalEmExecucao(): number {
    return this.pedidos.filter((pedido) => pedido.status === 'em_execucao')
      .length;
  }

  get totalUrgentes(): number {
    return this.pedidos.filter(
      (pedido) =>
        pedido.prioridade === 'urgente' &&
        !['concluido', 'cancelado'].includes(pedido.status),
    ).length;
  }

  carregar(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      pedidos: this.pedidosService.listar(),
      clientes: this.clientesService.listar(),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ pedidos, clientes }) => {
          this.pedidos = pedidos.data ?? [];
          this.clientes = (clientes.data ?? []).filter(
            (cliente) => cliente.ativo,
          );
        },
        error: (error: unknown) => {
          this.pedidos = [];
          this.error = apiErrorMessage(
            error,
            'Não foi possível carregar os pedidos de análise.',
          );
        },
      });
  }

  novo(): void {
    this.editingId = null;
    this.form.reset({
      codigo: '',
      cliente_id: null,
      solicitante: '',
      descricao: '',
      prioridade: 'normal',
      data_entrada: this.today(),
      prazo: '',
      status: 'rascunho',
      observacoes: '',
    });
    this.error = '';
    this.feedback = '';
    this.editorOpen = true;
  }

  editar(pedido: PedidoAnalise): void {
    this.editingId = pedido.id;
    this.form.reset({
      codigo: pedido.codigo,
      cliente_id: pedido.cliente_id,
      solicitante: pedido.solicitante ?? '',
      descricao: pedido.descricao,
      prioridade: pedido.prioridade,
      data_entrada: this.toDateInput(pedido.data_entrada),
      prazo: pedido.prazo ? this.toDateInput(pedido.prazo) : '',
      status: pedido.status,
      observacoes: pedido.observacoes ?? '',
    });
    this.error = '';
    this.feedback = '';
    this.editorOpen = true;
  }

  fecharEditor(): void {
    if (!this.saving) this.editorOpen = false;
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revise os campos obrigatórios antes de salvar.';
      return;
    }
    const value = this.form.getRawValue();
    if (value.cliente_id === null) return;
    if (value.prazo && value.prazo < value.data_entrada) {
      this.error = 'O prazo não pode ser anterior à entrada do pedido.';
      return;
    }
    const payload: PedidoAnalisePayload = {
      codigo: value.codigo.trim(),
      cliente_id: value.cliente_id,
      solicitante: this.optional(value.solicitante),
      descricao: value.descricao.trim(),
      prioridade: value.prioridade,
      data_entrada: value.data_entrada,
      prazo: value.prazo || null,
      status: value.status,
      observacoes: this.optional(value.observacoes),
    };
    this.saving = true;
    this.error = '';
    const operation =
      this.editingId === null
        ? this.pedidosService.criar(payload)
        : this.pedidosService.atualizar(this.editingId, payload);
    operation
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback =
            this.editingId === null
              ? 'Pedido criado com sucesso.'
              : 'Pedido atualizado com sucesso.';
          this.editorOpen = false;
          this.carregar();
        },
        error: (error: unknown) =>
          (this.error = apiErrorMessage(
            error,
            'Não foi possível salvar o pedido.',
          )),
      });
  }

  abrirStatus(pedido: PedidoAnalise): void {
    this.statusPedido = pedido;
    this.statusForm.reset({ status: pedido.status, motivo: '' });
    this.error = '';
  }

  fecharStatus(): void {
    if (!this.saving) this.statusPedido = null;
  }

  salvarStatus(): void {
    if (!this.statusPedido || this.statusForm.invalid) return;
    const value = this.statusForm.getRawValue();
    if (value.status === 'cancelado' && !value.motivo.trim()) {
      this.statusForm.controls.motivo.setErrors({ required: true });
      return;
    }
    this.saving = true;
    this.error = '';
    this.pedidosService
      .alterarStatus(this.statusPedido.id, {
        status: value.status,
        motivo: this.optional(value.motivo),
      })
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback = `Status do pedido ${this.statusPedido?.codigo ?? ''} atualizado.`;
          this.statusPedido = null;
          this.carregar();
        },
        error: (error: unknown) =>
          (this.error = apiErrorMessage(
            error,
            'Não foi possível alterar o status.',
          )),
      });
  }

  statusLabel(status: StatusPedido): string {
    return (
      this.statusOptions.find((option) => option.value === status)?.label ??
      status
    );
  }

  statusTone(
    status: StatusPedido,
  ): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    if (status === 'concluido') return 'success';
    if (status === 'cancelado') return 'danger';
    if (status === 'recebido' || status === 'em_execucao') return 'info';
    return 'neutral';
  }

  prioridadeTone(
    prioridade: PrioridadePedido,
  ): 'danger' | 'warning' | 'neutral' {
    return prioridade === 'urgente'
      ? 'danger'
      : prioridade === 'alta'
        ? 'warning'
        : 'neutral';
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
      new Date(`${value.slice(0, 10)}T12:00:00Z`),
    );
  }

  trackById(_index: number, pedido: PedidoAnalise): number {
    return pedido.id;
  }

  private optional(value: string): string | null {
    return value.trim() || null;
  }

  private today(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  private toDateInput(value: string): string {
    return value.slice(0, 10);
  }
}
