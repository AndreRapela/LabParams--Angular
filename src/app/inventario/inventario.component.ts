import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../acessos/auth/auth.service';
import { NotificationService } from '../shared/feedback/notification.service';
import { apiErrorMessage } from '../shared/http/api-error';
import {
  Insumo,
  InsumoInput,
  InventarioService,
  LoteInsumo,
  LoteInput,
  MovimentoEstoque,
  TipoMovimento,
} from './inventario.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['../shared/styles/module-page.css', './inventario.component.css'],
})
export class InventarioComponent implements OnInit {
  items: Insumo[] = [];
  selected: Insumo | null = null;
  selectedLot: LoteInsumo | null = null;
  movements: MovimentoEstoque[] = [];
  search = '';
  lowStockOnly = false;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;
  detailLoading = false;
  movementLoading = false;
  saving = false;
  showCreate = false;
  showLotForm = false;
  showMovementForm = false;
  canOperate = false;
  isManager = false;

  newItem: InsumoInput = this.emptyItem();
  newLot: LoteInput = this.emptyLot();
  movement: {
    tipo: TipoMovimento;
    quantidade: number;
    motivo: string;
    referencia: string;
  } = this.emptyMovement();

  constructor(
    private readonly inventory: InventarioService,
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

  get lowStockCount(): number {
    return this.items.filter((item) => item.abaixo_estoque_minimo).length;
  }

  get expiringCount(): number {
    return this.items.reduce(
      (total, item) => total + Number(item.lotes_vencendo || 0),
      0,
    );
  }

  load(page = 1): void {
    this.loading = true;
    this.page = page;
    this.inventory
      .list({
        page,
        pageSize: this.pageSize,
        search: this.search.trim(),
        baixoEstoque: this.lowStockOnly,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.items = response.data;
          this.total = response.meta.total;
          this.page = response.meta.page;
        },
        error: (error: unknown) => {
          this.items = [];
          this.total = 0;
          this.notifications.error(
            apiErrorMessage(error, 'Não foi possível carregar o inventário.'),
          );
        },
      });
  }

  select(item: Insumo): void {
    this.selected = item;
    this.detailLoading = true;
    this.selectedLot = null;
    this.movements = [];
    this.showLotForm = false;
    this.showMovementForm = false;
    this.inventory
      .get(item.id)
      .pipe(finalize(() => (this.detailLoading = false)))
      .subscribe({
        next: (response) => (this.selected = response.data),
        error: (error: unknown) =>
          this.notifications.error(
            apiErrorMessage(error, 'Não foi possível abrir o insumo.'),
          ),
      });
  }

  saveItem(): void {
    if (this.saving) return;
    this.saving = true;
    this.inventory
      .create(this.newItem)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.notifications.success('Insumo cadastrado com sucesso.');
          this.newItem = this.emptyItem();
          this.showCreate = false;
          this.load(1);
          this.select(response.data);
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  saveLot(): void {
    if (!this.selected || this.saving) return;
    this.saving = true;
    this.inventory
      .createLot(this.selected.id, this.newLot)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.notifications.success('Lote recebido e registrado.');
          this.newLot = this.emptyLot();
          this.showLotForm = false;
          this.refreshSelected();
          this.load(this.page);
        },
        error: (error: unknown) =>
          this.notifications.error(apiErrorMessage(error)),
      });
  }

  chooseLot(lot: LoteInsumo): void {
    this.selectedLot = lot;
    this.showMovementForm = true;
    this.movements = [];
    this.movementLoading = true;
    this.inventory
      .movements(lot.id)
      .pipe(finalize(() => (this.movementLoading = false)))
      .subscribe({
        next: (response) => (this.movements = response.data),
        error: (error: unknown) => {
          this.movements = [];
          this.notifications.error(
            apiErrorMessage(
              error,
              'Não foi possível carregar o histórico do lote.',
            ),
          );
        },
      });
  }

  saveMovement(): void {
    if (!this.selectedLot || this.saving) return;
    const operational =
      this.movement.tipo === 'ENTRADA' || this.movement.tipo === 'SAIDA';
    const request = operational
      ? this.inventory.move(this.selectedLot.id, {
          tipo: this.movement.tipo as 'ENTRADA' | 'SAIDA',
          quantidade: this.movement.quantidade,
          motivo: this.movement.motivo,
          referencia: this.movement.referencia || undefined,
        })
      : this.inventory.adjust(this.selectedLot.id, {
          tipo: this.movement.tipo as 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO',
          quantidade: this.movement.quantidade,
          motivo: this.movement.motivo,
          referencia: this.movement.referencia || undefined,
        });

    this.saving = true;
    request.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.notifications.success(
          'Movimentação registrada na razão imutável de estoque.',
        );
        this.movement = this.emptyMovement();
        this.refreshSelected();
        this.load(this.page);
      },
      error: (error: unknown) =>
        this.notifications.error(apiErrorMessage(error)),
    });
  }

  closeDetail(): void {
    this.selected = null;
    this.selectedLot = null;
    this.movements = [];
    this.showLotForm = false;
    this.showMovementForm = false;
    this.detailLoading = false;
    this.movementLoading = false;
  }

  stock(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(
      Number(value || 0),
    );
  }

  date(value: string | null | undefined): string {
    if (!value) return 'Não informada';
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

  movementLabel(type: TipoMovimento): string {
    const labels: Record<TipoMovimento, string> = {
      ENTRADA: 'Entrada',
      SAIDA: 'Saída',
      AJUSTE_POSITIVO: 'Ajuste +',
      AJUSTE_NEGATIVO: 'Ajuste −',
    };
    return labels[type];
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  private refreshSelected(): void {
    if (this.selected) this.select(this.selected);
  }

  private async resolvePermissions(): Promise<void> {
    const session = await this.auth.getSession();
    const role = String(
      session?.user.app_metadata?.['perfil'] || '',
    ).toLocaleLowerCase('pt-BR');
    this.canOperate = role === 'gestor' || role === 'analista';
    this.isManager = role === 'gestor';
  }

  private emptyItem(): InsumoInput {
    return {
      codigo: '',
      nome: '',
      tipo: 'REAGENTE',
      unidade_medida: 'un',
      estoque_minimo: 0,
      fabricante: '',
      condicao_armazenamento: '',
    };
  }

  private emptyLot(): LoteInput {
    return {
      numero_lote: '',
      validade: '',
      data_recebimento: new Date().toISOString().slice(0, 10),
      quantidade_inicial: 0,
      fornecedor: '',
      local_armazenamento: '',
      certificado_url: '',
      status: 'DISPONIVEL',
    };
  }

  private emptyMovement(): {
    tipo: TipoMovimento;
    quantidade: number;
    motivo: string;
    referencia: string;
  } {
    return { tipo: 'SAIDA', quantidade: 0, motivo: '', referencia: '' };
  }
}
