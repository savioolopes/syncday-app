# Syncday App (Frontend)

Aplicação móvel e web (React Native + Expo) para o sistema de agendamento de estacionamento. Este frontend consome as APIs do ecossistema Syncday: **usuario-service (IdP)**, **cliente-service**, **lojista-service**, **agendamento-service** e **gestao-service**.

O projeto usa **React Native 0.76**, **Expo SDK 51**, **Expo Router (file-based routing)**, **TypeScript 5**, **React Native Web** para exportação estática, **NativeWind/TailwindCSS** para estilização e **JWT RS256** via JWKS para autenticação distribuída.

---

## 🆕 Novidades Recentes

### Integração Frontend-Auth (v2.0)
- **Correção de rotas de autenticação**: Endpoints alinhados para `/api/auth/*` (backend `@RequestMapping("/api/auth")` + nginx proxy)
- **Correção de duplo `/api` no nginx**: `authApiUrl` ajustado para string vazia; nginx injeta `/api` via `proxy_pass`
- **Logout funcional**: Blocklist por JTI no usuario-service + limpeza de `syncday_lojista_access_token` no `SessionProvider.signOut()`
- **Token persistente corrigido**: `clearTokens()` em bloco `finally` garante remoção de `localStorage` mesmo em falha de rede

### Melhorias de UI/UX
- **Tela de seleção de perfil**: Texto simplificado para *"Selecione qual conta deseja acessar"*, fonte reduzida (`heading` 20px), Wordmark centralizada
- **BlueHeader fixo**: Altura padronizada em **140px** para consistência entre telas
- **BackButton padronizado**: Adicionado às telas de perfil (Cliente/Lojista), alinhado à esquerda seguindo padrão `/novo-agendamento`
- **Cadastro - CEP**: Comportamento alterado para `onBlur` (busca ao sair do campo), igual ao LojistaProfileScreen
- **Cadastro - Endereço opcional**: Toggle *"Remover"* limpa campos e retorna ao estado inicial (oculto)
- **Cadastro - Troca de perfil**: Limpa todos os campos e reseta endereço para opcional/oculto
- **Login - "Esqueci a senha"**: `hitSlop={12,12,6,6}` + `alignSelf: 'center'` para área de clique restrita ao texto

### Refatoração Técnica
- **Renomeação `logista` → `lojista`**: Correção ortográfica em todo o código (interfaces, tipos, componentes, testes)
- **Autenticação centralizada**: Consumo do usuario-service (IdP) para login, refresh, logout e JWKS
- **Arquitetura limpa**: Camadas `domain`, `data`, `presentation` com injeção de dependência via `container.ts`

---

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Expo SDK 51 + React Native 0.76 |
| Roteamento | Expo Router (file-based, `app/` directory) |
| Linguagem | TypeScript 5 (strict mode) |
| Estilização | NativeWind v4 (TailwindCSS) + StyleSheet |
| Web Export | `@expo/static-html` (SPA estática para nginx) |
| Estado/Session | React Context (`SessionProvider`, `ToastProvider`) |
| HTTP Client | Fetch API nativo com interceptors (`HttpClient.ts`) |
| Auth | JWT RS256 via JWKS (usuario-service), SecureStore (mobile), localStorage (web) |
| Validação | Zod schemas (`registrationValidation.ts`) |
| Testes | Jest + React Native Testing Library |
| Build | EAS / Docker multi-stage (Node 20 → nginx Alpine) |

---

## Requisitos

- Node.js 20+ (LTS)
- npm 10+ ou yarn/pnpm
- Expo CLI (`npx expo`)
- Docker e Docker Compose (opcional; para build de produção/nginx)
- Backend rodando: usuario-service (8092), cliente-service (8091), lojista-service (8090), agendamento-service (8093), gestao-service (8094)

---

## Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e ajuste conforme necessário:

```bash
cp .env.example .env
```

### Principais Variáveis

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `EXPO_PUBLIC_API_URL` | URL base do agendamento-service (deriva URLs dos demais serviços) | `http://localhost:8093` |
| `EXPO_PUBLIC_CLIENTE_API_URL` | Override para cliente-service | Derivado de `EXPO_PUBLIC_API_URL` (porta 8091) |
| `EXPO_PUBLIC_LOJISTA_API_URL` | Override para lojista-service | Derivado de `EXPO_PUBLIC_API_URL` (porta 8090) |
| `EXPO_PUBLIC_USUARIO_API_URL` | Override para usuario-service (IdP) | Derivado de `EXPO_PUBLIC_API_URL` (porta 8092) |
| `EXPO_PUBLIC_GESTAO_API_URL` | Override para gestao-service | Derivado de `EXPO_PUBLIC_API_URL` (porta 8094) |
| `EXPO_PUBLIC_APP_SCHEME` | Deep link scheme | `syncday` |

### Resolução de URLs dos Serviços

O `container.ts` deriva as URLs dos microserviços a partir de `EXPO_PUBLIC_API_URL` trocando a porta:

```
EXPO_PUBLIC_API_URL=http://localhost:8093
  → usuario:    http://localhost:8092
  → cliente:    http://localhost:8091
  → lojista:    http://localhost:8090
  → gestao:     http://localhost:8094
```

Em produção (Docker Compose), use nomes de serviço internos:
```bash
EXPO_PUBLIC_API_URL=http://agendamento-app:8093
EXPO_PUBLIC_USUARIO_API_URL=http://usuario-app:8092
EXPO_PUBLIC_CLIENTE_API_URL=http://cliente-app:8091
EXPO_PUBLIC_LOJISTA_API_URL=http://lojista-app:8090
EXPO_PUBLIC_GESTAO_API_URL=http://gestao-app:8094
```

---

## Executar Localmente (Desenvolvimento)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar `.env`

```bash
cp .env.example .env
# Edite .env se necessário (padrão já aponta para localhost)
```

### 3. Subir backends necessários

Pelo menos o **usuario-service** (IdP) deve estar rodando para autenticação:

```bash
# Em cada repositório de backend:
cd usuario && docker-compose up -d
cd ../cliente && docker-compose up -d
cd ../lojista && docker-compose up -d
cd ../agendamento && docker-compose up -d
cd ../gestao && docker-compose up -d
```

### 4. Iniciar Expo

```bash
# Desenvolvimento nativo (Android/iOS/Expo Go)
npx expo start

# Desenvolvimento Web (React Native Web)
npx expo start --web
```

### 5. Acessar a aplicação

| Plataforma | URL |
|------------|-----|
| Expo Go (QR Code) | Escaneie com app Expo Go |
| Android Emulator | Pressione `a` no terminal Expo |
| iOS Simulator | Pressione `i` no terminal Expo (macOS) |
| Web Browser | <http://localhost:8081> |

---

## Executar com Docker Compose (Produção/Stack Completa)

Esta é a forma recomendada para produção ou ambientes que exigem o stack completo (frontend nginx + backends) isolados e reproduzíveis.

### 1. Subir tudo (frontend + backends)

```bash
# Na raiz do monorepo (onde estão as pastas usuario/, cliente/, lojista/, agendamento/, gestao/, syncday-app/)
docker-compose up --build -d
```

Isso irá:
- Buildar a imagem do frontend (multi-stage: Node 20 para build, nginx Alpine para runtime)
- Exportar app estático via `@expo/static-html` (`dist/`)
- Servir via nginx na porta **8081** (interno) / **8081** (host)
- Configurar proxy reverso `/api/*` → serviços backend correspondentes
- Subir todos os backends + MySQL + MinIO nas redes internas

### 2. Verificar status

```bash
docker-compose ps
```

Saída esperada (frontend):
```
NAME            STATUS                    PORTS
syncday-app     Up (healthy)              0.0.0.0:8081->8081/tcp
```

### 3. Ver logs

```bash
# Logs do frontend (nginx)
docker-compose logs -f syncday-app

# Logs de um backend específico
docker-compose logs -f usuario-app
```

### 4. Acessar em produção

- **Frontend (nginx)**: <http://localhost:8081>
- **APIs via proxy**: <http://localhost:8081/api/usuario>, <http://localhost:8081/api/cliente>, etc.

### 5. Parar tudo

```bash
docker-compose down
```

> **Dados persistem** nos volumes MySQL de cada backend. Para limpeza completa:
> ```bash
> docker-compose down -v
> ```

### 6. Rebuild após alterações no código

```bash
docker-compose up --build -d
```

---

## Configuração de CORS (Backends)

Todos os backends devem permitir a origem do frontend. Configure `APP_CORS_ALLOWED_ORIGINS` em cada `.env` dos backends:

```bash
# Desenvolvimento local (Expo Web em localhost:8081)
APP_CORS_ALLOWED_ORIGINS=http://localhost:8081

# Desenvolvimento com Expo Go / dispositivo físico (LAN)
APP_CORS_ALLOWED_ORIGINS=http://localhost:8081,http://192.168.15.23:8081

# Produção (domínio real)
APP_CORS_ALLOWED_ORIGINS=https://app.syncday.com.br
```

No `docker-compose.yml` de cada backend:
```yaml
environment:
  APP_CORS_ALLOWED_ORIGINS: ${APP_CORS_ALLOWED_ORIGINS:-http://localhost:8081}
```

---

## Autenticação (JWT via usuario-service)

O frontend **não possui autenticação local**. Toda a autenticação é delegada ao **usuario-service (IdP)**.

### Fluxo de Autenticação no Frontend

1. **Login** (`/login`): Envia credenciais para `POST /api/auth/login` no usuario-service
2. **Tokens**: Recebe **Access Token** (JWT RS256, 2h) + **Refresh Token** (opaco, 7 dias)
3. **Armazenamento**:
   - Mobile: `expo-secure-store` (Keychain/Keystore)
   - Web: `localStorage` (`syncday_access_token`, `syncday_refresh_token`, `syncday_lojista_access_token`)
4. **Requisições**: `HttpClient` injeta `Authorization: Bearer <access_token>` automaticamente
5. **Validação**: Backends validam localmente via JWKS do usuario-service (cache 10 min)
6. **Refresh**: `SessionProvider` renova tokens automaticamente via `POST /api/auth/refresh` (rotação)
7. **Logout**: `POST /api/auth/logout` (blocklist JTI) + `clearTokens()` limpa storage local

### Endpoints de Auth Consumidos (usuario-service)

| Método | Endpoint | Uso no Frontend |
|--------|----------|-----------------|
| `POST` | `/api/auth/login` | Tela de Login |
| `POST` | `/api/auth/register` | Tela de Cadastro |
| `POST` | `/api/auth/refresh` | Interceptor 401 / SessionProvider |
| `POST` | `/api/auth/logout` | Menu do usuário / Troca de perfil |
| `GET` | `/.well-known/jwks.json` | Validação distribuída (backends) |

### Claims do Access Token (JWT)

O frontend lê/usa os seguintes claims:

| Claim | Uso no Frontend |
|-------|-----------------|
| `sub` | Login do usuário (subject) |
| `permissions` | Array de permissões (`PERM_*`) para guards de tela |
| `services` | Serviços autorizados (roteamento condicional) |
| `jti` | ID do token (para blocklist no logout) |

---

## Estrutura do Projeto

```
syncday-app/
├── app/                          # Expo Router pages (file-based routing)
│   ├── _layout.tsx               # Root layout + providers
│   ├── index.tsx                 # Redirect → /login
│   ├── login.tsx                 # Tela de login
│   ├── cadastro.tsx              # Tela de cadastro (Cliente/Lojista)
│   ├── selecionar-perfil.tsx     # Seleção de perfil (multi-perfil)
│   ├── agendamentos.tsx          # Lista de agendamentos (Cliente)
│   ├── agenda-lojista.tsx        # Agenda do lojista
│   ├── novo-agendamento.tsx      # Fluxo de novo agendamento
│   ├── perfil-cliente.tsx        # Meu perfil (Cliente)
│   ├── perfil-lojista.tsx        # Meu perfil (Lojista)
│   └── gestao-lojista.tsx        # Gestão de estabelecimentos/serviços
├── src/
│   ├── core/
│   │   ├── di/container.ts       # Injeção de dependência (repositories, usecases)
│   │   ├── theme/index.ts        # Tokens de design (colors, spacing, radius, typography)
│   │   └── utils/                # dates, errors, format, imageValidation
│   ├── data/
│   │   └── http/                 # Implementações de repositório HTTP
│   │       ├── AuthApiClient.ts  # Cliente de autenticação (login, register, refresh, logout)
│   │       ├── HttpClient.ts     # Fetch wrapper com interceptors + auth
│   │       ├── accessToken.ts    # Chaves de storage + helpers
│   │       ├── httpRepositories.ts
│   │       ├── lojistaManagementRepository.ts
│   │       └── *.test.ts         # Testes de repositórios
│   ├── domain/
│   │   ├── entities/             # Appointment, Service, User (Zod schemas)
│   │   ├── repositories/         # Interfaces (ports)
│   │   └── usecases/             # Casos de uso (application layer)
│   ├── presentation/
│   │   ├── components/
│   │   │   ├── auth/AuthGuard.tsx
│   │   │   ├── brand/Logo.tsx    # Wordmark + Logo
│   │   │   └── ui/               # Componentes base (Button, Card, BlueHeader, BackButton, etc.)
│   │   ├── features/
│   │   │   ├── access/           # LoginScreen, RegistrationScreen, ProfileSelectionScreen
│   │   │   ├── appointments/     # AppointmentCard, ClientProfileScreen, LojistaProfileScreen, etc.
│   │   │   └── booking/          # BookingScreen, DateSelector, TimeSlotGrid, etc.
│   │   ├── hooks/                # useAsync, useGridItemWidth, useRefreshOnFocus, etc.
│   │   ├── navigation/           # profileRoutes.ts
│   │   └── providers/            # SessionProvider, ToastProvider, AppProviders
│   └── utils/dates.ts            # Helpers de data legados (migração)
├── assets/                       # Ícones, fontes, imagens
├── dist/                         # Build estático (@expo/static-html) - gerado no build
├── nginx.conf                    # Config nginx (proxy /api/*, SPA fallback)
├── Dockerfile                    # Multi-stage: Node 20 build → nginx Alpine
├── docker-compose.yml            # Orquestração frontend + backends
├── .env.example                  # Template de variáveis de ambiente
├── package.json
├── tsconfig.json
├── app.json                      # Config Expo
└── eslint.config.js
```

---

## Build Docker (Produção)

### Dockerfile Multi-stage

```dockerfile
# Stage 1: Build (Node 20)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web --output-dir dist

# Stage 2: Runtime (nginx Alpine)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf (Proxy Reverso)

```nginx
server {
    listen 8081;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend services
    location /api/usuario/ {
        proxy_pass http://usuario-app:8092/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/cliente/ {
        proxy_pass http://cliente-app:8091/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/lojista/ {
        proxy_pass http://lojista-app:8090/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/agendamento/ {
        proxy_pass http://agendamento-app:8093/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /api/gestao/ {
        proxy_pass http://gestao-app:8094/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> **Importante:** O frontend chama `/api/usuario/*`, `/api/cliente/*`, etc. O nginx remove o prefixo `/api` ao fazer `proxy_pass` para o backend (que já tem `@RequestMapping("/api/...")`).

---

## Executar os Testes

```bash
# Todos os testes (Jest)
npm test

# Testes com coverage
npm test -- --coverage

# Testes em watch mode
npm test -- --watch
```

### Suíte de Testes

| Arquivo | Descrição |
|---------|-----------|
| `AuthApiClient.test.ts` | Login, register, refresh, logout, JWKS |
| `HttpClient.test.ts` | Interceptors, auth header, 401 retry |
| `HttpRegistrationRepository.test.ts` | Cadastro Cliente/Lojista, validação CEP |
| `httpRepositories.test.ts` | Agendamentos, perfil, serviços |
| `lojistaManagementRepository.test.ts` | CRUD estabelecimentos, serviços, logos |
| `registrationValidation.test.ts` | Schemas Zod (CPF, CNPJ, CEP, senha) |
| `profileRoutes.test.ts` | Roteamento por perfil ativo |
| `appointment.test.ts` | Entidade Appointment |

---

## Estrutura de Configuração

```
syncday-app/
├── app.json                      # Config Expo (name, scheme, plugins, web output)
├── nginx.conf                    # Proxy reverso para produção
├── Dockerfile                    # Build multi-stage
├── docker-compose.yml            # Stack completa
├── .env.example                  # Template de variáveis
├── .dockerignore
├── tsconfig.json                 # TypeScript strict mode
├── eslint.config.js              # ESLint flat config
├── package.json
│   ├── scripts:
│   │   ├── start: "expo start"
│   │   ├── test: "jest"
│   │   ├── lint: "eslint ."
│   │   ├── build:web: "expo export --platform web"
│   │   └── docker:build: "docker build -t syncday-app ."
└── src/                          # Código fonte (ver estrutura acima)
```

---

## Notas Importantes e Solução de Problemas

### Porta 8081 em Uso

Se o erro for "Port 8081 was already in use":

```bash
# Linux/macOS
lsof -ti:8081 | xargs kill -9

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8081).OwningProcess | Stop-Process -Force

# Windows CMD
for /f "tokens=5" %a in ('netstat -ano ^| findstr :8081') do taskkill /F /PID %a
```

### Metro Bundler Cache

Se houver problemas de cache do Metro/Expo:

```bash
npx expo start -c
# ou
npx expo start --clear
```

### Variáveis de Ambiente no Windows

No Windows, defina as variáveis **antes** do comando:

```powershell
# PowerShell (correto)
$env:EXPO_PUBLIC_API_URL="http://localhost:8093"; npx expo start

# PowerShell (incorreto - não funciona)
EXPO_PUBLIC_API_URL=http://localhost:8093 npx expo start

# CMD
set EXPO_PUBLIC_API_URL=http://localhost:8093 && npx expo start
```

### Web Export - CSS Absoluto

O `@expo/static-html` compila estilos absolutos (`position: absolute`) para classes hashed (ex: `.r-1wzrnnt { margin-top: 16px }`). **Use Flexbox/Spacer pattern** em vez de posicionamento absoluto para compatibilidade web:

```tsx
// ✅ Funciona no web (compila para flex:1)
<View style={{ flex: 1 }} />
<Typography>Texto no rodapé do header</Typography>

// ❌ Quebra no web (margin-top hashed)
<Typography style={{ position: 'absolute', bottom: 0 }}>Texto</Typography>
```

### Autenticação - Token Persistente Após Logout

Se `syncday_lojista_access_token` persistir no `localStorage` após logout:

1. Verifique se `SessionProvider.signOut()` chama `clearTokens()` em bloco `finally`
2. Confirme se `/api/auth/logout` retorna 200 (não 404 - rota correta é `/api/auth/logout`)
3. No `container.ts`, `authApiUrl` deve ser `''` (string vazia) para nginx injetar `/api`

### CEP - Busca Automática vs Blur

- **Cliente (Cadastro)**: `onBlur` — busca ao sair do campo (igual LojistaProfileScreen)
- **Lojista (Perfil)**: `onBlur` — busca ao sair do campo
- **Não use `onChangeText`** — causa múltiplas requisições durante digitação

### BackButton - Alinhamento

Para alinhar à esquerda (padrão `/novo-agendamento`):

```tsx
<BlueHeader>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <BackButton compact />
    <View style={{ flex: 1 }} />  {/* Spacer empurra Wordmark para centro */}
    <Wordmark />
    <View style={{ flex: 1 }} />  {/* Spacer balanceia */}
    <UserMenuTrigger />
  </View>
  <View style={{ flex: 1 }} />  {/* Spacer vertical empurra título para baixo */}
  <Typography variant="heading" size={20}>Título</Typography>
</BlueHeader>
```

---

## Scripts Úteis

```bash
# Desenvolvimento
npm start                 # npx expo start
npm run android           # npx expo run:android
npm run ios               # npx expo run:ios
npm run web               # npx expo start --web

# Qualidade
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm test                  # Jest

# Build
npm run build:web         # expo export --platform web --output-dir dist
npm run docker:build      # docker build -t syncday-app .
npm run docker:run        # docker run -p 8081:8081 syncday-app

# Reset (cuidado: apaga código do app/)
npm run reset-project
```