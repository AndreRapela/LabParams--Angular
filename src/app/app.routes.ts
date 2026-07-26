import { Routes } from '@angular/router';
import { authGuard } from './acessos/auth/auth.guard';
import { loginGuard } from './acessos/login/login.guard';

export const routes: Routes = [
  {
    path: 'dashboard-web',
    loadComponent: () =>
      import('./dashboard-web/dashboard-web.component').then(
        (module) => module.DashboardWebComponent
      ),
    canActivate: [authGuard],
    title: 'Dashboard de Monitoramento | SYSmLab',
  },
  {
    path: 'dashboard-tv',
    loadComponent: () =>
      import('./dashboard-tv/dashboard-tv.component').then(
        (module) => module.DashboardTvComponent
      ),
    canActivate: [authGuard],
    title: 'Dashboard TV | SYSmLab',
  },
  {
    path: 'amostras',
    loadComponent: () =>
      import('./amostra/amostra.component').then(
        (module) => module.AmostraComponent
      ),
    canActivate: [authGuard],
    title: 'Registro de Amostras | SYSmLab',
  },
  {
    path: 'alertas',
    loadComponent: () =>
      import('./alerta-naoconformidade/alerta-naoconformidade.component').then(
        (module) => module.AlertaNaoConformidadeComponent
      ),
    canActivate: [authGuard],
    data: { roles: ['Gestor'] },
    title: 'Não Conformidades | SYSmLab',
  },
  {
    path: 'grafico-parametros',
    loadComponent: () =>
      import('./grafico-parametros/grafico-parametro.component').then(
        (module) => module.GraficoParametroComponent
      ),
    canActivate: [authGuard],
    title: 'Gráfico de Parâmetros | SYSmLab',
  },
  {
    path: 'resultados-analise',
    loadComponent: () =>
      import('./resultado-analise/resultado-analise.component').then(
        (module) => module.ResultadoAnaliseComponent
      ),
    canActivate: [authGuard],
    title: 'Resultados das Análises | SYSmLab',
  },
  {
    path: 'gerenciamento-parametros',
    loadComponent: () =>
      import(
        './gerenciamento-parametros/gerenciamento-parametros.component'
      ).then((module) => module.GerenciamentoParametrosComponent),
    canActivate: [authGuard],
    title: 'Gerenciamento de Parâmetros | SYSmLab',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./acessos/login/login.component').then(
        (module) => module.LoginComponent
      ),
    canActivate: [loginGuard],
    title: 'Entrar | SYSmLab',
  },
  {
    path: 'cadastro-usuario',
    loadComponent: () =>
      import('./acessos/cadastro-usuario/cadastro-usuario.component').then(
        (module) => module.CadastroUsuarioComponent
      ),
    canActivate: [authGuard],
    data: { roles: ['Gestor'] },
    title: 'Cadastro de Usuário | SYSmLab',
  },
  {
    path: 'recuperar-senha',
    loadComponent: () =>
      import('./acessos/recuperar-senha/recuperar-senha.component').then(
        (module) => module.RecuperarSenhaComponent
      ),
    title: 'Recuperar Senha | SYSmLab',
  },
  {
    path: 'nova-senha',
    loadComponent: () =>
      import('./acessos/nova-senha/nova-senha.component').then(
        (module) => module.NovaSenhaComponent
      ),
    title: 'Nova Senha | SYSmLab',
  },
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./acesso-negado/acesso-negado.component').then(
        (module) => module.AcessoNegadoComponent
      ),
    title: 'Acesso Negado | SYSmLab',
  },
  { path: '', redirectTo: 'dashboard-web', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard-web' },
];
