import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { GraficoParametroService, DadosGrafico } from './grafico-parametro.service';

@Component({
  selector: 'app-grafico-parametros',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables()),],
  templateUrl: './grafico-parametro.component.html',
  styleUrls: ['./grafico-parametro.component.css']
})
export class GraficoParametroComponent implements OnInit {

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Média dos Resultados Numéricos',
        font: { size: 16 }
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        callbacks: {
          label: (context) => {
            const item = this.dadosGrafico[context.dataIndex];
            const unit = item?.unidade_medida ? ` ${item.unidade_medida}` : '';
            return `Média: ${Number(context.raw).toLocaleString('pt-BR')}${unit}`;
          },
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return this.getLabel(index);
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawOnChartArea: false,
          drawTicks: true
        },
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
          font: { size: 11 },
          padding: 8
        },
        border: {
          display: true,
          color: '#e5e7eb'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
          lineWidth: 1
        },
        border: {
          display: false,
          dash: [4, 4]
        },
        title: {
          display: true,
          text: 'Média observada',
          font: { size: 12 }
        },
        ticks: {
          padding: 10,
          callback: function (value) {
            if (typeof value === 'number') {
              return value.toFixed(2);
            }
            return value;
          }
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 20
      }
    }
  };

  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  public isLoading = true;
  public errorMessage: string | null = null;
  private dadosGrafico: DadosGrafico[] = [];

  public get labels(): string[] {
    return (this.barChartData.labels as string[]) || [];
  }

  public getLabel(index: number): string {
    return this.labels[index] || `Parâmetro ${index + 1}`;
  }

  public get hasData(): boolean {
    return this.labels.length > 0 && this.barChartData.datasets.length > 0;
  }

  private barSpacingConfig = {
    barPercentage: 0.6,
    categoryPercentage: 0.8
  };

  constructor(private graficoService: GraficoParametroService) { }

  ngOnInit(): void {
    this.carregarDadosDoGrafico();
  }

  carregarDadosDoGrafico(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.graficoService.getDadosGrafico().subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success && response.data && response.data.length > 0) {
          this.dadosGrafico = response.data;
          const labels = response.data.map((item: DadosGrafico) => item.parametro);
          const valoresReferencia = response.data.map((item: DadosGrafico) => {
            const valor = Number(item.valor_medio);
            return isNaN(valor) ? 0 : valor;
          });

          this.ajustarEspacamento(valoresReferencia.length);

          this.barChartData = {
            labels: labels,
            datasets: [
              {
                data: valoresReferencia,
                label: 'Média observada',
                backgroundColor: this.gerarCoresDinamicas(valoresReferencia.length),
                barThickness: 14,
                maxBarThickness: 22,
                hoverBackgroundColor: '#3a0ca3',
                borderRadius: 4,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                barPercentage: this.barSpacingConfig.barPercentage,
                categoryPercentage: this.barSpacingConfig.categoryPercentage,
              }
            ]
          };
        } else if (!response.success) {
          this.errorMessage = response.message || 'Não foi possível carregar os dados do gráfico.';
          this.barChartData = {
            labels: [],
            datasets: []
          };
          this.dadosGrafico = [];
        } else {
          this.errorMessage = null;
          this.barChartData = { labels: [], datasets: [] };
          this.dadosGrafico = [];
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Erro ao carregar dados do gráfico. Tente novamente.';
        this.dadosGrafico = [];
      }
    });
  }

  private ajustarEspacamento(totalBarras: number): void {
    // Ajuste automático baseado na quantidade de barras
    if (totalBarras <= 5) {
      this.barSpacingConfig = {
        barPercentage: 0.7,
        categoryPercentage: 0.9
      };
    } else if (totalBarras <= 10) {
      this.barSpacingConfig = {
        barPercentage: 0.6,
        categoryPercentage: 0.8
      };
    } else if (totalBarras <= 20) {
      this.barSpacingConfig = {
        barPercentage: 0.5,
        categoryPercentage: 0.7
      };
    } else if (totalBarras <= 30) {
      this.barSpacingConfig = {
        barPercentage: 0.4,
        categoryPercentage: 0.6
      };
    } else {
      // Para muitos dados, barras mais finas mas ainda com espaçamento
      this.barSpacingConfig = {
        barPercentage: 0.3,
        categoryPercentage: 0.5
      };
    }
  }

  private gerarCoresDinamicas(totalBarras: number): string[] {
    const coresBase = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0'];

    if (totalBarras <= coresBase.length) {
      return coresBase.slice(0, totalBarras);
    }

    const cores: string[] = [];
    for (let i = 0; i < totalBarras; i++) {
      const hue = (i * 137.508) % 360;
      cores.push(`hsl(${hue}, 70%, 60%)`);
    }
    return cores;
  }

  recarregar(): void {
    this.carregarDadosDoGrafico();
  }
}
