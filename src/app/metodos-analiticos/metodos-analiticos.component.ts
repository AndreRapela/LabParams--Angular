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
import {
  Matriz,
  Parametro,
  ResultadoAnaliseService,
} from '../resultado-analise/resultado-analise.service';
import { apiErrorMessage } from '../shared/http/api-error';
import {
  MetodoAnalitico,
  MetodoAnaliticoPayload,
} from './metodo-analitico.model';
import { MetodosAnaliticosService } from './metodos-analiticos.service';

type MetodoForm = FormGroup<{
  codigo: FormControl<string>;
  nome: FormControl<string>;
  versao: FormControl<string>;
  parametro_id: FormControl<number | null>;
  matriz_id: FormControl<number | null>;
  referencia_normativa: FormControl<string>;
  principio: FormControl<string>;
  procedimento_resumido: FormControl<string>;
  unidade_resultado: FormControl<string>;
  limite_deteccao: FormControl<string>;
  limite_quantificacao: FormControl<string>;
  incerteza_padrao: FormControl<string>;
  ativo: FormControl<boolean>;
}>;

@Component({
  selector: 'app-metodos-analiticos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './metodos-analiticos.component.html',
  styleUrls: [
    '../shared/pilot-workflow/pilot-workflow.css',
    './metodos-analiticos.component.css',
  ],
})
export class MetodosAnaliticosComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly decimalPattern = /^\d+(?:[.,]\d+)?$/;

  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly somenteAtivosControl = new FormControl(false, { nonNullable: true });
  readonly form: MetodoForm = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(180)],
    }),
    versao: new FormControl('1.0', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    parametro_id: new FormControl<number | null>(null),
    matriz_id: new FormControl<number | null>(null),
    referencia_normativa: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    principio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    procedimento_resumido: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(3000)],
    }),
    unidade_resultado: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    limite_deteccao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(this.decimalPattern)],
    }),
    limite_quantificacao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(this.decimalPattern)],
    }),
    incerteza_padrao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(this.decimalPattern)],
    }),
    ativo: new FormControl(true, { nonNullable: true }),
  });

  metodos: MetodoAnalitico[] = [];
  parametros: Parametro[] = [];
  matrizes: Matriz[] = [];
  loading = false;
  saving = false;
  error = '';
  feedback = '';
  editorOpen = false;
  editingId: number | null = null;

  constructor(
    private readonly metodosService: MetodosAnaliticosService,
    private readonly resultadosService: ResultadoAnaliseService,
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  get metodosFiltrados(): MetodoAnalitico[] {
    const termo = this.buscaControl.value.trim().toLocaleLowerCase('pt-BR');
    return this.metodos.filter((metodo) => {
      if (this.somenteAtivosControl.value && !metodo.ativo) return false;
      return (
        !termo ||
        [
          metodo.codigo,
          metodo.nome,
          metodo.versao,
          metodo.parametro_nome,
          metodo.matriz_nome,
          metodo.referencia_normativa,
        ].some((valor) => valor?.toLocaleLowerCase('pt-BR').includes(termo))
      );
    });
  }

  get totalAtivos(): number {
    return this.metodos.filter((metodo) => metodo.ativo).length;
  }

  carregar(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      metodos: this.metodosService.listar(),
      parametros: this.resultadosService.getParametros(),
      matrizes: this.resultadosService.getMatrizes(),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ metodos, parametros, matrizes }) => {
          this.metodos = metodos.data ?? [];
          this.parametros = this.uniqueParametros(parametros.data ?? []);
          this.matrizes = matrizes.data ?? [];
        },
        error: (error: unknown) => {
          this.metodos = [];
          this.error = apiErrorMessage(
            error,
            'Não foi possível carregar os métodos analíticos.',
          );
        },
      });
  }

  novo(): void {
    this.editingId = null;
    this.form.reset({
      codigo: '',
      nome: '',
      versao: '1.0',
      parametro_id: null,
      matriz_id: null,
      referencia_normativa: '',
      principio: '',
      procedimento_resumido: '',
      unidade_resultado: '',
      limite_deteccao: '',
      limite_quantificacao: '',
      incerteza_padrao: '',
      ativo: true,
    });
    this.error = '';
    this.feedback = '';
    this.editorOpen = true;
  }

  editar(metodo: MetodoAnalitico): void {
    this.editingId = metodo.id;
    this.form.reset({
      codigo: metodo.codigo,
      nome: metodo.nome,
      versao: metodo.versao,
      parametro_id: metodo.parametro_id,
      matriz_id: metodo.matriz_id,
      referencia_normativa: metodo.referencia_normativa ?? '',
      principio: metodo.principio ?? '',
      procedimento_resumido: metodo.procedimento_resumido ?? '',
      unidade_resultado: metodo.unidade_resultado ?? '',
      limite_deteccao: this.decimalString(metodo.limite_deteccao),
      limite_quantificacao: this.decimalString(metodo.limite_quantificacao),
      incerteza_padrao: this.decimalString(metodo.incerteza_padrao),
      ativo: metodo.ativo,
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
      this.error = 'Revise os campos destacados antes de salvar.';
      return;
    }
    const value = this.form.getRawValue();
    const ld = this.toNumber(value.limite_deteccao);
    const lq = this.toNumber(value.limite_quantificacao);
    if (ld !== null && lq !== null && ld > lq) {
      this.error =
        'O limite de detecção não pode ser maior que o limite de quantificação.';
      return;
    }
    const payload: MetodoAnaliticoPayload = {
      codigo: value.codigo.trim(),
      nome: value.nome.trim(),
      versao: value.versao.trim(),
      parametro_id: value.parametro_id,
      matriz_id: value.matriz_id,
      referencia_normativa: this.optional(value.referencia_normativa),
      principio: this.optional(value.principio),
      procedimento_resumido: this.optional(value.procedimento_resumido),
      unidade_resultado: this.optional(value.unidade_resultado),
      limite_deteccao: ld,
      limite_quantificacao: lq,
      incerteza_padrao: this.toNumber(value.incerteza_padrao),
      ativo: value.ativo,
    };
    this.saving = true;
    this.error = '';
    const operation =
      this.editingId === null
        ? this.metodosService.criar(payload)
        : this.metodosService.atualizar(this.editingId, payload);
    operation
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback =
            this.editingId === null
              ? 'Método analítico cadastrado.'
              : 'Método analítico atualizado.';
          this.editorOpen = false;
          this.carregar();
        },
        error: (error: unknown) =>
          (this.error = apiErrorMessage(
            error,
            'Não foi possível salvar o método.',
          )),
      });
  }

  formatDecimal(value: number | null, suffix = ''): string {
    if (value === null) return '—';
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 }).format(value)}${suffix}`;
  }

  trackById(_index: number, metodo: MetodoAnalitico): number {
    return metodo.id;
  }

  private uniqueParametros(parametros: Parametro[]): Parametro[] {
    const byId = new Map<number, Parametro>();
    parametros.forEach((parametro) => byId.set(parametro.id, parametro));
    return [...byId.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }

  private optional(value: string): string | null {
    return value.trim() || null;
  }

  private decimalString(value: number | null): string {
    return value === null ? '' : String(value).replace('.', ',');
  }

  private toNumber(value: string): number | null {
    const normalized = value.trim().replace(',', '.');
    return normalized ? Number(normalized) : null;
  }
}
