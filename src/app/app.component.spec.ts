import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from './acessos/auth/auth.service';
import { CurrentAccess } from './acessos/auth/access-state';

describe('AppComponent', () => {
  let currentAccess: BehaviorSubject<CurrentAccess | null>;

  beforeEach(async () => {
    currentAccess = new BehaviorSubject<CurrentAccess | null>(null);
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: AuthService,
          useValue: {
            ready$: of(true),
            isLoggedIn$: of(false),
            currentAccess$: currentAccess.asObservable(),
            getSession: () => Promise.resolve(null),
            logout: () => Promise.resolve()
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('só exibe navegação administrativa após receber o perfil da API', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(
      fixture.componentInstance.visibleNavigationItems.some(
        (item) => item.route === '/cadastro-usuario',
      ),
    ).toBeFalse();

    currentAccess.next({
      cadastrado: true,
      perfil: 'Gestor',
      acesso_aprovado: true,
      schema_ready: true,
      status_acesso: 'aprovado',
    });

    expect(
      fixture.componentInstance.visibleNavigationItems.some(
        (item) => item.route === '/cadastro-usuario',
      ),
    ).toBeTrue();
  });
});
