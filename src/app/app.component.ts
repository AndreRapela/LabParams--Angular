import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouteConfigLoadEnd,
  RouteConfigLoadStart,
  RouterModule,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from './acessos/auth/auth.service';
import { ParametrosFilterService } from './shared/filtro-parametros.service';
import { ModalFiltroParametrosComponent } from './shared/modal-filtro-parametros/modal-filtro-parametros.component';
import { ConfirmationDialogComponent } from './shared/feedback/confirmation-dialog.component';
import { ConfirmationService } from './shared/feedback/confirmation.service';
import { ToastContainerComponent } from './shared/feedback/toast-container.component';

interface NavigationItem {
  label: string;
  shortLabel: string;
  route: string;
  icon: string;
  group: 'Monitoramento' | 'Operação' | 'Comercial' | 'Qualidade' | 'Administração';
  roles?: string[];
}

interface NavigationGroup {
  label: NavigationItem['group'];
  icon: string;
  items: NavigationItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    ModalFiltroParametrosComponent,
    ConfirmationDialogComponent,
    ToastContainerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly currentYear = new Date().getFullYear();
  readonly navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard Web',
      shortLabel: 'Dashboard',
      route: '/dashboard-web',
      icon: 'fa-chart-line',
      group: 'Monitoramento',
    },
    {
      label: 'Dashboard TV',
      shortLabel: 'TV',
      route: '/dashboard-tv',
      icon: 'fa-tv',
      group: 'Monitoramento',
    },
    {
      label: 'Amostras',
      shortLabel: 'Amostras',
      route: '/amostras',
      icon: 'fa-vial',
      group: 'Operação',
      roles: ['gestor', 'analista'],
    },
    {
      label: 'Alertas',
      shortLabel: 'Alertas',
      route: '/alertas',
      icon: 'fa-bell',
      group: 'Monitoramento',
      roles: ['gestor', 'analista'],
    },
    {
      label: 'Gráfico de parâmetros',
      shortLabel: 'Gráficos',
      route: '/grafico-parametros',
      icon: 'fa-chart-column',
      group: 'Monitoramento',
    },
    {
      label: 'Resultados das análises',
      shortLabel: 'Resultados',
      route: '/resultados-analise',
      icon: 'fa-eye-dropper',
      group: 'Operação',
      roles: ['gestor', 'analista'],
    },
    {
      label: 'Revisão de resultados',
      shortLabel: 'Revisão',
      route: '/revisao-resultados',
      icon: 'fa-list-check',
      group: 'Operação',
      roles: ['gestor', 'analista'],
    },
    {
      label: 'Laudos analíticos',
      shortLabel: 'Laudos',
      route: '/laudos',
      icon: 'fa-file-signature',
      group: 'Operação',
      roles: ['gestor', 'analista'],
    },
    {
      label: 'Clientes',
      shortLabel: 'Clientes',
      route: '/clientes',
      icon: 'fa-building',
      group: 'Comercial',
      roles: ['gestor'],
    },
    {
      label: 'Pedidos de análise',
      shortLabel: 'Pedidos',
      route: '/pedidos-analise',
      icon: 'fa-clipboard-list',
      group: 'Comercial',
      roles: ['gestor', 'analista'],
    },
    {
      label: 'Métodos analíticos',
      shortLabel: 'Métodos',
      route: '/metodos-analiticos',
      icon: 'fa-microscope',
      group: 'Qualidade',
      roles: ['gestor'],
    },
    {
      label: 'Inventário laboratorial',
      shortLabel: 'Inventário',
      route: '/inventario',
      icon: 'fa-boxes-stacked',
      group: 'Qualidade',
    },
    {
      label: 'Equipamentos',
      shortLabel: 'Equipamentos',
      route: '/equipamentos',
      icon: 'fa-gears',
      group: 'Qualidade',
    },
    {
      label: 'Não conformidades e CAPA',
      shortLabel: 'Qualidade',
      route: '/qualidade',
      icon: 'fa-shield-halved',
      group: 'Qualidade',
    },
    {
      label: 'Gerenciamento de parâmetros',
      shortLabel: 'Parâmetros',
      route: '/gerenciamento-parametros',
      icon: 'fa-sliders',
      group: 'Administração',
      roles: ['gestor'],
    },
    {
      label: 'Usuários e acessos',
      shortLabel: 'Usuários',
      route: '/cadastro-usuario',
      icon: 'fa-user-shield',
      group: 'Administração',
      roles: ['gestor'],
    },
    {
      label: 'Trilha de auditoria',
      shortLabel: 'Auditoria',
      route: '/auditoria',
      icon: 'fa-clock-rotate-left',
      group: 'Administração',
      roles: ['gestor'],
    },
  ];

  isLoading = true;
  isRouteLoading = false;
  isLoggedIn = false;
  isAuthRoute = false;
  menuOpen = false;
  openGroup = '';
  showFilterModal = false;

  userName = '';
  userEmail = '';
  userRole = '';
  parametrosAtivosCount = 0;
  mostrarBotaoParametros = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly filtroService: ParametrosFilterService,
    private readonly confirmations: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.authService.ready$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ready) => (this.isLoading = !ready));

    this.authService.isLoggedIn$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => void this.updateUser(status));

    this.filtroService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ids) => (this.parametrosAtivosCount = ids.length));

    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event instanceof RouteConfigLoadStart) {
          this.isRouteLoading = true;
        }

        if (event instanceof RouteConfigLoadEnd) {
          this.isRouteLoading = false;
        }

        if (event instanceof NavigationEnd) {
          this.updateRouteState(event.urlAfterRedirects);
        }
      });

    this.updateRouteState(this.router.url);
  }

  get visibleNavigationItems(): NavigationItem[] {
    if (!this.userRole) return this.navigationItems;
    const role = this.userRole.toLocaleLowerCase('pt-BR');
    return this.navigationItems.filter(
      (item) => !item.roles || item.roles.includes(role)
    );
  }

  get visibleNavigationGroups(): NavigationGroup[] {
    const icons: Record<NavigationItem['group'], string> = {
      Monitoramento: 'fa-gauge-high',
      Operação: 'fa-flask-vial',
      Comercial: 'fa-briefcase',
      Qualidade: 'fa-shield-halved',
      Administração: 'fa-gear',
    };
    const order: NavigationItem['group'][] = [
      'Monitoramento',
      'Operação',
      'Comercial',
      'Qualidade',
      'Administração',
    ];
    return order
      .map((label) => ({
        label,
        icon: icons[label],
        items: this.visibleNavigationItems.filter((item) => item.group === label),
      }))
      .filter((group) => group.items.length > 0);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.openGroup = '';
  }

  toggleGroup(label: string): void {
    this.openGroup = this.openGroup === label ? '' : label;
  }

  abrirFiltroParametros(): void {
    this.showFilterModal = true;
  }

  fecharFiltroParametros(): void {
    this.showFilterModal = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.fecharFiltroParametros();
    this.closeMenu();
  }

  async logout(): Promise<void> {
    const confirmed = await this.confirmations.confirm({
      title: 'Sair do sistema',
      message: 'Tem certeza que deseja encerrar sua sessão?',
      confirmLabel: 'Sair',
    });
    if (!confirmed) return;

    this.isLoading = true;
    try {
      await this.authService.logout();
      await this.router.navigate(['/login']);
    } finally {
      this.isLoading = false;
    }
  }

  private async updateUser(status: boolean): Promise<void> {
    this.isLoggedIn = status;

    if (!status) {
      this.userName = '';
      this.userEmail = '';
      this.userRole = '';
      return;
    }

    const session = await this.authService.getSession();
    const metadata = session?.user.user_metadata;
    this.userName =
      metadata?.['nome'] ||
      metadata?.['full_name'] ||
      metadata?.['name'] ||
      'Usuário';
    this.userEmail = session?.user.email ?? '';
    this.userRole = session?.user.app_metadata?.['perfil'] ?? 'Usuário';
  }

  private updateRouteState(url: string): void {
    const authRoutes = ['/login', '/recuperar-senha', '/nova-senha', '/verificar-laudo'];
    this.isAuthRoute = authRoutes.some((route) => url.startsWith(route));
    this.mostrarBotaoParametros = [
      '/dashboard-web',
      '/dashboard-tv',
      '/resultados-analise',
    ].some((route) => url.startsWith(route));
    this.menuOpen = false;
  }
}
