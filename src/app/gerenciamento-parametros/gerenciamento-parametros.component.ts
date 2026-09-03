import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Subscription, debounceTime, finalize } from 'rxjs';
import { apiErrorMessage } from '../shared/http/api-error';
import { trapDialogFocus } from '../shared/accessibility/dialog-focus';
import {
  GerenciamentoParametroService,
  LegislacaoGerenciamento,
  MatrizGerenciamento,
  ParametroGerenciamento,
} from './gerenciamento-parametros.service';
import { ApiPagination } from '../shared/pilot-workflow/api.types';

@Component({
  selector: 'app-gerenciamento-parametros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gerenciamento-parametros.component.html',
  styleUrls: [
    '../shared/styles/module-page.css',
    './gerenciamento-parametros.component.css',
  ],
})
export class GerenciamentoParametrosComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private triggerElement: HTMLElement | null = null;
  private readonly searchChanges = new Subject<void>();
  private loadRequest?: Subscription;

  @ViewChild('valueInput') valueInput?: ElementRef<HTMLInputElement>;
  @ViewChild('editDialog') editDialog?: ElementRef<HTMLElement>;

  parametros: ParametroGerenciamento[] = [];
  matrizes: MatrizGerenciamento[] = [];
  legislacoes: LegislacaoGerenciamento[] = [];

  search = '';
  matrizId = '';
  legislacaoId = '';
  page = 1;
  readonly pageSize = 30;
  readonly searchMaxLength = 100;
  pagination: ApiPagination = {
    page: 1,
    page_size: this.pageSize,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  };

  editando: ParametroGerenciamento | null = null;
  valorEditado: number | null = null;
  loading = false;
  saving = false;
  error = '';
  editorError = '';
  feedback = '';

  constructor(
    private readonly gerenciamentoParametroService: GerenciamentoParametroService,
  ) {}

  ngOnInit(): void {
    this.searchChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());
    this.carregarTudo();
  }

  ngOnDestroy(): void {
    this.loadRequest?.unsubscribe();
  }

  get totalPages(): number {
    return this.pagination.total_pages;
  }

  get rangeStart(): number {
    return this.pagination.total
      ? (this.pagination.page - 1) * this.pagination.page_size + 1
      : 0;
  }

  get rangeEnd(): number {
    return Math.min(
      this.pagination.page * this.pagination.page_size,
      this.pagination.total,
    );
  }

  get withOperationalValue(): number {
    return this.parametros.filter(
      (parameter) => this.toFiniteNumber(parameter.valor_parametro) !== null,
    ).length;
  }

  carregarTudo(): void {
    this.loadRequest?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.loadRequest = this.gerenciamentoParametroService
      .getTela({
        q: this.search.trim().slice(0, this.searchMaxLength) || undefined,
        matriz_id: this.positiveFilterId(this.matrizId),
        legislacao_id: this.positiveFilterId(this.legislacaoId),
        page: this.page,
        page_size: this.pageSize,
      })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.parametros = response.parametros ?? [];
          this.matrizes = response.matrizes ?? [];
          this.legislacoes = response.legislacoes ?? [];
          this.pagination = response.pagination;
          this.page = response.pagination.page;
        },
        error: (error: unknown) => {
          this.parametros = [];
          this.pagination = {
            page: this.page,
            page_size: this.pageSize,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false,
          };
          this.error = apiErrorMessage(
            error,
            'Não foi possível carregar o catálogo de parâmetros.',
          );
        },
      });
  }

  aplicarFiltros(): void {
    this.page = 1;
    this.carregarTudo();
  }

  agendarBusca(): void {
    this.searchChanges.next();
  }

  limparFiltros(): void {
    this.search = '';
    this.matrizId = '';
    this.legislacaoId = '';
    this.page = 1;
    this.carregarTudo();
  }

  mudarPagina(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    this.carregarTudo();
  }

  abrirEdicao(item: ParametroGerenciamento, trigger?: EventTarget | null): void {
    this.triggerElement = trigger instanceof HTMLElement ? trigger : null;
    this.editando = item;
    this.valorEditado = this.toFiniteNumber(item.valor_parametro);
    this.editorError = '';
    this.feedback = '';
    window.setTimeout(() => this.valueInput?.nativeElement.focus());
  }

  fechar(): void {
    if (this.saving) return;
    this.editando = null;
    this.valorEditado = null;
    this.editorError = '';
    const trigger = this.triggerElement;
    this.triggerElement = null;
    window.setTimeout(() => trigger?.focus());
  }

  salvar(): void {
    if (!this.editando || this.saving) return;
    const value = this.valorEditado;
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      this.editorError = 'Informe um valor igual ou maior que zero, ou deixe em branco.';
      return;
    }

    const selected = this.editando;
    this.saving = true;
    this.editorError = '';
    this.gerenciamentoParametroService
      .updateParametro(selected.id, value)
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.parametros = this.parametros.map((parameter) =>
            parameter.id === selected.id
              ? { ...parameter, valor_parametro: value }
              : parameter,
          );
          this.feedback = `Valor operacional de ${selected.nome} atualizado.`;
          // Observables síncronos (incluindo respostas em cache e testes) chamam
          // `next` antes de `finalize`; libere o diálogo antes de tentar fechá-lo.
          this.saving = false;
          this.fechar();
        },
        error: (error: unknown) => {
          this.editorError = apiErrorMessage(
            error,
            'Não foi possível atualizar o valor operacional.',
          );
        },
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.editando) this.fechar();
  }

  manterFocoNoEditor(event: KeyboardEvent): void {
    const dialog = this.editDialog?.nativeElement;
    if (dialog) trapDialogFocus(event, dialog);
  }

  formatValue(value: number | string | null): string {
    const number = this.toFiniteNumber(value);
    return number === null
      ? 'Não informado'
      : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 9 }).format(number);
  }

  formatLimit(parameter: ParametroGerenciamento): string {
    if (parameter.criterio_texto) return parameter.criterio_texto;
    const minimum = this.toFiniteNumber(parameter.limite_minimo);
    const maximum = this.toFiniteNumber(parameter.limite_maximo);
    const unit = parameter.unidade_medida ? ` ${parameter.unidade_medida}` : '';
    if (minimum !== null && maximum !== null) {
      return `${this.formatValue(minimum)} a ${this.formatValue(maximum)}${unit}`;
    }
    if (minimum !== null) return `Mín. ${this.formatValue(minimum)}${unit}`;
    if (maximum !== null) return `Máx. ${this.formatValue(maximum)}${unit}`;
    return 'Informativo';
  }

  trackByParametro(_index: number, parameter: ParametroGerenciamento): number {
    return parameter.id;
  }

  private toFiniteNumber(value: number | string | null): number | null {
    if (value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private positiveFilterId(value: string): number | undefined {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : undefined;
  }

}
