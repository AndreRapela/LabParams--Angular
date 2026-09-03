import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

// Serviços
import { AmostraService, Amostra, MatrizOption, UsuarioOption } from './amostra.service';
// Importamos o serviço de resultados para aproveitar a lista de parâmetros existente
import { ResultadoAnaliseService, Parametro } from '../resultado-analise/resultado-analise.service';
import { ConfirmationService } from '../shared/feedback/confirmation.service';
import { NotificationService } from '../shared/feedback/notification.service';

function getApiError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const candidate = error as { error?: { message?: unknown; error?: unknown }; message?: unknown };
  if (typeof candidate.error?.message === 'string') return candidate.error.message;
  if (typeof candidate.error?.error === 'string') return candidate.error.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}

@Component({
  selector: 'app-amostra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './amostra.component.html',
  styleUrls: ['./amostra.component.css']
})
export class AmostraComponent implements OnInit {

  amostras: Amostra[] = [];
  matrizes: MatrizOption[] = [];
  usuarios: UsuarioOption[] = [];
  parametros: Parametro[] = [];
  amostraForm: FormGroup;
  isEditing: boolean = false;
  editingId?: number;
  loading: boolean = false;
  filtroTexto: string = '';
  amostraParaVisualizacao: Amostra | null = null;
  mostrarModalCadastro: boolean = false;

  constructor(
    private readonly amostraService: AmostraService,
    private readonly resultadoService: ResultadoAnaliseService,
    private readonly fb: FormBuilder,
    private readonly notifications: NotificationService,
    private readonly confirmations: ConfirmationService
  ) {
    this.amostraForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  createForm(): FormGroup {
    return this.fb.group({
      codigo_amostra: ['', Validators.required],
      numero_da_amostra: ['', Validators.required],
      localizacao: ['', Validators.required],
      matriz_id: ['', Validators.required],
      usuario_id: ['', Validators.required],
      parametros_ids: [[]],
      data_coleta: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/), this.validarDataFutura]]
    });
  }

  abrirModalCadastro() {
    this.resetForm();
    this.mostrarModalCadastro = true;
  }

  fecharModalCadastro() {
    this.mostrarModalCadastro = false;
    this.resetForm();
  }

  validarDataFutura(control: AbstractControl) {
    const valor = control.value;
    if (!valor || valor.length !== 10) return null;

    const parts = valor.split('/');
    const dateInput = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dateInput > today ? { dataFutura: true } : null;
  }

  loadAllData(): void {
    this.loading = true;
    forkJoin({
      amostras: this.amostraService.findAll(),
      matrizes: this.amostraService.getMatrizes(),
      usuarios: this.amostraService.getUsuarios(),
      parametros: this.resultadoService.getParametros(),
    }).pipe(finalize(() => (this.loading = false))).subscribe({
      next: ({ amostras, matrizes, usuarios, parametros }) => {
        this.amostras = amostras.data || [];
        this.matrizes = matrizes.data || [];
        this.usuarios = usuarios.data || [];
        this.parametros = parametros.data || [];
      },
      error: () => {
        this.notifications.error('Erro ao carregar dados do servidor.');
      },
    });
  }

  loadAmostras(): void {
    this.loading = true;
    this.amostraService.findAll().subscribe({
      next: (res) => {
        this.amostras = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onSubmit(): void {
    if (this.amostraForm.valid) {
      this.loading = true;
      const formData = this.amostraForm.value;
      const parts = formData.data_coleta.split('/');
      const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const payload: Amostra = {
        codigo_amostra: formData.codigo_amostra,
        numero_da_amostra: formData.numero_da_amostra,
        localizacao: formData.localizacao,
        matriz_id: Number(formData.matriz_id),
        usuario_id: formData.usuario_id,
        data_coleta: isoDate,
        parametros_ids: formData.parametros_ids
          ? formData.parametros_ids.map((id: number | string) => Number(id))
          : []
      };

      let request;
      if (this.isEditing && this.editingId) {
        request = this.amostraService.update(this.editingId, payload);
      } else {
        request = this.amostraService.create(payload);
      }

      request.subscribe({
        next: () => {
          this.notifications.success(this.isEditing ? 'Amostra atualizada.' : 'Amostra cadastrada.');
          this.fecharModalCadastro();
          this.loadAmostras();
        },
        error: (err) => {
          this.notifications.error(getApiError(err, 'Não foi possível salvar a amostra.'));
          this.loading = false;
        }
      });
    } else {
      this.amostraForm.markAllAsTouched();
      this.notifications.warning('Verifique os campos obrigatórios.');
    }
  }

  edit(item: Amostra): void {
    this.isEditing = true;
    this.editingId = item.id;

    let dataFormatada = '';
    if (item.data_coleta) {
      const isoParts = item.data_coleta.toString().split('T')[0].split('-');
      dataFormatada = `${isoParts[2]}/${isoParts[1]}/${isoParts[0]}`;
    }

    this.loading = true;
    this.amostraService.findById(item.id!).subscribe({
      next: (res) => {
        const fullData = res.data;

        this.amostraForm.patchValue({
          codigo_amostra: fullData.codigo_amostra,
          numero_da_amostra: fullData.numero_da_amostra,
          localizacao: fullData.localizacao,
          matriz_id: fullData.matriz_id,
          usuario_id: fullData.usuario_id,
          data_coleta: dataFormatada,
          parametros_ids: fullData.parametros_ids || []
        });

        this.loading = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error: unknown) => {
        this.notifications.error(
          getApiError(error, 'Não foi possível carregar os detalhes da amostra.'),
        );
        this.loading = false;
      }
    });

    this.mostrarModalCadastro = true;
  }

  async delete(id: number): Promise<void> {
    const confirmed = await this.confirmations.confirm({
      title: 'Arquivar amostra',
      message: 'A amostra deixará as listas ativas, mas todo o histórico será preservado para auditoria.',
      confirmLabel: 'Arquivar',
      danger: true,
    });
    if (!confirmed) return;

    this.loading = true;
    this.amostraService.delete(id).subscribe({
      next: () => {
        this.notifications.success('Amostra arquivada com sucesso.');
        this.loadAmostras();
      },
      error: (error) => {
        this.notifications.error(getApiError(error, 'Não foi possível arquivar a amostra.'));
        this.loading = false;
      }
    });
  }

  resetForm(): void {
    this.amostraForm.reset();
    this.isEditing = false;
    this.editingId = undefined;
    this.amostraForm.controls['parametros_ids'].setValue([]);
  }

  formatarData(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);
    if (value.length > 4) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4);
    } else if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    input.value = value;
    this.amostraForm.get('data_coleta')?.setValue(value, { emitEvent: false });
  }

  get amostrasFiltradas() {
    if (!this.filtroTexto) return this.amostras;
    const termo = this.filtroTexto.toLowerCase();
    return this.amostras.filter(a =>
      a.codigo_amostra.toLowerCase().includes(termo) ||
      a.numero_da_amostra.toLowerCase().includes(termo) ||
      (a.localizacao && a.localizacao.toLowerCase().includes(termo))
    );
  }

  visualizarAmostra(id: number): void {
    this.loading = true;
    this.amostraService.findById(id).subscribe({
      next: (res) => {
        this.amostraParaVisualizacao = res.data;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.notifications.error(
          getApiError(error, 'Erro ao carregar detalhes da amostra.'),
        );
        this.loading = false;
      }
    });
  }

  fecharVisualizacao(): void {
    this.amostraParaVisualizacao = null;
  }
}
