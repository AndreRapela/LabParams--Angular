import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalFiltroParametrosComponent } from './modal-filtro-parametros.component';
import { ResultadoAnaliseService } from '../../resultado-analise/resultado-analise.service';
import { of } from 'rxjs';

describe('ModalFiltroParametrosComponent', () => {
  let component: ModalFiltroParametrosComponent;
  let fixture: ComponentFixture<ModalFiltroParametrosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalFiltroParametrosComponent],
      providers: [
        {
          provide: ResultadoAnaliseService,
          useValue: { getParametros: () => of({ success: true, data: [] }) }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalFiltroParametrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
