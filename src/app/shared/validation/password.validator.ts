import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

export interface PasswordStrengthErrors {
  minimumLength: boolean;
  maximumLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  digit: boolean;
  symbol: boolean;
}

export const strongPasswordValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value : '';
  if (!value) return null;

  const failures: PasswordStrengthErrors = {
    minimumLength: value.length < PASSWORD_MIN_LENGTH,
    maximumLength: value.length > PASSWORD_MAX_LENGTH,
    lowercase: !/[a-z]/.test(value),
    uppercase: !/[A-Z]/.test(value),
    digit: !/[0-9]/.test(value),
    symbol: !/[^A-Za-z0-9\s]/.test(value),
  };

  return Object.values(failures).some(Boolean)
    ? { passwordStrength: failures }
    : null;
};
