import { HttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../../config/api.config';
import { AuthService } from '../../acessos/auth/auth.service';
import {
  apiAuthInterceptor,
  isApiRequestUrl,
} from './api-auth.interceptor';

describe('apiAuthInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getSession',
      'refreshToken',
      'getAccessToken',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    auth.getSession.and.resolveTo({
      access_token: 'valid-access-token',
      user: { id: 'user-1' },
    } as never);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiAuthInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia o Bearer apenas para a origem e o caminho delimitado da API', fakeAsync(() => {
    const requestUrl = `${API_CONFIG.baseUrl}/health`;
    client.get(requestUrl).subscribe();
    tick();

    const request = http.expectOne(requestUrl);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer valid-access-token',
    );
    request.flush({ ok: true });
  }));

  it('não vaza o Bearer para um domínio que apenas prefixa o host da API', () => {
    const base = new URL(API_CONFIG.baseUrl);
    const evilUrl = `${base.protocol}//${base.hostname}.evil.test${
      base.port ? `:${base.port}` : ''
    }${base.pathname.replace(/\/$/, '')}/collect`;
    client.get(evilUrl).subscribe();

    const request = http.expectOne(evilUrl);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ ok: true });
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it('reconhece URL relativa somente dentro de um caminho-base delimitado', () => {
    expect(
      isApiRequestUrl('/api/results', '/api', 'https://app.example.com'),
    ).toBeTrue();
    expect(
      isApiRequestUrl('/api-v2/results', '/api', 'https://app.example.com'),
    ).toBeFalse();
  });

  it('traduz bloqueio retornado pela API em uma navegação informativa', fakeAsync(() => {
    const requestUrl = `${API_CONFIG.baseUrl}/usuarios`;
    client.get(requestUrl).subscribe({ error: () => undefined });
    tick();

    const request = http.expectOne(requestUrl);
    request.flush(
      { code: 'ACESSO_PENDENTE' },
      { status: 403, statusText: 'Forbidden' },
    );
    expect(router.navigate).toHaveBeenCalledOnceWith(['/acesso-negado'], {
      queryParams: { motivo: 'pendente' },
    });
  }));
});
