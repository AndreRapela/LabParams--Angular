import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ParametrosFilterService } from '../shared/filtro-parametros.service';
import { DashboardResponse, DashboardWebService } from './dashboard-web.service';
import { DashboardWebComponent } from './dashboard-web.component';

function response(page = 1): DashboardResponse {
  return {
    success: true,
    data: [
      {
        id: page,
        parametro_id: page,
        parameter_name: `Parâmetro ${page}`,
        current_value: 1,
        status: 'conforme',
        last_update: '2026-08-11T12:00:00.000Z',
      },
    ],
    statistics: {
      compliant_count: 25,
      alert_count: 0,
      critical_count: 0,
      non_compliant_count: 0,
      total_parameters: 25,
    },
    last_updated: '2026-08-11T12:00:00.000Z',
    pagination: {
      page,
      page_size: 12,
      total: 25,
      total_pages: 3,
      has_next: page < 3,
      has_previous: page > 1,
    },
  };
}

describe('DashboardWebComponent pagination', () => {
  it('navega no servidor e volta à página 1 ao aplicar filtro', async () => {
    const service = jasmine.createSpyObj<DashboardWebService>(
      'DashboardWebService',
      ['getDashboardData', 'getFilterOptions'],
    );
    service.getFilterOptions.and.returnValue(
      of({ success: true, matrizes: [], legislacoes: [] }),
    );
    service.getDashboardData.and.callFake((filters) =>
      of(response(filters?.page ?? 1)),
    );

    await TestBed.configureTestingModule({
      imports: [DashboardWebComponent],
      providers: [
        { provide: DashboardWebService, useValue: service },
        ParametrosFilterService,
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardWebComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(service.getDashboardData).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, page_size: 12 }),
    );
    component.mudarPagina(2);
    expect(component.page).toBe(2);
    expect(service.getDashboardData).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 2, page_size: 12 }),
    );

    component.filtroStatus = 'critico';
    component.filtrar();
    expect(component.page).toBe(1);
    expect(service.getDashboardData).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, status: 'critico' }),
    );

    fixture.detectChanges();
    const navigation = fixture.nativeElement.querySelector(
      'nav[aria-label="Paginação dos resultados monitorados"]',
    );
    expect(navigation).not.toBeNull();
  });
});
