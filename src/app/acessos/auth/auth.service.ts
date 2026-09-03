import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Session } from '@supabase/supabase-js';
import { API_CONFIG } from '../../../config/api.config';
import { getSupabaseClient } from './supabase.client';
import {
  CurrentAccess,
  CurrentAccessResponse,
  UserRole,
} from './access-state';

export type { CurrentAccess, UserRole } from './access-state';

export interface ManagedUser {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: UserRole;
  acesso_aprovado: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = getSupabaseClient();
  private readonly authState = new BehaviorSubject(false);
  private readonly readyState = new BehaviorSubject(false);

  private sessionCache: Session | null = null;
  private loadingSession: Promise<Session | null> | null = null;
  private refreshingSession: Promise<boolean> | null = null;
  private loadingCurrentAccess: Promise<CurrentAccess> | null = null;
  private sessionLoaded = false;

  readonly isLoggedIn$ = this.authState.asObservable();
  readonly ready$ = this.readyState.asObservable();
  private readonly currentAccessState = new BehaviorSubject<CurrentAccess | null>(null);
  readonly currentAccess$ = this.currentAccessState.asObservable();

  constructor(private readonly http: HttpClient) {
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
      this.readyState.next(true);
    });

    void this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    await this.getSession();
    this.readyState.next(true);
  }

  private setSession(session: Session | null): void {
    const previousUserId = this.sessionCache?.user.id ?? null;
    const nextUserId = session?.user.id ?? null;
    this.sessionCache = session;
    this.sessionLoaded = true;
    if (previousUserId !== nextUserId || !nextUserId) {
      this.currentAccessState.next(null);
      this.loadingCurrentAccess = null;
    }
    this.authState.next(Boolean(session?.user));
  }

  getSession(): Promise<Session | null> {
    if (this.sessionLoaded) {
      return Promise.resolve(this.sessionCache);
    }

    if (!this.loadingSession) {
      this.loadingSession = this.supabase.auth
        .getSession()
        .then(({ data }) => {
          this.setSession(data.session);
          return data.session;
        })
        .catch(() => {
          this.setSession(null);
          return null;
        })
        .finally(() => {
          this.loadingSession = null;
        });
    }

    return this.loadingSession;
  }

  getAccessToken(): string | null {
    return this.sessionCache?.access_token ?? null;
  }

  getCurrentAccess(): Promise<CurrentAccess> {
    if (!this.loadingCurrentAccess) {
      this.loadingCurrentAccess = this.performCurrentAccessCheck().finally(() => {
        this.loadingCurrentAccess = null;
      });
    }
    return this.loadingCurrentAccess;
  }

  refreshToken(): Promise<boolean> {
    // Várias chamadas podem receber 401 ao mesmo tempo. Compartilhar a mesma
    // renovação evita uma rajada de refresh tokens e estados de sessão rivais.
    if (!this.refreshingSession) {
      this.refreshingSession = this.performTokenRefresh().finally(() => {
        this.refreshingSession = null;
      });
    }

    return this.refreshingSession;
  }

  async login(email: string, password: string) {
    const result = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.data.session) {
      this.setSession(result.data.session);
    }

    return result;
  }

  async register(
    email: string,
    password: string,
    nome: string,
    telefone: string,
    perfil: UserRole = 'Usuário'
  ) {
    return firstValueFrom(this.http.post<{
      success: boolean;
      data?: { id: string; email: string; perfil: string };
      error?: string;
    }>(`${API_CONFIG.baseUrl}/usuarios`, {
      email,
      senha: password,
      nome,
      telefone,
      perfil,
    }));
  }

  async listUsers(): Promise<ManagedUser[]> {
    const response = await firstValueFrom(this.http.get<{
      success: boolean;
      data: ManagedUser[];
    }>(`${API_CONFIG.baseUrl}/usuarios`));
    return response.data;
  }

  async updateUserRole(userId: string, perfil: UserRole): Promise<void> {
    await firstValueFrom(this.http.put(
      `${API_CONFIG.baseUrl}/usuarios/${userId}/perfil`,
      { perfil }
    ));
  }

  async updateUserApproval(userId: string, acessoAprovado: boolean): Promise<void> {
    await firstValueFrom(this.http.put(
      `${API_CONFIG.baseUrl}/usuarios/${userId}/aprovacao`,
      { acesso_aprovado: acessoAprovado }
    ));
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } finally {
      this.setSession(null);
    }
  }

  requestPasswordReset(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
  }

  async setSessionFromToken(accessToken: string, refreshToken: string) {
    const { data, error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) throw error;
    this.setSession(data.session);
    return data.session;
  }

  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error || !data.session) {
        this.setSession(null);
        return false;
      }

      this.setSession(data.session);
      return true;
    } catch {
      // Uma falha de rede durante o refresh não pode manter uma sessão
      // expirada como se ainda fosse utilizável pelos guards.
      this.setSession(null);
      return false;
    }
  }

  private async performCurrentAccessCheck(): Promise<CurrentAccess> {
    try {
      const response = await firstValueFrom(
        this.http.get<CurrentAccessResponse>(`${API_CONFIG.baseUrl}/acesso-atual`),
      );
      if (!response.success || !response.data) {
        throw new Error('Resposta inválida ao verificar o acesso atual.');
      }
      this.currentAccessState.next(response.data);
      return response.data;
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        const response = error.error as Partial<CurrentAccessResponse> | null;
        if (
          response?.code === 'USUARIO_NAO_CADASTRADO' &&
          response.data?.status_acesso === 'nao-cadastrado'
        ) {
          this.currentAccessState.next(response.data);
          return response.data;
        }
      }
      throw error;
    }
  }
}
