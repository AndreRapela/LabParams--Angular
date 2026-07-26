import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertaNaoConformidadeService, Alerta, AlertaStats } from './alerta-naoconformidade.service';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerta-naoconformidade.component.html',
  styleUrls: ['./alerta-naoconformidade.component.css']
})
export class AlertaNaoConformidadeComponent implements OnInit {

  alertas: Alerta[] = [];
  alertasFiltrados: Alerta[] = [];
  stats: AlertaStats = { total: 0, alerta: 0, naoConforme: 0, critico: 0 };
  filtroTexto: string = '';
  filtroStatus: string = 'Todos';
  isLoading: boolean = false;
  erroApi: boolean = false;

  constructor(private alertaNaoConformidadeService: AlertaNaoConformidadeService) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.isLoading = true;
    this.erroApi = false;

    this.alertaNaoConformidadeService.getAlertas().subscribe({
      next: (response) => {
        if (response.success) {
          this.alertas = response.data;
          this.stats = response.stats;

          this.aplicarFiltros();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar alertas:', err);
        this.erroApi = true;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros(): void {
    const termo = this.filtroTexto.toLowerCase().trim();

    this.alertasFiltrados = this.alertas.filter(item => {
      const matchTexto =
        (item.parametro_nome && item.parametro_nome.toLowerCase().includes(termo)) ||
        (item.matriz_nome && item.matriz_nome.toLowerCase().includes(termo));

      const matchStatus =
        this.filtroStatus === 'Todos' ||
        item.status === this.filtroStatus;

      return matchTexto && matchStatus;
    });
  }

  limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroStatus = 'Todos';
    this.aplicarFiltros();
  }
}
