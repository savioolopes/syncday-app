const EMAIL_LOCAL_PART_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i;

export function normalizeAndValidateEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254) throw new Error('O e-mail deve ter no máximo 254 caracteres.');

  const parts = email.split('@');
  if (parts.length !== 2) throw new Error('Informe um e-mail válido.');
  const [localPart, domain] = parts;
  if (
    localPart.length === 0
    || localPart.length > 64
    || localPart.startsWith('.')
    || localPart.endsWith('.')
    || localPart.includes('..')
    || !EMAIL_LOCAL_PART_PATTERN.test(localPart)
  ) {
    throw new Error('Informe um e-mail válido.');
  }

  const labels = domain.split('.');
  if (
    labels.length < 2
    || labels.some((label) => label.length === 0 || label.length > 63 || !EMAIL_DOMAIN_LABEL_PATTERN.test(label))
    || !/^(?:[A-Z]{2,}|xn--[A-Z0-9-]{2,})$/i.test(labels[labels.length - 1])
  ) {
    throw new Error('Informe um e-mail válido.');
  }

  return email;
}

export function validateRegistrationCredentials(email: string, password: string, confirmation: string) {
  const normalizedEmail = normalizeAndValidateEmail(email);
  if (password.length < 8 || password.length > 72) {
    throw new Error('A senha deve ter entre 8 e 72 caracteres.');
  }
  if (password !== confirmation) throw new Error('As senhas não conferem.');
  return normalizedEmail;
}
