import { CurrentAccess, getAccessBlockReason } from './access-state';

function access(overrides: Partial<CurrentAccess> = {}): CurrentAccess {
  return {
    cadastrado: true,
    perfil: 'Analista',
    acesso_aprovado: true,
    schema_ready: true,
    status_acesso: 'aprovado',
    ...overrides,
  };
}

describe('getAccessBlockReason', () => {
  it('libera somente cadastro aprovado com schema pronto', () => {
    expect(getAccessBlockReason(access())).toBeNull();
  });

  it('distingue conta pendente, não cadastrada e migração pendente', () => {
    expect(
      getAccessBlockReason(
        access({ acesso_aprovado: false, status_acesso: 'pendente' }),
      ),
    ).toBe('pendente');
    expect(
      getAccessBlockReason(
        access({
          cadastrado: false,
          perfil: null,
          acesso_aprovado: false,
          status_acesso: 'nao-cadastrado',
        }),
      ),
    ).toBe('nao-cadastrado');
    expect(
      getAccessBlockReason(
        access({ schema_ready: false, status_acesso: 'migracao-pendente' }),
      ),
    ).toBe('migracao-pendente');
  });
});
