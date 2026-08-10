import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

interface AuditEntry {
  id: number;
  occurred_at: string;
  action: 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'RESTORE' | 'IMPORT' | 'ROLE_CHANGE';
  entity_type: string;
  entity_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
}

interface AuditResponse {
  success: boolean;
  data: AuditEntry[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.css',
})
export class AuditoriaComponent implements OnInit {
  readonly entityOptions = [
    { value: '', label: 'Todas as entidades' },
    { value: 'amostra', label: 'Amostras' },
    { value: 'resultado_analise', label: 'Resultados e importações' },
    { value: 'parametro', label: 'Parâmetros' },
    { value: 'usuario', label: 'Usuários' },
  ];

  entries: AuditEntry[] = [];
  entityType = '';
  page = 1;
  pageSize = 25;
  total = 0;
  totalPages = 0;
  loading = false;
  error = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(page = this.page): void {
    this.loading = true;
    this.error = '';
    this.page = page;

    let params = new HttpParams()
      .set('page', this.page)
      .set('page_size', this.pageSize);
    if (this.entityType) params = params.set('entity_type', this.entityType);

    this.http
      .get<AuditResponse>(`${API_CONFIG.baseUrl}/auditoria`, { params })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.entries = response.data;
          this.page = response.pagination.page;
          this.total = response.pagination.total;
          this.totalPages = response.pagination.total_pages;
        },
        error: () => {
          this.entries = [];
          this.total = 0;
          this.totalPages = 0;
          this.error = 'Não foi possível carregar a trilha de auditoria.';
        },
      });
  }

  applyFilter(): void {
    this.load(1);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value));
  }

  actionLabel(action: AuditEntry['action']): string {
    const labels: Record<AuditEntry['action'], string> = {
      CREATE: 'Criação',
      UPDATE: 'Alteração',
      ARCHIVE: 'Arquivamento',
      RESTORE: 'Restauração',
      IMPORT: 'Importação',
      ROLE_CHANGE: 'Mudança de perfil',
    };
    return labels[action];
  }

  entityLabel(value: string): string {
    return this.entityOptions.find((option) => option.value === value)?.label ?? value;
  }

  trackById(_index: number, entry: AuditEntry): number {
    return entry.id;
  }
}
