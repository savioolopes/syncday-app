import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from './HttpClient';
import { HttpLojistaManagementRepository } from './lojistaManagementRepository';

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const createRepository = () => new HttpLojistaManagementRepository(
  new HttpClient('http://localhost:8090', () => 'lojista-token'),
  new HttpClient('http://localhost:8093', () => 'scheduling-token')
);

const LOJISTA_ID = '123e4567-e89b-12d3-a456-426614174000';
const ESTABLISHMENT_ID = '123e4567-e89b-12d3-a456-426614174001';
const SERVICE_ID = '123e4567-e89b-12d3-a456-426614174002';
const GRID_ID = '123e4567-e89b-12d3-a456-426614174003';
const OTHER_LOJISTA_ID = '123e4567-e89b-12d3-a456-426614174004';
const OTHER_ESTABLISHMENT_ID = '123e4567-e89b-12d3-a456-426614174005';
const OTHER_SERVICE_ID = '123e4567-e89b-12d3-a456-426614174006';
const OTHER_GRID_ID = '123e4567-e89b-12d3-a456-426614174007';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpLojistaManagementRepository', () => {
  it('lists only the active Lojista business and its availability grids', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, [
        {
          idEstabelecimento: ESTABLISHMENT_ID,
          lojista: LOJISTA_ID,
          nome: 'Unidade Centro',
          cnpj: '12345678000199',
          email: 'centro@example.com',
          endereco: {
            tipoLogradouro: 'RUA',
            logradouro: 'Rua A',
            numero: '10',
            bairro: 'Centro',
            cep: '12345678',
            municipio: 'São Paulo',
            unidadeFederativa: 'SP',
          },
          ativo: true,
        },
        {
          idEstabelecimento: OTHER_ESTABLISHMENT_ID,
          lojista: OTHER_LOJISTA_ID,
          nome: 'Outra unidade',
          cnpj: '98765432000199',
          email: 'outra@example.com',
          endereco: {
            tipoLogradouro: 'RUA',
            logradouro: 'Rua B',
            numero: '20',
            bairro: 'Centro',
            cep: '12345678',
            municipio: 'São Paulo',
            unidadeFederativa: 'SP',
          },
          ativo: true,
        },
      ]))
      .mockResolvedValueOnce(jsonResponse(200, [
        {
          idServico: SERVICE_ID,
          nome: 'Corte',
          preco: 45.5,
          descricao: '',
          estabelecimentos: [ESTABLISHMENT_ID],
          ativo: true,
        },
        {
          idServico: OTHER_SERVICE_ID,
          nome: 'Outro',
          preco: 10,
          descricao: '',
          estabelecimentos: [OTHER_ESTABLISHMENT_ID],
          ativo: true,
        },
      ]))
      .mockResolvedValueOnce(jsonResponse(200, [
        {
          idGrade: GRID_ID,
          lojista: LOJISTA_ID,
          estabelecimento: ESTABLISHMENT_ID,
          servico: SERVICE_ID,
          segundaFeira: true,
          tercaFeira: false,
          quartaFeira: true,
          quintaFeira: false,
          sextaFeira: false,
          sabado: false,
          domingo: false,
          horaInicio: '09:00',
          horaFim: '18:00',
          fracao: 30,
          capacidadeLimite: 2,
          periodo: 30,
          dataInicioVigor: '20/10/2026',
          ativo: true,
        },
        {
          idGrade: OTHER_GRID_ID,
          lojista: OTHER_LOJISTA_ID,
          estabelecimento: OTHER_ESTABLISHMENT_ID,
          servico: OTHER_SERVICE_ID,
          segundaFeira: true,
          tercaFeira: false,
          quartaFeira: false,
          quintaFeira: false,
          sextaFeira: false,
          sabado: false,
          domingo: false,
          horaInicio: '09:00',
          horaFim: '18:00',
          fracao: 30,
          capacidadeLimite: 1,
          periodo: 15,
          dataInicioVigor: '20/10/2026',
          ativo: true,
        },
      ]));
    vi.stubGlobal('fetch', fetchMock);
    const repository = createRepository();

    const establishments = await repository.listEstablishments(LOJISTA_ID);
    const services = await repository.listServices(establishments.map((item) => item.id));
    const grids = await repository.listGrids(LOJISTA_ID);

    expect(establishments.map((item) => item.id)).toEqual([ESTABLISHMENT_ID]);
    expect(services.map((item) => item.id)).toEqual([SERVICE_ID]);
    expect(grids).toEqual([{
      id: GRID_ID,
      lojistaId: LOJISTA_ID,
      establishmentId: ESTABLISHMENT_ID,
      serviceId: SERVICE_ID,
      weekdays: [1, 3],
      startTime: '09:00',
      endTime: '18:00',
      intervalMinutes: 30,
      capacity: 2,
      periodDays: 30,
      startDate: '2026-10-20',
      endDate: undefined,
      active: true,
    }]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8090/estabelecimentos',
      'http://localhost:8090/servicos',
      'http://localhost:8093/grades?statusAgendamento=TODOS',
    ]);
    const lojistaAuthorization = new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization');
    const schedulingAuthorization = new Headers(fetchMock.mock.calls[2][1]?.headers).get('Authorization');
    expect(lojistaAuthorization).toBeTruthy();
    expect(schedulingAuthorization).toBeTruthy();
    expect(lojistaAuthorization).not.toBe(schedulingAuthorization);
  });

  it('creates a grade with the selected references, weekdays and localized dates', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(201, {
      idGrade: GRID_ID,
      lojista: LOJISTA_ID,
      estabelecimento: ESTABLISHMENT_ID,
      servico: SERVICE_ID,
      segundaFeira: true,
      tercaFeira: false,
      quartaFeira: true,
      quintaFeira: false,
      sextaFeira: false,
      sabado: false,
      domingo: true,
      horaInicio: '09:00',
      horaFim: '17:00',
      fracao: 30,
      capacidadeLimite: 1,
      periodo: 30,
      dataInicioVigor: '01/11/2026',
      dataFimVigor: null,
      ativo: true,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createRepository().saveGrid(LOJISTA_ID, {
      establishmentId: ESTABLISHMENT_ID,
      serviceId: SERVICE_ID,
      weekdays: [0, 1, 3],
      startTime: '09:00',
      endTime: '17:00',
      intervalMinutes: 30,
      capacity: 1,
      periodDays: 30,
      startDate: '2026-11-01',
    });

    expect(result.startDate).toBe('2026-11-01');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      lojista: LOJISTA_ID,
      estabelecimento: ESTABLISHMENT_ID,
      servico: SERVICE_ID,
      domingo: true,
      segundaFeira: true,
      tercaFeira: false,
      quartaFeira: true,
      dataInicioVigor: '01/11/2026',
      dataFimVigor: null,
    });
  });

  it('creates, updates and removes establishments and services through the Lojista API', async () => {
    const establishment = {
      idEstabelecimento: ESTABLISHMENT_ID,
      lojista: LOJISTA_ID,
      nome: 'Unidade Centro',
      cnpj: '12345678000199',
      email: 'centro@example.com',
      endereco: {
        tipoLogradouro: 'RUA',
        logradouro: 'Rua A',
        numero: '10',
        complemento: null,
        bairro: 'Centro',
        cep: '12345678',
        municipio: 'São Paulo',
        unidadeFederativa: 'SP',
      },
      ativo: true,
    };
    const service = {
      idServico: SERVICE_ID,
      nome: 'Corte',
      preco: 45.5,
      descricao: 'Corte tradicional',
      estabelecimentos: [ESTABLISHMENT_ID],
      ativo: true,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(201, establishment))
      .mockResolvedValueOnce(jsonResponse(200, establishment))
      .mockResolvedValueOnce(new Response('Estabelecimento deleted successfully.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }))
      .mockResolvedValueOnce(jsonResponse(201, service))
      .mockResolvedValueOnce(jsonResponse(200, service))
      .mockResolvedValueOnce(new Response('Servico deleted successfully.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }));
    vi.stubGlobal('fetch', fetchMock);
    const repository = createRepository();
    const establishmentInput = {
      name: 'Unidade Centro',
      cnpj: '12345678000199',
      email: 'centro@example.com',
      address: {
        tipoLogradouro: 'RUA',
        logradouro: 'Rua A',
        numero: '10',
        complemento: '',
        bairro: 'Centro',
        cep: '12345678',
        municipio: 'São Paulo',
        unidadeFederativa: 'SP',
      },
    };
    await repository.saveEstablishment(LOJISTA_ID, establishmentInput);
    await repository.saveEstablishment(LOJISTA_ID, establishmentInput, ESTABLISHMENT_ID);
    await repository.deleteEstablishment(ESTABLISHMENT_ID);
    await repository.saveService({
      name: 'Corte',
      price: 45.5,
      description: 'Corte tradicional',
      establishmentIds: [ESTABLISHMENT_ID],
    });
    await repository.saveService({
      name: 'Corte',
      price: 45.5,
      description: 'Corte tradicional',
      establishmentIds: [ESTABLISHMENT_ID],
    }, SERVICE_ID);
    await repository.deleteService(SERVICE_ID);

    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      'POST', 'PUT', 'DELETE', 'POST', 'PUT', 'DELETE',
    ]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8090/estabelecimentos',
      'http://localhost:8090/estabelecimentos/' + ESTABLISHMENT_ID,
      'http://localhost:8090/estabelecimentos/' + ESTABLISHMENT_ID,
      'http://localhost:8090/servicos',
      'http://localhost:8090/servicos/' + SERVICE_ID,
      'http://localhost:8090/servicos/' + SERVICE_ID,
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      lojista: LOJISTA_ID,
      nome: 'Unidade Centro',
      endereco: { municipio: 'São Paulo', complemento: null },
    });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body as string)).toMatchObject({
      nome: 'Corte',
      preco: 45.5,
      estabelecimentos: [ESTABLISHMENT_ID],
    });
  });

  it('uses PUT and DELETE endpoints for updates and removals', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, {
        idGrade: GRID_ID,
        lojista: LOJISTA_ID,
        estabelecimento: ESTABLISHMENT_ID,
        servico: SERVICE_ID,
        segundaFeira: true,
        tercaFeira: false,
        quartaFeira: false,
        quintaFeira: false,
        sextaFeira: false,
        sabado: false,
        domingo: false,
        horaInicio: '10:00',
        horaFim: '16:00',
        fracao: 20,
        capacidadeLimite: 1,
        periodo: 15,
        dataInicioVigor: '01/11/2026',
        ativo: true,
      }))
      .mockResolvedValueOnce(new Response('Grade deleted successfully.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }));
    vi.stubGlobal('fetch', fetchMock);
    const repository = createRepository();
    await repository.saveGrid(LOJISTA_ID, {
      establishmentId: ESTABLISHMENT_ID,
      serviceId: SERVICE_ID,
      weekdays: [1],
      startTime: '10:00',
      endTime: '16:00',
      intervalMinutes: 20,
      capacity: 1,
      periodDays: 15,
      startDate: '2026-11-01',
    }, GRID_ID);
    await repository.deleteGrid(GRID_ID);

    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(['PUT', 'DELETE']);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:8093/grades/' + GRID_ID,
      'http://localhost:8093/grades/' + GRID_ID,
    ]);
  });
});