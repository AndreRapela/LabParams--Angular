import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../config/api.config';
import { ClientesComponent } from '../../clientes/clientes.component';
import { ClientesService } from '../../clientes/clientes.service';
import { LaudoDetalheComponent } from '../../laudos/laudo-detalhe.component';
import { LaudosComponent } from '../../laudos/laudos.component';
import { LaudosService } from '../../laudos/laudos.service';
import { MetodosAnaliticosComponent } from '../../metodos-analiticos/metodos-analiticos.component';
import { MetodosAnaliticosService } from '../../metodos-analiticos/metodos-analiticos.service';
import { PedidosAnaliseComponent } from '../../pedidos-analise/pedidos-analise.component';
import { PedidosAnaliseService } from '../../pedidos-analise/pedidos-analise.service';
import { RevisaoResultadosComponent } from '../../revisao-resultados/revisao-resultados.component';
import { RevisaoResultadosService } from '../../revisao-resultados/revisao-resultados.service';

describe('Módulos do piloto comercial', () => {
  let httpMock: HttpTestingController;
  let clientes: ClientesService;
  let pedidos: PedidosAnaliseService;
  let metodos: MetodosAnaliticosService;
  let revisao: RevisaoResultadosService;
  let laudos: LaudosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ClientesService,
        PedidosAnaliseService,
        MetodosAnaliticosService,
        RevisaoResultadosService,
        LaudosService,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    clientes = TestBed.inject(ClientesService);
    pedidos = TestBed.inject(PedidosAnaliseService);
    metodos = TestBed.inject(MetodosAnaliticosService);
    revisao = TestBed.inject(RevisaoResultadosService);
    laudos = TestBed.inject(LaudosService);
  });

  afterEach(() => httpMock.verify());

  it('expõe todos os componentes standalone esperados pelas rotas lazy', () => {
    expect(ClientesComponent).toBeDefined();
    expect(PedidosAnaliseComponent).toBeDefined();
    expect(MetodosAnaliticosComponent).toBeDefined();
    expect(RevisaoResultadosComponent).toBeDefined();
    expect(LaudosComponent).toBeDefined();
    expect(LaudoDetalheComponent).toBeDefined();
  });

  it('envia o cadastro de cliente ao endpoint comercial', () => {
    clientes
      .criar({
        codigo: 'CLI-001',
        nome_razao_social: 'Cliente piloto',
        nome_fantasia: null,
        documento: null,
        email: null,
        telefone: null,
        endereco: null,
        observacoes: null,
        ativo: true,
      })
      .subscribe();
    const request = httpMock.expectOne(`${API_CONFIG.baseUrl}/clientes`);
    expect(request.request.method).toBe('POST');
    request.flush({ success: true, data: { id: 1 } });
  });

  it('usa o filtro q esperado pela API ao buscar clientes', () => {
    clientes.listar('Cliente piloto').subscribe();
    const request = httpMock.expectOne(
      (candidate) => candidate.url === `${API_CONFIG.baseUrl}/clientes`,
    );
    expect(request.request.params.get('q')).toBe('Cliente piloto');
    expect(request.request.params.has('busca')).toBeFalse();
    request.flush({ success: true, data: [] });
  });

  it('altera o status do pedido com motivo rastreável', () => {
    pedidos
      .alterarStatus(12, {
        status: 'cancelado',
        motivo: 'Solicitação do cliente',
      })
      .subscribe();
    const request = httpMock.expectOne(
      `${API_CONFIG.baseUrl}/pedidos-analise/12/status`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.motivo).toBe('Solicitação do cliente');
    request.flush({ success: true, data: { id: 12 } });
  });

  it('cadastra método com limites metrológicos tipados', () => {
    metodos
      .criar({
        codigo: 'SM-4500',
        nome: 'Determinação de pH',
        versao: '1.0',
        parametro_id: 1,
        matriz_id: 1,
        referencia_normativa: 'Standard Methods',
        principio: null,
        procedimento_resumido: null,
        unidade_resultado: 'unidade de pH',
        limite_deteccao: 0.01,
        limite_quantificacao: 0.05,
        incerteza_padrao: 0.1,
        ativo: true,
      })
      .subscribe();
    const request = httpMock.expectOne(
      `${API_CONFIG.baseUrl}/metodos-analiticos`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.limite_quantificacao).toBe(0.05);
    request.flush({ success: true, data: { id: 1 } });
  });

  it('não envia filtro booleano vazio ao listar todos os métodos', () => {
    metodos.listar().subscribe();
    const request = httpMock.expectOne(
      `${API_CONFIG.baseUrl}/metodos-analiticos`,
    );
    expect(request.request.params.has('ativo')).toBeFalse();
    request.flush({ success: true, data: [] });
  });

  it('registra a decisão no endpoint unificado de revisão', () => {
    revisao
      .revisar(7, {
        decisao: 'aprovar',
        senha: 'senha-temporaria',
        comentario: 'Dados conferidos',
      })
      .subscribe();
    const request = httpMock.expectOne(
      `${API_CONFIG.baseUrl}/resultados-analise/7/revisar`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.decisao).toBe('aprovar');
    request.flush({ success: true, data: { id: 7 } });
  });

  it('envia reautenticação também ao rejeitar um resultado', () => {
    revisao
      .revisar(8, {
        decisao: 'rejeitar',
        senha: 'senha-teste-rejeicao',
        comentario: 'Inconsistência técnica identificada.',
      })
      .subscribe();
    const request = httpMock.expectOne(
      `${API_CONFIG.baseUrl}/resultados-analise/8/revisar`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      decisao: 'rejeitar',
      senha: 'senha-teste-rejeicao',
      comentario: 'Inconsistência técnica identificada.',
    });
    request.flush({ success: true, data: { id: 8 } });
  });

  it('solicita a representação HTML autenticada do laudo', () => {
    laudos.obterHtml(9).subscribe((html) => expect(html).toContain('Laudo'));
    const request = httpMock.expectOne(`${API_CONFIG.baseUrl}/laudos/9/html`);
    expect(request.request.responseType).toBe('text');
    request.flush('<h1>Laudo</h1>');
  });
});
