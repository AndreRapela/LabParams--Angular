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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { Amostra, AmostraService } from '../amostra/amostra.service';
import { apiErrorMessage } from '../shared/http/api-error';
import { LaudoResumo } from './laudo.model';
import { LaudosService } from './laudos.service';
import { AuthService } from '../acessos/auth/auth.service';

type CriarLaudoForm = FormGroup<{
  amostra_id: FormControl<number | null>;
  senha: FormControl<string>;
  motivo: FormControl<string>;
  observacoes: FormControl<string>;
}>;

@Component({
  selector: 'app-laudos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './laudos.component.html',
  styleUrls: [
    '../shared/pilot-workflow/pilot-workflow.css',
    './laudos.component.css',
  ],
})
export class LaudosComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private dialogTrigger: HTMLElement | null = null;

  @ViewChild('generatorPanel')
  private generatorPanel?: ElementRef<HTMLElement>;

  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly form: CriarLaudoForm = new FormGroup({
    amostra_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    senha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    motivo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    observacoes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
  });

  laudos: LaudoResumo[] = [];
  amostras: Amostra[] = [];
  loading = false;
  saving = false;
  error = '';
  generatorOpen = false;
  canGenerate = false;

  constructor(
    private readonly laudosService: LaudosService,
    private readonly amostrasService: AmostraService,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.form.controls.amostra_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.atualizarValidacaoMotivo());
    void this.resolvePermission();
    this.carregar();
  }

  get laudosFiltrados(): LaudoResumo[] {
    const termo = this.buscaControl.value.trim().toLocaleLowerCase('pt-BR');
    return this.laudos.filter((laudo) => {
      const matchesText =
        !termo ||
        [
          laudo.numero,
          laudo.codigo_amostra,
          laudo.numero_da_amostra,
          laudo.cliente_nome,
        ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(termo));
      return matchesText;
    });
  }

  get totalAmostrasComLaudo(): number {
    return new Set(this.laudos.map((laudo) => laudo.amostra_id)).size;
  }

  get amostrasElegiveis(): Amostra[] {
    return this.amostras.filter(
      (amostra) => amostra.status_amostra === 'concluida',
    );
  }

  get versaoAtualSelecionada(): number {
    const amostraId = this.form.controls.amostra_id.value;
    if (amostraId === null) return 0;
    return this.laudos.reduce(
      (maior, laudo) =>
        laudo.amostra_id === amostraId ? Math.max(maior, laudo.versao) : maior,
      0,
    );
  }

  get proximaVersaoSelecionada(): number {
    return this.versaoAtualSelecionada + 1;
  }

  get revisaoSelecionada(): boolean {
    return this.proximaVersaoSelecionada > 1;
  }

  carregar(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      laudos: this.laudosService.listar(),
      amostras: this.amostrasService.findAll(),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ laudos, amostras }) => {
          this.laudos = laudos.data ?? [];
          this.amostras = amostras.data ?? [];
        },
        error: (error: unknown) => {
          this.laudos = [];
          this.error = apiErrorMessage(
            error,
            'Não foi possível carregar os laudos.',
          );
        },
      });
  }

  abrirGerador(): void {
    this.dialogTrigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.form.reset({
      amostra_id: null,
      senha: '',
      motivo: '',
      observacoes: '',
    });
    this.atualizarValidacaoMotivo();
    this.error = '';
    this.generatorOpen = true;
    window.setTimeout(() => this.generatorPanel?.nativeElement.focus());
  }

  fecharGerador(): void {
    if (this.saving) return;
    this.form.controls.senha.reset('');
    this.error = '';
    this.generatorOpen = false;
    const trigger = this.dialogTrigger;
    this.dialogTrigger = null;
    window.setTimeout(() => trigger?.focus());
  }

  @HostListener('document:keydown.escape')
  fecharGeradorComEscape(): void {
    if (this.generatorOpen) this.fecharGerador();
  }

  manterFocoNoGerador(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.generatorPanel) return;
    const focusable = Array.from(
      this.generatorPanel.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) {
      event.preventDefault();
      this.generatorPanel.nativeElement.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  gerarVersao(): void {
    this.atualizarValidacaoMotivo();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.amostra_id === null) return;
    this.saving = true;
    this.error = '';
    this.laudosService
      .criarVersao(value.amostra_id, {
        senha: value.senha,
        motivo: this.revisaoSelecionada ? value.motivo.trim() : null,
        observacoes: value.observacoes.trim() || null,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.form.controls.senha.reset('');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.generatorOpen = false;
          void this.router.navigate(['/laudos', response.data.id]);
        },
        error: (error: unknown) =>
          (this.error = apiErrorMessage(
            error,
            'Não foi possível gerar a versão do laudo. Verifique se a amostra possui resultados publicados.',
          )),
      });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data inválida';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  trackById(_index: number, laudo: LaudoResumo): number {
    return laudo.id;
  }

  trackByAmostraId(index: number, amostra: Amostra): number | string {
    return amostra.id ?? 'amostra-' + index;
  }

  rotuloVersaoAmostra(amostraId: number | undefined): string {
    if (amostraId === undefined) return 'sem identificação';
    const versao = this.laudos.reduce(
      (maior, laudo) =>
        laudo.amostra_id === amostraId ? Math.max(maior, laudo.versao) : maior,
      0,
    );
    return versao ? `última versão: v${versao}` : 'primeira emissão';
  }

  private async resolvePermission(): Promise<void> {
    const session = await this.authService.getSession();
    this.canGenerate =
      String(session?.user.app_metadata?.['perfil'] || '').toLocaleLowerCase(
        'pt-BR',
      ) === 'gestor';
  }

  private atualizarValidacaoMotivo(): void {
    const validators = this.revisaoSelecionada
      ? [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(1000),
        ]
      : [Validators.maxLength(1000)];
    this.form.controls.motivo.setValidators(validators);
    if (!this.revisaoSelecionada)
      this.form.controls.motivo.reset('', { emitEvent: false });
    this.form.controls.motivo.updateValueAndValidity({ emitEvent: false });
  }
}
