import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from './HttpClient';
import { HttpAppointmentRepository, HttpAuthenticationRepository } from './httpRepositories';

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const createAuthenticationRepository = () => new HttpAuthenticationRepository(
  'http://localhost:8093',
  'http://localhost:8091',
  'http://localhost:8090',
  'http://localhost:8092'
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpAuthenticationRepository', () => {
  const authResponse = (token: string) => ({
    accessToken: token,
    refreshToken: token + '-refresh',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: 'user-id', login: 'ana@example.com', role: 'USER', permissions: [], authorizedServices: [] }
  });

  it('discovers a client profile and treats a missing Lojista account as absent', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, authResponse('scheduling-token')))
      .mockResolvedValueOnce(jsonResponse(200, [
        { idCliente: 'client-id', nome: 'Ana Silva', email: 'ana@example.com' },
      ]))
      .mockResolvedValueOnce(jsonResponse(404, { title: 'Not Found' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createAuthenticationRepository().login(' ANA@EXAMPLE.COM ', 'senha-segura');

    expect(result).toEqual({
      token: 'scheduling-token',
      refreshToken: 'scheduling-token-refresh',
      profiles: [{ kind: 'cliente', id: 'client-id', name: 'Ana Silva' }],
      lojistaToken: undefined,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8092/api/auth/login',
      'http://localhost:8091/clientes?email=ana%40example.com',
      'http://localhost:8090/lojistas?email=ana%40example.com',
    ]);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer scheduling-token');
  });

  it('discovers a Lojista-only profile', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, authResponse('scheduling-token')))
      .mockResolvedValueOnce(jsonResponse(404, { title: 'Not Found' }))
      .mockResolvedValueOnce(jsonResponse(200, [
        { idLojista: 'lojista-id', nome: 'Oficina Ana', email: 'ana@example.com' },
      ]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createAuthenticationRepository().login('ana@example.com', 'senha-segura');

    expect(result).toEqual({
      token: 'scheduling-token',
      refreshToken: 'scheduling-token-refresh',
      profiles: [{ kind: 'lojista', id: 'lojista-id', name: 'Oficina Ana' }],
      lojistaToken: 'scheduling-token',
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8092/api/auth/login',
      'http://localhost:8091/clientes?email=ana%40example.com',
      'http://localhost:8090/lojistas?email=ana%40example.com',
    ]);
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('Authorization')).toBe('Bearer scheduling-token');
  });

  it('returns both profiles so the app can ask which one to open', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, authResponse('scheduling-token')))
      .mockResolvedValueOnce(jsonResponse(200, [
        { idCliente: 'client-id', nome: 'Ana Silva', email: 'ana@example.com' },
      ]))
      .mockResolvedValueOnce(jsonResponse(200, [
        { idLojista: 'lojista-id', nome: 'Oficina Ana', email: 'ana@example.com' },
      ]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createAuthenticationRepository().login('ana@example.com', 'senha-segura');

    expect(result).toEqual({
      token: 'scheduling-token',
      refreshToken: 'scheduling-token-refresh',
      profiles: [
        { kind: 'cliente', id: 'client-id', name: 'Ana Silva' },
        { kind: 'lojista', id: 'lojista-id', name: 'Oficina Ana' },
      ],
      lojistaToken: 'scheduling-token',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses the known client profile after registration and still discovers an existing Lojista', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, authResponse('scheduling-token')))
      .mockResolvedValueOnce(jsonResponse(200, [
        { idLojista: 'lojista-id', nome: 'Oficina Ana', email: 'ana@example.com' },
      ]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createAuthenticationRepository().login(
      'ana@example.com',
      'senha-segura',
      'client-id',
      'Ana Silva'
    );

    expect(result.profiles).toEqual([
      { kind: 'cliente', id: 'client-id', name: 'Ana Silva' },
      { kind: 'lojista', id: 'lojista-id', name: 'Oficina Ana' },
    ]);
    // Should only call auth login and lojista API (skips cliente API when knownClientId provided)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8092/api/auth/login',
      'http://localhost:8090/lojistas?email=ana%40example.com',
    ]);
  });

  it('keeps legacy UUID login without profile-service requests', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, {
      accessToken: 'scheduling-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { id: '123e4567-e89b-12d3-a456-426614174000', login: '123e4567-e89b-12d3-a456-426614174000', role: 'USER', permissions: [], authorizedServices: [] }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createAuthenticationRepository().login(
      '123e4567-e89b-12d3-a456-426614174000',
      'senha-segura'
    );

    expect(result).toEqual({
      token: 'scheduling-token',
      refreshToken: 'refresh-token',
      profiles: [{
        kind: 'cliente',
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: '123e4567',
      }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails clearly when neither service has a profile for the credentials', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, authResponse('scheduling-token')))
      .mockResolvedValueOnce(jsonResponse(404, { title: 'Not Found' }))
      .mockResolvedValueOnce(jsonResponse(404, { title: 'Not Found' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAuthenticationRepository().login('ana@example.com', 'senha-segura'))
      .rejects.toThrow('Não foi encontrado um perfil de Cliente ou Lojista para este login.');
  });

  it('does not hide profile-service failures as missing accounts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, authResponse('scheduling-token')))
      .mockResolvedValueOnce(jsonResponse(503, { title: 'Service Unavailable' }))
      .mockResolvedValueOnce(jsonResponse(404, { title: 'Not Found' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAuthenticationRepository().login('ana@example.com', 'senha-segura'))
      .rejects.toMatchObject({ name: 'HttpError', status: 503 });
  });
});

describe('HttpAppointmentRepository', () => {
  it('filters appointments to the requested Lojista in the app', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, [
        {
          idAgendamento: 'appointment-owned',
          lojista: 'lojista-id',
          estabelecimento: 'establishment-id',
          servico: 'service-id',
          cliente: 'client-id',
          statusAgendamento: 'AGENDADO',
          dataAgendamento: '20/10/2026',
          horaAgendamento: '14:30',
        },
      ]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new HttpAppointmentRepository(
      new HttpClient('http://localhost:8093', () => 'scheduling-token')
    )
      .getForLojista('lojista-id');

    expect(result).toEqual([{
      id: 'appointment-owned',
      title: 'Serviço service-',
      place: 'Unidade establis',
      date: '2026-10-20',
      time: '14:30',
      status: 'reminder',
      clientId: 'client-id',
      serviceId: 'service-id',
      establishmentId: 'establishment-id',
      lojistaId: 'lojista-id',
    }]);
    // Should call scoped endpoint with path param
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8093/agendamentos/lojista/lojista-id',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer scheduling-token', 'Content-Type': 'application/json' }),
      })
    );
  });
});