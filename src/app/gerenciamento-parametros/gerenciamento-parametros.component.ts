import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GerencimantoParametroService } from './gerencimento-parametros.service';

@Component({
  selector: 'app-gerenciamento-parametros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gerenciamento-parametros.component.html',
  styleUrls: ['./gerenciamento-parametros.component.css']
})
export class GerenciamentoParametrosComponent implements OnInit {

  parametros: any[] = [];
  matrizes: any[] = [];
  legislacoes: any[] = [];

  editando = false;
  form: any = {};

  constructor(
    private gerenciamentoParametroService: GerencimantoParametroService
  ) {}

  ngOnInit(): void {
    this.carregarTudo();
  }

  carregarTudo(): void {
    this.gerenciamentoParametroService.getTela().subscribe(res => {
      this.parametros = res.parametros;
      this.matrizes = res.matrizes;
      this.legislacoes = res.legislacoes;
    });
  }

  abrirEdicao(item: any): void {
    this.form = { ...item };
    this.editando = true;
  }

  fechar(): void {
    this.editando = false;
    this.form = {};
  }

  salvar(): void {
    this.gerenciamentoParametroService
      .updateParametro(this.form.id, this.form)
      .subscribe(() => {
        this.editando = false;
        this.carregarTudo();
      });
  }
}
