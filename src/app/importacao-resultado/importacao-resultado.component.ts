import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Inject,
  ViewChild
} from '@angular/core';
import { finalize } from 'rxjs';
import {
  FormatoTemplate,
  ImportacaoErroLinha,
  ImportacaoResposta,
  isImportacaoResposta
} from './importacao-resultado.model';
import { ImportacaoResultadoService } from './importacao-resultado.service';

@Component({
  selector: 'app-importacao-resultado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './importacao-resultado.component.html',
  styleUrl: './importacao-resultado.component.css'
})
export class ImportacaoResultadoComponent {
  private static readonly TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;
  private static readonly EXTENSOES_PERMITIDAS = ['.csv', '.xlsx'] as const;

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  arquivoSelecionado: File | null = null;
  nomeArquivo = '';
  loading = false;
  erro: string | null = null;
  resultado: ImportacaoResposta | null = null;
  isDragOver = false;
  formatoTemplateEmDownload: FormatoTemplate | null = null;
  erroTemplate: string | null = null;
  readonly limiteErrosExibidos = 50;

  constructor(
    private readonly importacaoService: ImportacaoResultadoService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.item(0);
    if (file) {
      this.processarArquivo(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.loading) {
      this.isDragOver = true;
    }
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

    if (this.loading) {
      return;
    }

    const file = event.dataTransfer?.files.item(0);
    if (file) {
      this.processarArquivo(file);
    }
  }

  selecionarArquivo(): void {
    if (!this.loading) {
      this.fileInput?.nativeElement.click();
    }
  }

  iniciarImportacao(): void {
    if (!this.arquivoSelecionado || this.loading) {
      return;
    }

    this.loading = true;
    this.erro = null;
    this.resultado = null;

    this.importacaoService.importarPlanilha(this.arquivoSelecionado)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (response) => {
          this.resultado = response;
        },
        error: (error: unknown) => {
          const payload = this.extrairPayloadErro(error);

          if (isImportacaoResposta(payload)) {
            this.resultado = payload;
            return;
          }

          this.erro = this.extrairMensagemErro(payload)
            ?? 'Não foi possível processar a importação. Tente novamente.';
        }
      });
  }

  baixarTemplate(formato: FormatoTemplate): void {
    if (this.formatoTemplateEmDownload) {
      return;
    }

    this.formatoTemplateEmDownload = formato;
    this.erroTemplate = null;

    this.importacaoService.baixarTemplate(formato)
      .pipe(finalize(() => {
        this.formatoTemplateEmDownload = null;
      }))
      .subscribe({
        next: (arquivo) => {
          this.salvarTemplate(arquivo, `template_importacao.${formato}`);
        },
        error: (error: unknown) => {
          const payload = this.extrairPayloadErro(error);
          this.erroTemplate = this.extrairMensagemErro(payload)
            ?? 'Não foi possível baixar o modelo. Tente novamente.';
        }
      });
  }

  resetarEstado(): void {
    this.arquivoSelecionado = null;
    this.nomeArquivo = '';
    this.erro = null;
    this.erroTemplate = null;
    this.resultado = null;
    this.loading = false;
    this.isDragOver = false;

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  novaImportacao(): void {
    this.resetarEstado();
  }

  formatarNumero(valor: number): string {
    return valor.toLocaleString('pt-BR');
  }

  identificarErro(index: number, erro: ImportacaoErroLinha): string | number {
    return erro.linha ?? `${erro.erro}-${index}`;
  }

  private processarArquivo(file: File): void {
    const ultimoPonto = file.name.lastIndexOf('.');
    const extensao = ultimoPonto >= 0
      ? file.name.slice(ultimoPonto).toLowerCase()
      : '';

    if (!ImportacaoResultadoComponent.EXTENSOES_PERMITIDAS.includes(
      extensao as typeof ImportacaoResultadoComponent.EXTENSOES_PERMITIDAS[number]
    )) {
      this.limparArquivoSelecionado();
      this.erro = 'Formato não suportado. Use arquivos .csv ou .xlsx.';
      return;
    }

    if (file.size > ImportacaoResultadoComponent.TAMANHO_MAXIMO_BYTES) {
      this.limparArquivoSelecionado();
      this.erro = 'Arquivo muito grande. O tamanho máximo permitido é 10 MB.';
      return;
    }

    this.arquivoSelecionado = file;
    this.nomeArquivo = file.name;
    this.erro = null;
  }

  private limparArquivoSelecionado(): void {
    this.arquivoSelecionado = null;
    this.nomeArquivo = '';

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private salvarTemplate(arquivo: Blob, nomeArquivo: string): void {
    const view = this.document.defaultView;
    if (!view) {
      this.erroTemplate = 'O download não está disponível neste ambiente.';
      return;
    }

    const url = view.URL.createObjectURL(arquivo);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.hidden = true;
    this.document.body.appendChild(link);

    try {
      link.click();
    } finally {
      link.remove();
      view.URL.revokeObjectURL(url);
    }
  }

  private extrairPayloadErro(error: unknown): unknown {
    if (error instanceof HttpErrorResponse) {
      return error.error;
    }

    if (this.isRecord(error) && 'error' in error) {
      return error['error'];
    }

    return error;
  }

  private extrairMensagemErro(payload: unknown): string | null {
    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (!this.isRecord(payload)) {
      return null;
    }

    const message = payload['message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    const error = payload['error'];
    return typeof error === 'string' && error.trim() ? error : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
