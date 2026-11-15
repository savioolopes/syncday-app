import { describe, expect, it } from 'vitest';
import { normalizeAndValidateEmail, validateRegistrationCredentials } from './registrationValidation';

describe('normalizeAndValidateEmail', () => {
  it('trims and normalizes a valid email address', () => {
    expect(normalizeAndValidateEmail('  Ana.Silva+cadastro@Exemplo.com  '))
      .toBe('ana.silva+cadastro@exemplo.com');
  });

  it.each([
    '',
    'ana',
    'ana@',
    'ana@exemplo',
    'ana@@exemplo.com',
    'ana..silva@exemplo.com',
    '.ana@exemplo.com',
    'ana@.exemplo.com',
    'ana@exemplo..com',
    'ana@exemplo.c',
    'ana silva@exemplo.com',
  ])('rejects invalid email %j', (email) => {
    expect(() => normalizeAndValidateEmail(email)).toThrow('Informe um e-mail válido.');
  });

  it('rejects addresses longer than the allowed maximum', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
    expect(() => normalizeAndValidateEmail(email)).toThrow('no máximo 254 caracteres');
  });
});

describe('validateRegistrationCredentials', () => {
  it('accepts matching passwords within the supported length and returns normalized email', () => {
    expect(validateRegistrationCredentials('ANA@EXEMPLO.COM', 'senha123', 'senha123'))
      .toBe('ana@exemplo.com');
  });

  it('rejects passwords that do not match', () => {
    expect(() => validateRegistrationCredentials('ana@exemplo.com', 'senha123', 'senha321'))
      .toThrow('As senhas não conferem.');
  });

  it('rejects passwords outside the supported length', () => {
    expect(() => validateRegistrationCredentials('ana@exemplo.com', 'curta', 'curta'))
      .toThrow('A senha deve ter entre 8 e 72 caracteres.');
    expect(() => validateRegistrationCredentials('ana@exemplo.com', 'a'.repeat(73), 'a'.repeat(73)))
      .toThrow('A senha deve ter entre 8 e 72 caracteres.');
  });
});
