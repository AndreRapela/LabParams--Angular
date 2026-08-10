import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('prioriza a mensagem segura da API e inclui a referência de suporte', () => {
    const error = new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: {
        message: 'Os dados não atendem às regras de validação.',
        request_id: 'req-123',
      },
    });

    expect(apiErrorMessage(error)).toBe(
      'Os dados não atendem às regras de validação. Referência: req-123.',
    );
  });

  it('não exibe páginas HTML devolvidas por proxy ou servidor', () => {
    const error = new HttpErrorResponse({
      status: 502,
      statusText: 'Bad Gateway',
      error: '<html><body>Detalhes internos do proxy</body></html>',
      headers: new HttpHeaders({ 'content-type': 'text/html' }),
    });

    expect(
      apiErrorMessage(error, 'Serviço temporariamente indisponível.'),
    ).toBe('Serviço temporariamente indisponível.');
  });

  it('traduz estados HTTP recorrentes em orientações acionáveis', () => {
    const forbidden = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
    });
    const throttled = new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
    });

    expect(apiErrorMessage(forbidden)).toContain('não possui permissão');
    expect(apiErrorMessage(throttled)).toContain('Aguarde um momento');
  });

  it('explica falhas de conexão sem expor detalhes técnicos', () => {
    const error = new HttpErrorResponse({
      status: 0,
      statusText: 'Unknown Error',
    });
    expect(apiErrorMessage(error)).toBe(
      'A API está indisponível. Verifique a conexão e tente novamente.',
    );
  });
});
