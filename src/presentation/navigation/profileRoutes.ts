import { AccountProfile } from '../../domain/repositories';
import { Session } from '../providers/SessionProvider';

export type ProfileRoute = '/selecionar-perfil' | '/agendamentos' | '/agenda-lojista' | '/';

export function hasBothProfiles(profiles: AccountProfile[]) {
  return profiles.some((profile) => profile.kind === 'cliente')
    && profiles.some((profile) => profile.kind === 'lojista');
}

export function getProfileRoute(session: Pick<Session, 'profiles' | 'activeProfile'>): ProfileRoute {
  if (session.profiles.length > 1 && !session.activeProfile) return '/selecionar-perfil';
  if (session.activeProfile === 'lojista') return '/agenda-lojista';
  if (session.activeProfile === 'cliente') return '/agendamentos';
  return '/';
}
