import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Session } from '@supabase/supabase-js';
import { API_CONFIG } from '../../../config/api.config';
import { getSupabaseClient } from './supabase.client';

export type UserRole = 'Gestor' | 'Analista' | 'Usuário';

export interface ManagedUser {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: UserRole;
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
  private sessionLoaded = false;

  readonly isLoggedIn$ = this.authState.asObservable();
  readonly ready$ = this.readyState.asObservable();

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
    this.sessionCache = session;
    this.sessionLoaded = true;
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

  async refreshToken(): Promise<boolean> {
    const { data, error } = await this.supabase.auth.refreshSession();

    if (error || !data.session) {
      this.setSession(null);
      return false;
    }

    this.setSession(data.session);
    return true;
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
}
