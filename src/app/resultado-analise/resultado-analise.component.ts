import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ImportacaoResultadoComponent } from '../importacao-resultado/importacao-resultado.component';
import { ParametrosFilterService } from '../shared/filtro-parametros.service';
import { ConfirmationService } from '../shared/feedback/confirmation.service';
import { NotificationService } from '../shared/feedback/notification.service';
import {
  focusDialog,
  trapDialogFocus,
} from '../shared/accessibility/dialog-focus';
import { MetodoAnalitico } from '../metodos-analiticos/metodo-analitico.model';
import {
  Amostra,
  Legislacao,
  LegislacaoContexto,
  Matriz,
  Parametro,
  ResultadoAnalise,
  ResultadoAnaliseService,
} from './resultado-analise.service';

function getApiError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const candidate = error as { error?: { message?: unknown; error?: unknown }; message?: unknown };
  if (typeof candidate.error?.message === 'string') return candidate.error.message;
  if (typeof candidate.error?.error === 'string') return candidate.error.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}

@Component({
  selector: 'app-resultado-analise',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ImportacaoResultadoComponent],
  templateUrl: './resultado-analise.component.html',
  styleUrls: ['./resultado-analise.component.css'],
})
export class ResultadoAnaliseComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private amostraPorId = new Map<number, Amostra>();
  private parametroPorId = new Map<number, Parametro>();
  private resultDialogTrigger: HTMLElement | null = null;

  @ViewChild('manualTab') private manualTab?: ElementRef<HTMLButtonElement>;
  @ViewChild('importTab') private importTab?: ElementRef<HTMLButtonElement>;
  @ViewChild('resultDialog') private resultDialog?: ElementRef<HTMLElement>;

  abaAtiva: 'manual' | 'importacao' = 'manual';
  todosResultados: ResultadoAnalise[] = [];
  resultadosPaginados: ResultadoAnalise[] = [];
  numeroAmostraSelecionada = '';
  amostraSelecionada: Amostra | null = null;
  parametroSelecionado: Parametro | null = null;
  amostras: Amostra[] = [];
  parametros: Parametro[] = [];
  metodos: MetodoAnalitico[] = [];
  matrizes: Matriz[] = [];
  legislacoes: Legislacao[] = [];
  contextos: LegislacaoContexto[] = [];
  parametrosAtivos: number[] = [];

  readonly resultadoForm: FormGroup;
  isEditing = false;
  editingId?: number;
  loading = false;
  loadingParametros = false;
  loadingMetodos = false;
  filtroCodigoAmostra = '';
  filtroDataColeta = '';
  filtroDataPublicacao = '';
  filtroStatus = '';

  paginaAtual = 1;
  readonly itensPorPagina = 10;
  totalItens = 0;
  totalPaginas = 0;
  paginas: number[] = [];
  resultadoParaVisualizacao: ResultadoAnalise | null = null;

  constructor(
    private readonly resultadoService: ResultadoAnaliseService,
    private readonly formBuilder: FormBuilder,
    private readonly parametrosFilter: ParametrosFilterService,
    private readonly notifications: NotificationService,
    private readonly confirmations: ConfirmationService
  ) {
    this.resultadoForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.setupFormListeners();
    this.parametrosFilter
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ids) => {
        this.parametrosAtivos = ids;
        this.paginaAtual = 1;
        this.aplicarFiltros();
      });
  }

  get legislacoesDisponiveis(): Legislacao[] {
    const matrizId = Number(this.resultadoForm.getRawValue().matriz);
    if (!matrizId) return [];
    const ids = new Set(
      this.contextos
        .filter((contexto) => Number(contexto.matriz_id) === matrizId)
        .map((contexto) => Number(contexto.legislacao_id))
    );
    return this.legislacoes.filter((legislacao) => ids.has(Number(legislacao.id)));
  }

  get contextosDisponiveis(): LegislacaoContexto[] {
    const form = this.resultadoForm.getRawValue();
    const matrizId = Number(form.matriz);
    const legislacaoId = Number(form.legislacao);
    return this.contextos.filter(
      (contexto) =>
        Number(contexto.matriz_id) === matrizId &&
        Number(contexto.legislacao_id) === legislacaoId
    );
  }

  get resultadoQualitativo(): boolean {
    return this.parametroSelecionado?.tipo_resultado === 'qualitativo';
  }

  createForm(): FormGroup {
    return this.formBuilder.group({
      amostra_id: ['', Validators.required],
      matriz: [{ value: '', disabled: true }, Validators.required],
      legislacao: ['', Validators.required],
      contexto_legislacao_id: ['', Validators.required],
      parametro_id: ['', Validators.required],
      metodo_analitico_id: [''],
      valor_medido: ['', [Validators.required, Validators.min(0)]],
      valor_qualitativo: [''],
      datacoleta: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/),
          this.validarDataPassada,
        ],
      ],
    });
  }

  validarDataPassada(control: AbstractControl) {
    const valor = control.value as string;
    if (!valor || valor.length !== 10) return null;
    const [dia, mes, ano] = valor.split('/').map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== mes - 1 ||
      data.getDate() !== dia
    ) {
      return { dataInvalida: true };
    }
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    return data > hoje ? { dataFutura: true } : null;
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      resultados: this.resultadoService.getResultados(),
      amostras: this.resultadoService.getAmostras(),
      matrizes: this.resultadoService.getMatrizes(),
      legislacoes: this.resultadoService.getLegislacoes(),
      contextos: this.resultadoService.getContextos(),
    })
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ resultados, amostras, matrizes, legislacoes, contextos }) => {
          this.todosResultados = resultados.data ?? [];
          this.amostras = amostras.data ?? [];
          this.matrizes = matrizes.data ?? [];
          this.legislacoes = legislacoes.data ?? [];
          this.contextos = contextos.data ?? [];
          this.amostraPorId = new Map(this.amostras.map((item) => [Number(item.id), item]));
          this.aplicarFiltros();
        },
        error: () => this.notifications.error('Erro ao carregar dados do servidor.'),
      });
  }

  onSubmit(): void {
    if (this.resultadoForm.invalid) {
      this.resultadoForm.markAllAsTouched();
      this.notifications.warning('Verifique os campos obrigatórios.');
      return;
    }

    const form = this.resultadoForm.getRawValue();
    const [dia, mes, ano] = String(form.datacoleta).split('/');
    const payload = {
      valor_medido: this.resultadoQualitativo ? null : Number(form.valor_medido),
      valor_qualitativo: this.resultadoQualitativo ? form.valor_qualitativo : null,
      amostra_id: Number(form.amostra_id),
      parametro_id: Number(form.parametro_id),
      metodo_analitico_id: Number(form.metodo_analitico_id) || null,
      contexto_legislacao_id: Number(form.contexto_legislacao_id),
      datacoleta: new Date(`${ano}-${mes}-${dia}T12:00:00`).toISOString(),
      matriz_id_selecionada: Number(form.matriz),
      legislacao_id_selecionada: Number(form.legislacao),
    };

    this.loading = true;
    const operation = this.isEditing && this.editingId
      ? this.resultadoService.updateResultado(this.editingId, payload)
      : this.resultadoService.createResultado(payload);

    operation
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.success('Resultado salvo com o limite legal aplicado.');
          this.resetForm();
          this.loadData();
        },
        error: (error) =>
          this.notifications.error(getApiError(error, 'Não foi possível salvar o resultado.')),
      });
  }

  editResultado(resultado: ResultadoAnalise): void {
    this.isEditing = true;
    this.editingId = resultado.id;
    const data = resultado.datacoleta?.toString().split('T')[0].split('-');
    const dataFormatada = data?.length === 3 ? `${data[2]}/${data[1]}/${data[0]}` : '';
    const amostra = this.amostraPorId.get(Number(resultado.amostra_id)) ?? null;
    this.amostraSelecionada = amostra;
    this.numeroAmostraSelecionada = amostra?.numero_da_amostra ?? '';

    this.resultadoForm.patchValue({
      amostra_id: resultado.amostra_id,
      matriz: amostra?.matriz_id,
      legislacao: this.legislacoes.find((l) => l.sigla === resultado.legislacao_sigla)?.id,
      contexto_legislacao_id: resultado.contexto_legislacao_id,
      datacoleta: dataFormatada,
      valor_medido: resultado.valor_medido,
      valor_qualitativo: resultado.valor_qualitativo,
    }, { emitEvent: false });

    this.carregarParametros(
      Number(resultado.contexto_legislacao_id),
      Number(resultado.parametro_id),
      Number(resultado.metodo_analitico_id)
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async deleteResultado(id: number): Promise<void> {
    const confirmed = await this.confirmations.confirm({
      title: 'Arquivar resultado',
      message: 'O resultado deixará as listas ativas, mas todo o histórico será preservado para auditoria.',
      confirmLabel: 'Arquivar',
      danger: true,
    });
    if (!confirmed) return;
    this.loading = true;
    this.resultadoService
      .deleteResultado(id)
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.success('Resultado arquivado com sucesso.');
          this.loadData();
        },
        error: (error) =>
          this.notifications.error(getApiError(error, 'Não foi possível arquivar o resultado.')),
      });
  }

  resetForm(): void {
    this.resultadoForm.reset();
    this.isEditing = false;
    this.editingId = undefined;
    this.amostraSelecionada = null;
    this.parametroSelecionado = null;
    this.numeroAmostraSelecionada = '';
    this.parametros = [];
    this.metodos = [];
    this.parametroPorId.clear();
    this.configurarTipoResultado(null);
  }

  selecionarAba(tab: 'manual' | 'importacao', focus = false): void {
    this.abaAtiva = tab;
    if (focus) {
      window.setTimeout(() => {
        const target = tab === 'manual' ? this.manualTab : this.importTab;
        target?.nativeElement.focus();
      });
    }
  }

  navegarAbas(event: KeyboardEvent): void {
    let target: 'manual' | 'importacao' | null = null;
    if (event.key === 'Home') target = 'manual';
    if (event.key === 'End') target = 'importacao';
    if (event.key === 'ArrowRight') {
      target = this.abaAtiva === 'manual' ? 'importacao' : 'manual';
    }
    if (event.key === 'ArrowLeft') {
      target = this.abaAtiva === 'manual' ? 'importacao' : 'manual';
    }
    if (!target) return;

    event.preventDefault();
    this.selecionarAba(target, true);
  }

  visualizarResultado(
    resultado: ResultadoAnalise,
    trigger?: EventTarget | null,
  ): void {
    this.resultDialogTrigger = trigger instanceof HTMLElement ? trigger : null;
    this.resultadoParaVisualizacao = resultado;
    window.setTimeout(() => {
      const dialog = this.resultDialog?.nativeElement;
      if (!dialog) return;
      focusDialog(
        dialog,
        dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]'),
      );
    });
  }

  fecharVisualizacao(): void {
    if (!this.resultadoParaVisualizacao) return;
    this.resultadoParaVisualizacao = null;
    const trigger = this.resultDialogTrigger;
    this.resultDialogTrigger = null;
    window.setTimeout(() => trigger?.focus());
  }

  manterFocoNaVisualizacao(event: KeyboardEvent): void {
    const dialog = this.resultDialog?.nativeElement;
    if (dialog) trapDialogFocus(event, dialog);
  }

  @HostListener('document:keydown.escape')
  fecharVisualizacaoComEscape(): void {
    if (this.resultadoParaVisualizacao) this.fecharVisualizacao();
  }

  formatarData(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = this.aplicarMascaraData(input.value);
    input.value = value;
    this.resultadoForm.get('datacoleta')?.setValue(value, { emitEvent: false });
  }

  formatarDataFiltro(event: Event, tipo: 'coleta' | 'publicacao'): void {
    const input = event.target as HTMLInputElement;
    const value = this.aplicarMascaraData(input.value);
    input.value = value;
    if (tipo === 'coleta') this.filtroDataColeta = value;
    else this.filtroDataPublicacao = value;
    this.paginaAtual = 1;
  }

  formatarLimite(parametro: Parametro | null = this.parametroSelecionado): string {
    if (!parametro) return '';
    if (parametro.tipo_limite === 'ausencia' || parametro.tipo_limite === 'informativo') {
      return parametro.criterio_texto || 'Critério descritivo da legislação';
    }
    const unidade = parametro.unidade_medida ? ` ${parametro.unidade_medida}` : '';
    if (parametro.limite_minimo !== null && parametro.limite_maximo !== null) {
      return `${this.formatarNumero(parametro.limite_minimo)} a ${this.formatarNumero(parametro.limite_maximo)}${unidade}`;
    }
    if (parametro.limite_minimo !== null) return `mínimo ${this.formatarNumero(parametro.limite_minimo)}${unidade}`;
    if (parametro.limite_maximo !== null) return `máximo ${this.formatarNumero(parametro.limite_maximo)}${unidade}`;
    return parametro.criterio_texto || 'Sem limite numérico';
  }

  private formatarNumero(valor: number): string {
    return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 9 });
  }

  getAmostraCodigo(id: number): string {
    return this.amostraPorId.get(Number(id))?.codigo_amostra ?? '';
  }

  getAmostraNumero(id: number): string {
    return this.amostraPorId.get(Number(id))?.numero_da_amostra ?? '';
  }

  getParametroNome(resultado: ResultadoAnalise): string {
    return resultado.parametro_nome || this.parametroPorId.get(Number(resultado.parametro_id))?.nome || 'N/D';
  }

  getValorResultado(resultado: ResultadoAnalise): string {
    if (resultado.valor_qualitativo) return resultado.valor_qualitativo;
    if (resultado.valor_medido === null) return 'N/D';
    return `${Number(resultado.valor_medido).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}${resultado.unidade_medida ? ` ${resultado.unidade_medida}` : ''}`;
  }

  getStatusConformidade(resultado: ResultadoAnalise): 'conforme' | 'nao-conforme' | 'informativo' {
    return resultado.status_conformidade ?? 'informativo';
  }

  getStatusText(status: string): string {
    if (status === 'nao-conforme') return 'Não conforme';
    if (status === 'informativo') return 'Informativo';
    return 'Conforme';
  }

  getWorkflowStatus(status?: ResultadoAnalise['status_resultado']): string {
    const labels: Record<NonNullable<ResultadoAnalise['status_resultado']>, string> = {
      rascunho: 'Rascunho',
      em_revisao: 'Em revisão',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
      publicado: 'Publicado',
    };
    return status ? labels[status] : 'Legado';
  }

  canEditResultado(resultado: ResultadoAnalise): boolean {
    return !resultado.status_resultado || ['rascunho', 'rejeitado'].includes(resultado.status_resultado);
  }

  aplicarFiltros(): void {
    const codigo = this.filtroCodigoAmostra.trim().toLocaleLowerCase('pt-BR');
    const dataColeta = this.toIsoDate(this.filtroDataColeta);
    const dataPublicacao = this.toIsoDate(this.filtroDataPublicacao);
    const resultados = this.todosResultados.filter((resultado) => {
      if (codigo && !this.getAmostraCodigo(resultado.amostra_id).toLocaleLowerCase('pt-BR').includes(codigo)) return false;
      if (dataColeta && this.getDatePart(resultado.datacoleta) !== dataColeta) return false;
      if (dataPublicacao && this.getDatePart(resultado.datadapublicacao) !== dataPublicacao) return false;
      if (this.filtroStatus && this.getStatusConformidade(resultado) !== this.filtroStatus) return false;
      return !this.parametrosAtivos.length || this.parametrosAtivos.includes(Number(resultado.parametro_id));
    });

    this.totalItens = resultados.length;
    this.totalPaginas = Math.ceil(this.totalItens / this.itensPorPagina);
    this.paginaAtual = Math.min(Math.max(1, this.paginaAtual), this.totalPaginas || 1);
    this.atualizarPaginasVisiveis();
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    this.resultadosPaginados = resultados.slice(inicio, inicio + this.itensPorPagina);
  }

  limparFiltros(): void {
    this.filtroCodigoAmostra = '';
    this.filtroDataColeta = '';
    this.filtroDataPublicacao = '';
    this.filtroStatus = '';
    this.paginaAtual = 1;
    this.aplicarFiltros();
  }

  mudarPagina(pagina: number): void {
    this.paginaAtual = pagina;
    this.aplicarFiltros();
  }

  anterior(): void {
    if (this.paginaAtual > 1) this.mudarPagina(this.paginaAtual - 1);
  }

  proxima(): void {
    if (this.paginaAtual < this.totalPaginas) this.mudarPagina(this.paginaAtual + 1);
  }

  getRangeInicio(): number {
    return this.totalItens ? (this.paginaAtual - 1) * this.itensPorPagina + 1 : 0;
  }

  getRangeFim(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.totalItens);
  }

  atualizarTabela(): void {
    this.loadData();
  }

  trackByResultado(_index: number, item: ResultadoAnalise): number | undefined {
    return item.id;
  }

  private setupFormListeners(): void {
    this.resultadoForm.get('amostra_id')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((amostraId) => {
        this.amostraSelecionada = this.amostraPorId.get(Number(amostraId)) ?? null;
        this.numeroAmostraSelecionada = this.amostraSelecionada?.numero_da_amostra ?? '';
        this.parametros = [];
        this.metodos = [];
        this.parametroSelecionado = null;
        this.resultadoForm.patchValue({
          matriz: this.amostraSelecionada?.matriz_id ?? '',
          legislacao: '',
          contexto_legislacao_id: '',
          parametro_id: '',
          metodo_analitico_id: '',
        }, { emitEvent: false });

        if (this.legislacoesDisponiveis.length === 1) {
          this.resultadoForm.get('legislacao')?.setValue(this.legislacoesDisponiveis[0].id);
        }
      });

    this.resultadoForm.get('legislacao')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.parametros = [];
        this.metodos = [];
        this.parametroSelecionado = null;
        this.resultadoForm.patchValue({ contexto_legislacao_id: '', parametro_id: '', metodo_analitico_id: '' }, { emitEvent: false });
        if (this.contextosDisponiveis.length === 1) {
          this.resultadoForm.get('contexto_legislacao_id')?.setValue(this.contextosDisponiveis[0].id);
        }
      });

    this.resultadoForm.get('contexto_legislacao_id')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contextoId) => {
        this.parametroSelecionado = null;
        this.metodos = [];
        this.resultadoForm.get('parametro_id')?.setValue('', { emitEvent: false });
        this.resultadoForm.get('metodo_analitico_id')?.setValue('', { emitEvent: false });
        if (contextoId) this.carregarParametros(Number(contextoId));
        else this.parametros = [];
      });

    this.resultadoForm.get('parametro_id')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parametroId) => {
        this.parametroSelecionado = this.parametroPorId.get(Number(parametroId)) ?? null;
        this.configurarTipoResultado(this.parametroSelecionado);
        this.resultadoForm.get('metodo_analitico_id')?.setValue('', { emitEvent: false });
        if (parametroId && this.amostraSelecionada) {
          this.carregarMetodos(Number(parametroId), Number(this.amostraSelecionada.matriz_id));
        } else {
          this.metodos = [];
        }
      });
  }

  private carregarParametros(contextoId: number, parametroId?: number, metodoId?: number): void {
    if (!contextoId) return;
    this.loadingParametros = true;
    this.resultadoService.getParametros(contextoId)
      .pipe(finalize(() => (this.loadingParametros = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.parametros = response.data ?? [];
          this.parametroPorId = new Map(this.parametros.map((item) => [Number(item.id), item]));
          if (parametroId) {
            this.resultadoForm.get('parametro_id')?.setValue(parametroId, { emitEvent: false });
            this.parametroSelecionado = this.parametroPorId.get(Number(parametroId)) ?? null;
            this.configurarTipoResultado(this.parametroSelecionado);
            if (this.amostraSelecionada) {
              this.carregarMetodos(parametroId, Number(this.amostraSelecionada.matriz_id), metodoId);
            }
          }
        },
        error: () => this.notifications.error('Não foi possível carregar os parâmetros desta legislação.'),
      });
  }

  private carregarMetodos(parametroId: number, matrizId: number, metodoId?: number): void {
    this.loadingMetodos = true;
    this.resultadoService.getMetodosAplicaveis(parametroId, matrizId)
      .pipe(finalize(() => (this.loadingMetodos = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.metodos = response.data ?? [];
          if (metodoId && this.metodos.some((item) => Number(item.id) === Number(metodoId))) {
            this.resultadoForm.get('metodo_analitico_id')?.setValue(metodoId, { emitEvent: false });
          } else if (this.metodos.length === 1) {
            this.resultadoForm.get('metodo_analitico_id')?.setValue(this.metodos[0].id, { emitEvent: false });
          }
        },
        error: () => {
          this.metodos = [];
          this.notifications.error('Não foi possível carregar os métodos aplicáveis.');
        },
      });
  }

  private configurarTipoResultado(parametro: Parametro | null): void {
    const numerico = this.resultadoForm.get('valor_medido');
    const qualitativo = this.resultadoForm.get('valor_qualitativo');
    if (parametro?.tipo_resultado === 'qualitativo') {
      numerico?.clearValidators();
      numerico?.setValue(null, { emitEvent: false });
      qualitativo?.setValidators(Validators.required);
    } else {
      qualitativo?.clearValidators();
      qualitativo?.setValue('', { emitEvent: false });
      numerico?.setValidators([Validators.required, Validators.min(0)]);
    }
    numerico?.updateValueAndValidity({ emitEvent: false });
    qualitativo?.updateValueAndValidity({ emitEvent: false });
  }

  private aplicarMascaraData(input: string): string {
    const digits = input.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  private toIsoDate(input: string): string | null {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return null;
    const [dia, mes, ano] = input.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  private getDatePart(input?: string): string | null {
    if (!input) return null;
    const timestamp = Date.parse(input);
    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10);
  }

  private atualizarPaginasVisiveis(): void {
    const maximoVisivel = 7;
    let inicio = Math.max(1, this.paginaAtual - Math.floor(maximoVisivel / 2));
    const fim = Math.min(this.totalPaginas, inicio + maximoVisivel - 1);
    inicio = Math.max(1, fim - maximoVisivel + 1);
    this.paginas = Array.from({ length: Math.max(0, fim - inicio + 1) }, (_, i) => inicio + i);
  }
}
