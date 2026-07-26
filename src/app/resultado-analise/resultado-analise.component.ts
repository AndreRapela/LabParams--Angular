import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
import {
  Amostra,
  Legislacao,
  Matriz,
  Parametro,
  ResultadoAnalise,
  ResultadoAnaliseService,
} from './resultado-analise.service';

@Component({
  selector: 'app-resultado-analise',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ImportacaoResultadoComponent,
  ],
  templateUrl: './resultado-analise.component.html',
  styleUrls: ['./resultado-analise.component.css'],
})
export class ResultadoAnaliseComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private amostraPorId = new Map<number, Amostra>();
  private parametroPorId = new Map<number, Parametro>();

  abaAtiva: 'manual' | 'importacao' = 'manual';
  todosResultados: ResultadoAnalise[] = [];
  resultadosPaginados: ResultadoAnalise[] = [];
  numeroAmostraSelecionada = '';
  amostraSelecionada: Amostra | null = null;
  parametroSelecionado: Parametro | null = null;
  amostras: Amostra[] = [];
  parametros: Parametro[] = [];
  matrizes: Matriz[] = [];
  legislacoes: Legislacao[] = [];
  parametrosAtivos: number[] = [];

  readonly resultadoForm: FormGroup;
  isEditing = false;
  editingId?: number;
  loading = false;
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
    private readonly parametrosFilter: ParametrosFilterService
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

  createForm(): FormGroup {
    return this.formBuilder.group({
      valor_medido: ['', [Validators.required, Validators.min(0)]],
      amostra_id: ['', Validators.required],
      parametro_id: ['', Validators.required],
      datacoleta: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/
          ),
          this.validarDataPassada,
        ],
      ],
      matriz: ['', Validators.required],
      legislacao: ['', Validators.required],
    });
  }

  validarDataPassada(control: AbstractControl) {
    const valor = control.value as string;
    if (!valor || valor.length !== 10) return null;

    const [dia, mes, ano] = valor.split('/').map(Number);
    const dataInserida = new Date(ano, mes - 1, dia);
    const dataValida =
      dataInserida.getFullYear() === ano &&
      dataInserida.getMonth() === mes - 1 &&
      dataInserida.getDate() === dia;

    if (!dataValida) return { dataInvalida: true };

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    return dataInserida > hoje ? { dataFutura: true } : null;
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      resultados: this.resultadoService.getResultados(),
      amostras: this.resultadoService.getAmostras(),
      parametros: this.resultadoService.getParametros(),
      matrizes: this.resultadoService.getMatrizes(),
      legislacoes: this.resultadoService.getLegislacoes(),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ resultados, amostras, parametros, matrizes, legislacoes }) => {
          this.todosResultados = resultados.data ?? [];
          this.amostras = amostras.data ?? [];
          this.parametros = parametros.data ?? [];
          this.matrizes = matrizes.data ?? [];
          this.legislacoes = legislacoes.data ?? [];
          this.amostraPorId = new Map(this.amostras.map((item) => [item.id, item]));
          this.parametroPorId = new Map(
            this.parametros.map((item) => [item.id, item])
          );
          this.aplicarFiltros();
        },
        error: () => alert('Erro ao carregar dados do servidor.'),
      });
  }

  visualizarResultado(resultado: ResultadoAnalise): void {
    this.resultadoParaVisualizacao = resultado;
  }

  fecharVisualizacao(): void {
    this.resultadoParaVisualizacao = null;
  }

  onSubmit(): void {
    if (this.resultadoForm.invalid) {
      this.markFormGroupTouched();
      alert('Verifique os campos obrigatórios.');
      return;
    }

    this.loading = true;
    const formData = this.resultadoForm.getRawValue();
    const [dia, mes, ano] = String(formData.datacoleta).split('/');
    const payload = {
      valor_medido: Number(formData.valor_medido),
      amostra_id: Number(formData.amostra_id),
      parametro_id: Number(formData.parametro_id),
      datacoleta: new Date(`${ano}-${mes}-${dia}T12:00:00`).toISOString(),
      matriz_id_selecionada: formData.matriz ? Number(formData.matriz) : null,
      legislacao_id_selecionada: formData.legislacao
        ? Number(formData.legislacao)
        : null,
    };

    const operation =
      this.isEditing && this.editingId
        ? this.resultadoService.updateResultado(this.editingId, payload)
        : this.resultadoService.createResultado(payload);

    operation
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          alert('Operação realizada com sucesso!');
          this.resetForm();
          this.loadData();
        },
        error: (error) =>
          alert(error.error?.message || 'Não foi possível salvar o resultado.'),
      });
  }

  editResultado(resultado: ResultadoAnalise): void {
    this.isEditing = true;
    this.editingId = resultado.id;

    const data = resultado.datacoleta?.toString().split('T')[0].split('-');
    const dataFormatada = data?.length === 3 ? `${data[2]}/${data[1]}/${data[0]}` : '';
    const amostraId = Number(resultado.amostra_id);
    const parametroId = Number(resultado.parametro_id);

    this.amostraSelecionada = this.amostraPorId.get(amostraId) ?? null;
    this.parametroSelecionado = this.parametroPorId.get(parametroId) ?? null;
    this.numeroAmostraSelecionada =
      this.amostraSelecionada?.numero_da_amostra ?? '';

    const matrizEncontrada = this.matrizes.find(
      (matriz) => matriz.nome === resultado.matriz
    );
    const legislacaoEncontrada = this.legislacoes.find(
      (legislacao) =>
        `${legislacao.nome} (${legislacao.sigla})` === resultado.legislacao
    );

    this.resultadoForm.patchValue({
      valor_medido: resultado.valor_medido,
      amostra_id: amostraId,
      parametro_id: parametroId,
      datacoleta: dataFormatada,
      matriz: matrizEncontrada?.id ?? this.amostraSelecionada?.matriz_id ?? null,
      legislacao:
        legislacaoEncontrada?.id ?? this.parametroSelecionado?.legislacao_id ?? null,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteResultado(id: number): void {
    if (!confirm('Tem certeza que deseja excluir este resultado?')) return;

    this.loading = true;
    this.resultadoService
      .deleteResultado(id)
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          alert('Resultado excluído com sucesso!');
          this.loadData();
        },
        error: () => alert('Não foi possível excluir o resultado.'),
      });
  }

  resetForm(): void {
    this.resultadoForm.reset();
    this.isEditing = false;
    this.editingId = undefined;
    this.amostraSelecionada = null;
    this.parametroSelecionado = null;
    this.numeroAmostraSelecionada = '';
  }

  markFormGroupTouched(): void {
    this.resultadoForm.markAllAsTouched();
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

  getAmostraCodigo(id: number): string {
    return this.amostraPorId.get(Number(id))?.codigo_amostra ?? '';
  }

  getAmostraNumero(id: number): string {
    return this.amostraPorId.get(Number(id))?.numero_da_amostra ?? '';
  }

  getParametroNome(id: number): string {
    return this.parametroPorId.get(Number(id))?.nome ?? 'N/D';
  }

  getStatusConformidade(resultado: ResultadoAnalise): 'conforme' | 'nao-conforme' {
    const parametro = this.parametroPorId.get(Number(resultado.parametro_id));
    if (
      !parametro ||
      parametro.limite_minimo === null ||
      parametro.limite_maximo === null
    ) {
      return 'conforme';
    }

    return resultado.valor_medido < parametro.limite_minimo ||
      resultado.valor_medido > parametro.limite_maximo
      ? 'nao-conforme'
      : 'conforme';
  }

  getStatusText(status: string): string {
    return status === 'nao-conforme' ? 'Não conforme' : 'Conforme';
  }

  aplicarFiltros(): void {
    const codigo = this.filtroCodigoAmostra.trim().toLocaleLowerCase('pt-BR');
    const dataColeta = this.toIsoDate(this.filtroDataColeta);
    const dataPublicacao = this.toIsoDate(this.filtroDataPublicacao);

    const resultados = this.todosResultados.filter((resultado) => {
      if (
        codigo &&
        !this.getAmostraCodigo(resultado.amostra_id)
          .toLocaleLowerCase('pt-BR')
          .includes(codigo)
      ) {
        return false;
      }

      if (dataColeta && this.getDatePart(resultado.datacoleta) !== dataColeta) {
        return false;
      }

      if (
        dataPublicacao &&
        this.getDatePart(resultado.datadapublicacao) !== dataPublicacao
      ) {
        return false;
      }

      if (
        this.filtroStatus &&
        this.getStatusConformidade(resultado) !== this.filtroStatus
      ) {
        return false;
      }

      return (
        !this.parametrosAtivos.length ||
        this.parametrosAtivos.includes(Number(resultado.parametro_id))
      );
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
    if (this.paginaAtual < this.totalPaginas) {
      this.mudarPagina(this.paginaAtual + 1);
    }
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
    this.resultadoForm
      .get('amostra_id')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((amostraId) => {
        this.amostraSelecionada = this.amostraPorId.get(Number(amostraId)) ?? null;
        this.numeroAmostraSelecionada =
          this.amostraSelecionada?.numero_da_amostra ?? '';

        if (this.amostraSelecionada && !this.isEditing) {
          this.resultadoForm.patchValue({
            matriz: this.amostraSelecionada.matriz_id,
          });
        }
      });

    this.resultadoForm
      .get('parametro_id')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parametroId) => {
        this.parametroSelecionado =
          this.parametroPorId.get(Number(parametroId)) ?? null;

        if (this.parametroSelecionado && !this.isEditing) {
          this.resultadoForm.patchValue({
            legislacao: this.parametroSelecionado.legislacao_id,
          });
        }
      });
  }

  private aplicarMascaraData(input: string): string {
    const digits = input.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
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
