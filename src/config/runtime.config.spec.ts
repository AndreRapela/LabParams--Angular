import { resolveRuntimeConfig } from './runtime.config';

describe('runtime config', () => {
  it('prioriza valores fornecidos no deploy e remove barra final das URLs', () => {
    const config = resolveRuntimeConfig({
      apiUrl: 'https://api.example.com/',
      supabaseUrl: 'https://project.supabase.co///',
      supabasePublishableKey: 'sb_publishable_test',
    });

    expect(config.apiUrl).toBe('https://api.example.com');
    expect(config.supabaseUrl).toBe('https://project.supabase.co');
    expect(config.supabasePublishableKey).toBe('sb_publishable_test');
  });

  it('ignora sobrescritas vazias e mantém localhost durante o desenvolvimento', () => {
    const config = resolveRuntimeConfig({
      apiUrl: '   ',
      supabaseUrl: '',
      supabasePublishableKey: '',
    });

    expect(config.apiUrl).toBe('http://localhost:3000');
    expect(config.supabaseUrl).toContain('supabase.co');
    expect(config.supabasePublishableKey).toBeTruthy();
  });

  it('rejeita esquemas de URL executáveis e HTTP remoto em produção', () => {
    const executable = resolveRuntimeConfig({
      apiUrl: 'javascript:alert(1)',
      supabaseUrl: 'data:text/html,unsafe',
    });
    const insecureProduction = resolveRuntimeConfig(
      { apiUrl: 'http://insecure.example.com' },
      true,
    );

    expect(executable.apiUrl).toBe('http://localhost:3000');
    expect(executable.supabaseUrl).toContain('supabase.co');
    expect(insecureProduction.apiUrl).toBe('http://localhost:3000');
  });

  it('rejeita credenciais, query string e fragmento em URLs-base', () => {
    const withCredentials = resolveRuntimeConfig({
      apiUrl: 'https://user:password@api.example.com',
    });
    const withQuery = resolveRuntimeConfig({
      apiUrl: 'https://api.example.com?redirect=https://evil.example',
    });
    const withFragment = resolveRuntimeConfig({
      supabaseUrl: 'https://project.supabase.co/#unexpected',
    });

    expect(withCredentials.apiUrl).toBe('http://localhost:3000');
    expect(withQuery.apiUrl).toBe('http://localhost:3000');
    expect(withFragment.supabaseUrl).toBe(
      'https://huqtsxaonqnntgvjhltw.supabase.co',
    );
  });

  it('impede secret key no runtime sem incluir seu valor no erro ou resultado', () => {
    const unsafeValue = ['sb', 'secret', 'somente_teste'].join('_');
    const config = resolveRuntimeConfig({
      supabasePublishableKey: unsafeValue,
    });

    expect(config.supabasePublishableKey).not.toBe(unsafeValue);
    expect(config.supabasePublishableKey).toContain('sb_publishable_');
  });

  it('aceita somente JWT legado com papel anon', () => {
    const jwt = (role: string) => {
      const encode = (value: object) =>
        btoa(JSON.stringify(value))
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role })}.signature`;
    };
    const anon = jwt('anon');
    const serviceRole = jwt(['service', 'role'].join('_'));

    expect(
      resolveRuntimeConfig({ supabasePublishableKey: anon })
        .supabasePublishableKey,
    ).toBe(anon);
    expect(
      resolveRuntimeConfig({ supabasePublishableKey: serviceRole })
        .supabasePublishableKey,
    ).not.toBe(serviceRole);
  });
});
