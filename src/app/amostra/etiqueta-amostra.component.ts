import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { finalize, switchMap } from 'rxjs';
import { Amostra, AmostraService } from './amostra.service';

@Component({
  selector: 'app-etiqueta-amostra',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './etiqueta-amostra.component.html',
  styleUrl: './etiqueta-amostra.component.css',
})
export class EtiquetaAmostraComponent implements OnInit {
  amostra: Amostra | null = null;
  qrCode = '';
  loading = true;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly amostras: AmostraService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => this.amostras.findById(Number(params.get('id')))),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: async (response) => {
          this.amostra = response.data;
          this.qrCode = await QRCode.toDataURL(JSON.stringify({
            type: 'sysmlab-sample',
            id: this.amostra.id,
            code: this.amostra.codigo_amostra,
            number: this.amostra.numero_da_amostra,
          }), { width: 320, margin: 1, errorCorrectionLevel: 'M' });
        },
        error: () => {
          this.error = 'Não foi possível carregar a amostra para impressão.';
        },
      });
  }

  print(): void {
    window.print();
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
