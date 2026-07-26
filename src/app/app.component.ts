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

interface NavigationItem {
  label: string;
  shortLabel: string;
  route: string;
  icon: string;
  roles?: string[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    ModalFiltroParametrosComponent,
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
    },
    {
      label: 'Dashboard TV',
      shortLabel: 'TV',
      route: '/dashboard-tv',
      icon: 'fa-tv',
    },
    {
      label: 'Amostras',
      shortLabel: 'Amostras',
      route: '/amostras',
      icon: 'fa-vial',
    },
    {
      label: 'Alertas',
      shortLabel: 'Alertas',
      route: '/alertas',
      icon: 'fa-bell',
      roles: ['gestor', 'admin', 'administrador'],
    },
    {
      label: 'Gráfico de parâmetros',
      shortLabel: 'Gráficos',
      route: '/grafico-parametros',
      icon: 'fa-chart-column',
    },
    {
      label: 'Resultados das análises',
      shortLabel: 'Resultados',
      route: '/resultados-analise',
      icon: 'fa-eye-dropper',
    },
    {
      label: 'Gerenciamento de parâmetros',
      shortLabel: 'Parâmetros',
      route: '/gerenciamento-parametros',
      icon: 'fa-sliders',
    },
  ];

  isLoading = true;
  isRouteLoading = false;
  isLoggedIn = false;
  isAuthRoute = false;
  menuOpen = false;
  showFilterModal = false;

  userName = '';
  userEmail = '';
  userRole = '';
  parametrosAtivosCount = 0;
  mostrarBotaoParametros = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly filtroService: ParametrosFilterService
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

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
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
    if (!confirm('Tem certeza que deseja sair do sistema?')) return;

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
    this.userRole = metadata?.['perfil'] ?? '';
  }

  private updateRouteState(url: string): void {
    const authRoutes = ['/login', '/recuperar-senha', '/nova-senha'];
    this.isAuthRoute = authRoutes.some((route) => url.startsWith(route));
    this.mostrarBotaoParametros = [
      '/dashboard-web',
      '/dashboard-tv',
      '/resultados-analise',
    ].some((route) => url.startsWith(route));
    this.menuOpen = false;
  }
}
