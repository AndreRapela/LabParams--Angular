import { FormControl, Validators } from '@angular/forms';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  strongPasswordValidator,
} from './password.validator';

describe('strongPasswordValidator', () => {
  it('aceita senha com 12 caracteres e todas as classes exigidas', () => {
    const control = new FormControl('SenhaForte#123', strongPasswordValidator);

    expect(control.valid).toBeTrue();
  });

  it('identifica cada requisito ausente', () => {
    const control = new FormControl('SENHAFRACA', strongPasswordValidator);
    const failures = control.getError('passwordStrength');

    expect(failures.minimumLength).toBeTrue();
    expect(failures.maximumLength).toBeFalse();
    expect(failures.lowercase).toBeTrue();
    expect(failures.uppercase).toBeFalse();
    expect(failures.digit).toBeTrue();
    expect(failures.symbol).toBeTrue();
  });

  it('deixa o campo vazio para o validador obrigatório tratar', () => {
    const control = new FormControl('', [
      Validators.required,
      strongPasswordValidator,
    ]);

    expect(control.hasError('required')).toBeTrue();
    expect(control.hasError('passwordStrength')).toBeFalse();
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(PASSWORD_MAX_LENGTH).toBe(200);
  });

  it('não considera espaço em branco como símbolo', () => {
    const control = new FormControl(
      'Senha Forte 123',
      strongPasswordValidator,
    );

    expect(control.getError('passwordStrength').symbol).toBeTrue();
  });

  it('rejeita senha acima do máximo aceito pela API', () => {
    const control = new FormControl(
      `Aa1!${'x'.repeat(PASSWORD_MAX_LENGTH - 3)}`,
      strongPasswordValidator,
    );

    expect(control.value?.length).toBe(PASSWORD_MAX_LENGTH + 1);
    expect(control.getError('passwordStrength').maximumLength).toBeTrue();
  });
});
