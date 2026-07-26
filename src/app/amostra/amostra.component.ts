import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, FormsModule } from '@angular/forms';

// Serviços
import { AmostraService, Amostra, MatrizOption, UsuarioOption } from './amostra.service';
// Importamos o serviço de resultados para aproveitar a lista de parâmetros existente
import { ResultadoAnaliseService, Parametro } from '../resultado-analise/resultado-analise.service';

@Component({
  selector: 'app-amostra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
    private amostraService: AmostraService,
    private resultadoService: ResultadoAnaliseService,
    private fb: FormBuilder
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
    Promise.all([
      this.amostraService.findAll().toPromise(),
      this.amostraService.getMatrizes().toPromise(),
      this.amostraService.getUsuarios().toPromise(),
      this.resultadoService.getParametros().toPromise()
    ]).then(([resAmostras, resMatrizes, resUsuarios, resParametros]) => {

      this.amostras = resAmostras?.data || [];
      this.matrizes = resMatrizes?.data || [];
      this.usuarios = resUsuarios?.data || [];
      this.parametros = resParametros?.data || [];

      this.loading = false;
    }).catch(err => {
      console.error('Erro ao carregar dados:', err);
      alert('Erro ao carregar dados do servidor.');
      this.loading = false;
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
        parametros_ids: formData.parametros_ids ? formData.parametros_ids.map((id: any) => Number(id)) : []
      };

      let request;
      if (this.isEditing && this.editingId) {
        request = this.amostraService.update(this.editingId, payload);
      } else {
        request = this.amostraService.create(payload);
      }

      request.subscribe({
        next: () => {
          alert(this.isEditing ? 'Atualizado!' : 'Cadastrado!');
          this.fecharModalCadastro();
          this.loadAmostras();
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.message || err.message || 'Erro desconhecido';
          alert(`Erro: ${msg}`);
          this.loading = false;
        }
      });
    } else {
      this.amostraForm.markAllAsTouched();
      alert('Verifique os campos obrigatórios.');
    }
  }

  edit(item: Amostra): void {
    this.isEditing = true;
    this.editingId = item.id;

    let dataFormatada = '';
    if (item.data_coleta) {
      const dateObj = new Date(item.data_coleta);
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
      error: (err) => {
        console.error('Erro ao buscar detalhes:', err);
        this.loading = false;
      }
    });

    this.mostrarModalCadastro = true;
  }

  delete(id: number): void {
    if (confirm('Tem certeza que deseja excluir esta amostra?')) {
      this.loading = true;
      this.amostraService.delete(id).subscribe({
        next: () => {
          alert('Excluído com sucesso!');
          this.loadAmostras();
        },
        error: (err) => {
          const msg = err.error?.message || 'Erro ao excluir';
          alert(msg);
          this.loading = false;
        }
      });
    }
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
      error: (err) => {
        console.error(err);
        alert('Erro ao carregar detalhes da amostra.');
        this.loading = false;
      }
    });
  }

  fecharVisualizacao(): void {
    this.amostraParaVisualizacao = null;
  }
}
