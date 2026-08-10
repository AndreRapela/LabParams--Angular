import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../shared/http/api-error';
import {
  LaudoAmostraSnapshot,
  LaudoClienteSnapshot,
  LaudoDetalhe,
  LaudoResponsavelSnapshot,
  LaudoResultadoSnapshot,
} from './laudo.model';
import { LaudosService } from './laudos.service';

@Component({
  selector: 'app-laudo-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './laudo-detalhe.component.html',
  styleUrls: [
    '../shared/pilot-workflow/pilot-workflow.css',
    './laudo-detalhe.component.css',
  ],
})
export class LaudoDetalheComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  laudo: LaudoDetalhe | null = null;
  cliente: LaudoClienteSnapshot | null = null;
  amostra: LaudoAmostraSnapshot | null = null;
  resultados: LaudoResultadoSnapshot[] = [];
  responsavel: LaudoResponsavelSnapshot | null = null;
  loading = false;
  openingPrint = false;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly laudosService: LaudosService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'Identificador de laudo inválido.';
      return;
    }
    this.carregar(id);
  }

  carregar(id: number): void {
    this.loading = true;
    this.error = '';
    this.laudosService
      .buscarPorId(id)
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.laudo = response.data;
          this.cliente = response.data.snapshot.cliente ?? null;
          this.amostra = response.data.snapshot.amostra ?? null;
          this.resultados = response.data.snapshot.resultados ?? [];
          this.responsavel = response.data.snapshot.responsavel ?? null;
        },
        error: (error: unknown) =>
          (this.error = apiErrorMessage(
            error,
            'Não foi possível carregar o laudo.',
          )),
      });
  }

  abrirImpressao(): void {
    if (!this.laudo || this.openingPrint) return;
    if (this.laudo.integridade_valida !== true) {
      this.error =
        'A impressão foi bloqueada porque a integridade desta versão não foi confirmada.';
      return;
    }
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      this.error =
        'O navegador bloqueou a janela de impressão. Permita pop-ups para este endereço.';
      return;
    }
    printWindow.opener = null;
    printWindow.document.title = 'Preparando laudo…';
    printWindow.document.body.textContent =
      'Preparando versão oficial para impressão…';
    this.openingPrint = true;
    this.error = '';
    this.laudosService
      .obterHtml(this.laudo.id)
      .pipe(
        finalize(() => (this.openingPrint = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (html) => {
          const url = URL.createObjectURL(
            new Blob([html], { type: 'text/html;charset=utf-8' }),
          );
          printWindow.location.href = url;
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        error: (error: unknown) => {
          printWindow.close();
          this.error = apiErrorMessage(
            error,
            'Não foi possível preparar a impressão do laudo.',
          );
        },
      });
  }

  valorResultado(resultado: LaudoResultadoSnapshot): string {
    if (resultado.valor_qualitativo) return resultado.valor_qualitativo;
    if (resultado.valor_medido === null) return 'Não informado';
    const numericValue = Number(resultado.valor_medido);
    if (!Number.isFinite(numericValue)) return 'Valor inválido';
    const number = new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 8,
    }).format(numericValue);
    return `${number}${resultado.unidade ? ` ${resultado.unidade}` : ''}`;
  }

  conformidadeLabel(
    status: LaudoResultadoSnapshot['status_conformidade'],
  ): string {
    if (status === 'conforme') return 'Conforme';
    if (status === 'nao-conforme') return 'Não conforme';
    if (status === 'informativo') return 'Informativo';
    return 'Não avaliado';
  }

  formatDate(value: string | null | undefined, withTime = false): string {
    if (!value) return '—';
    const options: Intl.DateTimeFormatOptions = withTime
      ? { dateStyle: 'short', timeStyle: 'short' }
      : { dateStyle: 'short' };
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T12:00:00`
      : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return 'Data inválida';
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
  }

  legislacaoLabel(resultado: LaudoResultadoSnapshot): string {
    const legislation = resultado.legislacao;
    const context = resultado.contexto;
    const legislationLabel =
      typeof legislation === 'string'
        ? legislation
        : legislation?.sigla || legislation?.nome || '';
    const contextLabel =
      typeof context === 'string'
        ? context
        : context?.nome || context?.codigo || '';
    return [legislationLabel, contextLabel].filter(Boolean).join(' · ');
  }

  trackByResult(
    _index: number,
    resultado: LaudoResultadoSnapshot,
  ): number | string {
    return resultado.id ?? resultado.parametro;
  }
}
