import { describe, expect, it } from 'vitest';
import { AccountProfile } from '../../domain/repositories';
import { hasBothProfiles } from './profileRoutes';

const client: AccountProfile = { kind: 'cliente', id: 'client-id', name: 'Ana' };
const lojista: AccountProfile = { kind: 'lojista', id: 'lojista-id', name: 'Ana Studio' };

describe('hasBothProfiles', () => {
  it('allows profile switching when Cliente and Lojista profiles are both available', () => {
    expect(hasBothProfiles([client, lojista])).toBe(true);
  });

  it('does not allow profile switching when the account has only one profile', () => {
    expect(hasBothProfiles([client])).toBe(false);
    expect(hasBothProfiles([lojista])).toBe(false);
  });
});
