import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

function senhaMatchValidator(control: AbstractControl) {
  const senha = control.get('senha')?.value;
  const confirmar = control.get('confirmarSenha')?.value;
  return senha === confirmar ? null : { senhaDiferente: true };
}



@Component({
  selector: 'app-cadastrar-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cadastro-usuario.component.html'
})
export class CadastroUsuarioComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['',[Validators.required,Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)]],
      perfil: ['', Validators.required],
      senha: ['', [Validators.required, Validators.minLength(8)]],
      confirmarSenha: ['', Validators.required]
    }, { validators: senhaMatchValidator });
  }

  mascaraTelefone(event: Event) {
  const input = event.target as HTMLInputElement;
  let valor = input.value.replace(/\D/g, '');

  if (valor.length > 11) {
    valor = valor.substring(0, 11);
  }

  if (valor.length <= 10) {
    valor = valor.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  } else {
    valor = valor.replace(/(\d{2})(\d{5})(\d)/, '($1) $2-$3');
  }

  input.value = valor;

  // não dispara novo evento
  this.form.get('telefone')?.setValue(valor, { emitEvent: false });
}


 onSubmit(): void {
  if (this.form.invalid) return;

  this.loading = true;

  const { nome, email, telefone, perfil, senha } = this.form.value;

  this.authService.register(email, senha, perfil, nome, telefone)
    .then(res => {
      this.loading = false;

      if (res.error) {
        console.error(res.error);
        return;
      }

      this.router.navigate(['/']);
    })
    .catch(err => {
      console.error(err);
      this.loading = false;
    });
}

}
