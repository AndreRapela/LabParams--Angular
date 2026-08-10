import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { VerificacaoLaudoResponse } from '../laudos/laudo.model';
import { LaudosService } from '../laudos/laudos.service';
import { VerificarLaudoComponent } from './verificar-laudo.component';

describe('VerificarLaudoComponent', () => {
  let fixture: ComponentFixture<VerificarLaudoComponent>;
  let laudosService: jasmine.SpyObj<LaudosService>;
  const hash = 'b'.repeat(64);

  async function montar(response: VerificacaoLaudoResponse): Promise<void> {
    laudosService = jasmine.createSpyObj<LaudosService>('LaudosService', [
      'verificarAutenticidade',
    ]);
    laudosService.verificarAutenticidade.and.returnValue(of(response));

    await TestBed.configureTestingModule({
      imports: [VerificarLaudoComponent],
      providers: [
        provideRouter([]),
        { provide: LaudosService, useValue: laudosService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ hash }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificarLaudoComponent);
    fixture.detectChanges();
  }

  it('não declara autenticidade quando a integridade é inválida', async () => {
    await montar({
      success: true,
      valid: true,
      data: {
        numero: 'LAU-001-V1',
        versao: 1,
        emitido_em: '2026-07-29T12:00:00.000Z',
        conteudo_hash: hash,
        integridade_valida: false,
        laboratorio_nome: 'SYSmLab',
        total_resultados: 2,
      },
    });

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Documento não confirmado');
    expect(content).not.toContain('Documento autêntico');
  });

  it('não expõe identificadores da amostra recebidos indevidamente', async () => {
    const response = {
      success: true,
      valid: true,
      data: {
        numero: 'LAU-001-V1',
        versao: 1,
        emitido_em: '2026-07-29T12:00:00.000Z',
        conteudo_hash: hash,
        integridade_valida: true,
        laboratorio_nome: 'SYSmLab',
        total_resultados: 2,
        codigo_amostra: 'CODIGO-PRIVADO',
        numero_da_amostra: 'NUMERO-PRIVADO',
      },
    } as unknown as VerificacaoLaudoResponse;

    await montar(response);

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Documento autêntico');
    expect(content).not.toContain('CODIGO-PRIVADO');
    expect(content).not.toContain('NUMERO-PRIVADO');
  });
});
