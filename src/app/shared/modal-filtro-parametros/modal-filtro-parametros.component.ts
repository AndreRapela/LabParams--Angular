import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParametrosFilterService } from '../filtro-parametros.service';
import {
  Parametro,
  ResultadoAnaliseService,
} from '../../resultado-analise/resultado-analise.service';

@Component({
  selector: 'app-modal-filtro-parametros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-filtro-parametros.component.html',
  styleUrls: ['./modal-filtro-parametros.component.css']
})
export class ModalFiltroParametrosComponent implements OnInit {
  @Output() readonly closed = new EventEmitter<void>();

  parametros: Parametro[] = [];
  selecionados: number[] = [];
  search = '';
  loading = true;
  error = '';

  constructor(
    private filtroService: ParametrosFilterService,
    private resultadoService: ResultadoAnaliseService
  ) {}

  ngOnInit(): void {

    this.resultadoService.getParametros().subscribe({
      next: (res) => {
        this.parametros = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar os parâmetros.';
        this.loading = false;
      }
    });

    this.selecionados = [...this.filtroService.snapshot()];
  }

  get parametrosFiltrados(): Parametro[] {
    if (!this.search) return this.parametros;

    const termo = this.normalize(this.search);
    return this.parametros.filter(p =>
      this.normalize(p.nome).includes(termo)
    );
  }

  toggle(id: number): void {
    if (this.selecionados.includes(id)) {
      this.selecionados = this.selecionados.filter(p => p !== id);
    } else {
      this.selecionados.push(id);
    }
  }

  aplicar(): void {
    this.filtroService.set([...this.selecionados]);
    this.closed.emit();
  }

  limpar(): void {
    this.selecionados = [];
    this.filtroService.clear();
    this.closed.emit();
  }

  cancelar(): void {
    this.closed.emit();
  }

  trackByParametro(_index: number, parametro: Parametro): number {
    return parametro.id;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }
}
