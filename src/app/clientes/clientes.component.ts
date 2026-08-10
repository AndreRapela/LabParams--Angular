import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../shared/http/api-error';
import { Cliente, ClientePayload } from './cliente.model';
import { ClientesService } from './clientes.service';

type ClienteForm = FormGroup<{
  codigo: FormControl<string>;
  nome_razao_social: FormControl<string>;
  nome_fantasia: FormControl<string>;
  documento: FormControl<string>;
  email: FormControl<string>;
  telefone: FormControl<string>;
  endereco: FormControl<string>;
  observacoes: FormControl<string>;
  ativo: FormControl<boolean>;
}>;

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: [
    '../shared/pilot-workflow/pilot-workflow.css',
    './clientes.component.css',
  ],
})
export class ClientesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly form: ClienteForm = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    nome_razao_social: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(180)],
    }),
    nome_fantasia: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(180)],
    }),
    documento: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(180)],
    }),
    telefone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    endereco: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    observacoes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    ativo: new FormControl(true, { nonNullable: true }),
  });

  clientes: Cliente[] = [];
  loading = false;
  saving = false;
  error = '';
  feedback = '';
  editorOpen = false;
  editingId: number | null = null;

  constructor(private readonly clientesService: ClientesService) {}

  ngOnInit(): void {
    this.carregar();
  }

  get clientesFiltrados(): Cliente[] {
    const termo = this.buscaControl.value.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return this.clientes;
    return this.clientes.filter((cliente) =>
      [
        cliente.codigo,
        cliente.nome_razao_social,
        cliente.nome_fantasia,
        cliente.documento,
      ].some((valor) => valor?.toLocaleLowerCase('pt-BR').includes(termo)),
    );
  }

  get totalAtivos(): number {
    return this.clientes.filter((cliente) => cliente.ativo).length;
  }

  carregar(): void {
    this.loading = true;
    this.error = '';
    this.clientesService
      .listar()
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => (this.clientes = response.data ?? []),
        error: (error: unknown) => {
          this.clientes = [];
          this.error = apiErrorMessage(
            error,
            'Não foi possível carregar os clientes.',
          );
        },
      });
  }

  novo(): void {
    this.editingId = null;
    this.form.reset({
      codigo: '',
      nome_razao_social: '',
      nome_fantasia: '',
      documento: '',
      email: '',
      telefone: '',
      endereco: '',
      observacoes: '',
      ativo: true,
    });
    this.feedback = '';
    this.error = '';
    this.editorOpen = true;
  }

  editar(cliente: Cliente): void {
    this.editingId = cliente.id;
    this.form.reset({
      codigo: cliente.codigo,
      nome_razao_social: cliente.nome_razao_social,
      nome_fantasia: cliente.nome_fantasia ?? '',
      documento: cliente.documento ?? '',
      email: cliente.email ?? '',
      telefone: cliente.telefone ?? '',
      endereco: cliente.endereco ?? '',
      observacoes: cliente.observacoes ?? '',
      ativo: cliente.ativo,
    });
    this.feedback = '';
    this.error = '';
    this.editorOpen = true;
  }

  fecharEditor(): void {
    if (this.saving) return;
    this.editorOpen = false;
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revise os campos destacados antes de salvar.';
      return;
    }

    const value = this.form.getRawValue();
    const payload: ClientePayload = {
      codigo: value.codigo.trim(),
      nome_razao_social: value.nome_razao_social.trim(),
      nome_fantasia: this.optional(value.nome_fantasia),
      documento: this.optional(value.documento),
      email: this.optional(value.email),
      telefone: this.optional(value.telefone),
      endereco: this.optional(value.endereco),
      observacoes: this.optional(value.observacoes),
      ativo: value.ativo,
    };

    this.saving = true;
    this.error = '';
    const operation =
      this.editingId === null
        ? this.clientesService.criar(payload)
        : this.clientesService.atualizar(this.editingId, payload);

    operation
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.feedback =
            this.editingId === null
              ? 'Cliente cadastrado com sucesso.'
              : 'Cliente atualizado com sucesso.';
          this.editorOpen = false;
          this.carregar();
        },
        error: (error: unknown) => {
          this.error = apiErrorMessage(
            error,
            'Não foi possível salvar o cliente.',
          );
        },
      });
  }

  trackById(_index: number, cliente: Cliente): number {
    return cliente.id;
  }

  private optional(value: string): string | null {
    const normalized = value.trim();
    return normalized || null;
  }
}
