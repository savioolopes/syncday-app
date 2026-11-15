import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpRegistrationRepository } from './HttpRegistrationRepository';

const input = {
  kind: 'cliente' as const,
  nome: 'Ana Silva',
  email: ' ANA@EXAMPLE.COM ',
  password: 'senha-segura',
  documento: '12345678900',
  endereco: {
    tipoLogradouro: 'RUA',
    logradouro: 'Rua das Flores',
    numero: '123',
    bairro: 'Centro',
    cep: '01001000',
    municipio: 'São Paulo',
    unidadeFederativa: 'SP',
  },
};

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const authLoginResponse = (token: string) => ({
  accessToken: token,
  refreshToken: token + '-refresh',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: { id: 'user-id', login: 'ana@example.com', role: 'USER', permissions: [], authorizedServices: [] }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpRegistrationRepository', () => {
  it('creates scheduling and client accounts, then creates the client profile with its token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200)) // auth register
      .mockResolvedValueOnce(jsonResponse(200, authLoginResponse('client-token'))) // auth login
      .mockResolvedValueOnce(jsonResponse(201, { idCliente: 'client-id' })) // create client profile
      .mockResolvedValueOnce(jsonResponse(200, [{ idCliente: 'client-id' }])); // get client by email
    vi.stubGlobal('fetch', fetchMock);

    const progress: string[] = [];
    const result = await new HttpRegistrationRepository(
      'http://localhost:8093',
      'http://localhost:8091',
      'http://localhost:8090',
      'http://localhost:8092'
    ).register(input, (message) => progress.push(message));

    expect(result).toEqual({ clientId: 'client-id' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8092/api/auth/register',
      'http://localhost:8092/api/auth/login',
      'http://localhost:8091/clientes',
      'http://localhost:8091/clientes?email=ana%40example.com',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      login: 'ana@example.com',
      password: 'senha-segura',
      role: 'CLIENTE',
    });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      idAplicacao: '123e4567-e89b-12d3-a456-426614174000',
      nome: 'Ana Silva',
      cpf: '12345678900',
      email: 'ana@example.com',
      endereco: input.endereco,
    });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer client-token');
    expect(progress).toEqual([
      'Criando conta no serviço de Autenticação...',
      'Autenticando no serviço de Autenticação...',
      'Criando o perfil de Cliente...',
    ]);
  });

  it('creates a Lojista profile without an optional address', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200)) // auth register
      .mockResolvedValueOnce(jsonResponse(200, authLoginResponse('lojista-token'))) // auth login
      .mockResolvedValueOnce(jsonResponse(201)); // create lojista profile
    vi.stubGlobal('fetch', fetchMock);

    const result = await new HttpRegistrationRepository(
      'http://localhost:8093',
      'http://localhost:8091',
      'http://localhost:8090',
      'http://localhost:8092'
    ).register({ ...input, kind: 'lojista', endereco: undefined }, () => {});

    expect(result).toEqual({});
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8092/api/auth/register',
      'http://localhost:8092/api/auth/login',
      'http://localhost:8090/lojistas',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      idAplicacao: '123e4567-e89b-12d3-a456-426614174000',
      nome: 'Ana Silva',
      cnpj: '12345678900',
      email: 'ana@example.com',
      endereco: {
        tipoLogradouro: 'RUA',
        logradouro: '',
        numero: '',
        bairro: '',
        cep: '',
        municipio: '',
        unidadeFederativa: '',
      },
      logoKey: '/logo.png',
    });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer lojista-token');
  });

  it('includes the API validation message and stage in a registration error', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(409, { titulo: 'Usuário já cadastrado.' })
    ).mockResolvedValueOnce(jsonResponse(401, { titulo: 'Login ou senha inválidos.' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new HttpRegistrationRepository(
      'http://localhost:8093',
      'http://localhost:8091',
      'http://localhost:8090',
      'http://localhost:8092'
    ).register(input, () => {})).rejects.toThrow(
      '{"titulo":"Login ou senha inválidos."}'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('can continue a partial registration after verifying the existing scheduling account', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(400, { titulo: 'Usuário já cadastrado.' })) // auth register fails (already exists)
      .mockResolvedValueOnce(jsonResponse(200, authLoginResponse('existing-scheduling-token'))) // auth login succeeds
      .mockResolvedValueOnce(jsonResponse(201, { idCliente: 'client-id' })) // create client profile
      .mockResolvedValueOnce(jsonResponse(200, [{ idCliente: 'client-id' }])); // get client by email
    vi.stubGlobal('fetch', fetchMock);

    const result = await new HttpRegistrationRepository(
      'http://localhost:8093',
      'http://localhost:8091',
      'http://localhost:8090',
      'http://localhost:8092'
    ).register(input, () => {});

    expect(result).toEqual({ clientId: 'client-id' });
    // New implementation: auth register (400) -> auth login -> create client profile -> get client by email
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8092/api/auth/register',
      'http://localhost:8092/api/auth/login',
      'http://localhost:8091/clientes',
      'http://localhost:8091/clientes?email=ana%40example.com',
    ]);
  });
});