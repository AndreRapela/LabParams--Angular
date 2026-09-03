import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AccessBlockReason,
  getAccessBlockReason,
} from '../acessos/auth/access-state';
import { AuthService } from '../acessos/auth/auth.service';

const CONTENT: Record<AccessBlockReason, { eyebrow: string; title: string; message: string; icon: string }> = {
  pendente: {
    eyebrow: 'Aprovação necessária',
    title: 'Seu acesso está aguardando aprovação',
    message: 'Um Gestor precisa aprovar sua conta antes que os dados laboratoriais sejam liberados.',
    icon: 'fa-user-clock',
  },
  'nao-cadastrado': {
    eyebrow: 'Vínculo necessário',
    title: 'Esta conta ainda não está vinculada ao laboratório',
    message: 'Solicite a um Gestor que cadastre ou vincule este e-mail ao SYSmLab.',
    icon: 'fa-user-slash',
  },
  'migracao-pendente': {
    eyebrow: 'Manutenção de segurança',
    title: 'O acesso está temporariamente indisponível',
    message: 'A atualização de segurança do banco ainda precisa ser concluída pelo responsável técnico.',
    icon: 'fa-shield-halved',
  },
  indisponivel: {
    eyebrow: 'Verificação indisponível',
    title: 'Não foi possível confirmar seu acesso',
    message: 'Verifique sua conexão e tente novamente. Nenhum dado foi liberado sem a confirmação da API.',
    icon: 'fa-plug-circle-xmark',
  },
  perfil: {
    eyebrow: 'Permissão insuficiente',
    title: 'Seu perfil não permite acessar esta página',
    message: 'Volte ao painel ou peça a um Gestor para revisar as permissões da sua conta.',
    icon: 'fa-lock',
  },
};

@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acesso-negado.component.html',
  styleUrls: ['./acesso-negado.component.css']
})
export class AcessoNegadoComponent {
  reason: AccessBlockReason;
  checking = false;
  checkError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {
    const value = this.route.snapshot.queryParamMap.get('motivo');
    this.reason = value && Object.hasOwn(CONTENT, value)
      ? (value as AccessBlockReason)
      : 'perfil';
  }

  get content() {
    return CONTENT[this.reason];
  }

  async verificarNovamente(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    this.checkError = '';
    try {
      const reason = getAccessBlockReason(await this.authService.getCurrentAccess());
      if (!reason) {
        await this.router.navigate(['/dashboard-web']);
        return;
      }
      this.reason = reason;
    } catch {
      if (!(await this.authService.getSession())?.user) {
        await this.router.navigate(['/login']);
        return;
      }
      this.reason = 'indisponivel';
      this.checkError = 'A verificação continua indisponível. Tente novamente em instantes.';
    } finally {
      this.checking = false;
    }
  }

  async sair(): Promise<void> {
    try {
      await this.authService.logout();
    } catch {
      // A sessão local já é descartada pelo serviço. Mesmo se o
      // encerramento remoto falhar, o usuário precisa conseguir trocar de conta.
    }
    await this.router.navigate(['/login']);
  }
}
