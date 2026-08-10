import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LaudoVerificadoPublico } from '../laudos/laudo.model';
import { LaudosService } from '../laudos/laudos.service';
import { apiErrorMessage } from '../shared/http/api-error';

@Component({
  selector: 'app-verificar-laudo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verificar-laudo.component.html',
  styleUrl: './verificar-laudo.component.css',
})
export class VerificarLaudoComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  report: LaudoVerificadoPublico | null = null;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly laudosService: LaudosService,
  ) {}

  ngOnInit(): void {
    const hash = this.route.snapshot.paramMap.get('hash') || '';
    if (!/^[0-9a-f]{64}$/i.test(hash)) {
      this.loading = false;
      this.error = 'O código de verificação informado é inválido.';
      return;
    }

    this.laudosService
      .verificarAutenticidade(hash)
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const report = response.data;
          if (response.valid && report?.integridade_valida === true) {
            this.report = report;
            return;
          }
          this.report = null;
          this.error =
            report?.integridade_valida === false
              ? 'O documento foi localizado, mas sua integridade não pôde ser confirmada.'
              : response.message ||
                'Não encontramos um laudo com este código de integridade.';
        },
        error: (error: unknown) => {
          this.error = apiErrorMessage(
            error,
            'Não foi possível confirmar a autenticidade deste laudo.',
          );
        },
      });
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date);
  }
}
