import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportacaoResultadoService } from './importacao-resultado.service';

@Component({
  selector: 'app-importacao-resultado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './importacao-resultado.component.html',
  styleUrl: './importacao-resultado.component.css'
})
export class ImportacaoResultadoComponent {

  tipoSelecionado: 'planilha' | 'pdf' = 'planilha';
  arquivoSelecionado: File | null = null;
  nomeArquivo: string = '';
  loading: boolean = false;
  erro: string | null = null;
  sucesso: boolean = false;
  resultado: any = null;
  isDragOver: boolean = false;

  constructor(private importacaoService: ImportacaoResultadoService) {}

  selecionarTipo(tipo: 'planilha' | 'pdf'): void {
    this.tipoSelecionado = tipo;
    this.resetarEstado();
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.processarArquivo(files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processarArquivo(files[0]);
    }
  }

  private processarArquivo(file: File): void {
    const extensoesPermitidas = ['.csv', '.xls', '.xlsx'];
    const extensao = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!extensoesPermitidas.includes(extensao)) {
      this.erro = `Formato não suportado. Use: ${extensoesPermitidas.join(', ')}`;
      this.arquivoSelecionado = null;
      this.nomeArquivo = '';
      return;
    }

    // Validar tamanho (máximo 10MB)
    const tamanhoMaxMB = 10;
    if (file.size > tamanhoMaxMB * 1024 * 1024) {
      this.erro = `Arquivo muito grande. Máximo: ${tamanhoMaxMB}MB`;
      this.arquivoSelecionado = null;
      this.nomeArquivo = '';
      return;
    }

    this.arquivoSelecionado = file;
    this.nomeArquivo = file.name;
    this.erro = null;
  }

  selecionarArquivo(): void {
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  iniciarImportacao(): void {
    if (!this.arquivoSelecionado) {
      return;
    }

    this.loading = true;
    this.erro = null;
    this.sucesso = false;
    this.resultado = null;

    this.importacaoService.importarPlanilha(this.arquivoSelecionado).subscribe({
      next: (response) => {
        this.loading = false;
        this.sucesso = true;
        this.resultado = response;
      },
      error: (error) => {
        this.loading = false;
        this.erro = error.error?.message || error.error?.error || 'Erro ao processar importação';
      }
    });
  }

  resetarEstado(): void {
    this.arquivoSelecionado = null;
    this.nomeArquivo = '';
    this.erro = null;
    this.sucesso = false;
    this.loading = false;
    this.resultado = null;
    this.isDragOver = false;

    // Limpa o input de arquivo
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  /**
   * Inicia nova importação
   */
  novaImportacao(): void {
    this.resetarEstado();
  }

  /**
   * Formata número para exibição
   */
  formatarNumero(valor: number): string {
    return valor.toLocaleString('pt-BR');
  }
}
