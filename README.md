# Gestão de Documentos — RH & Comercial

Sistema web para gestão de pastas e documentos de funcionários/clientes, com dois módulos independentes: **RH** e **Comercial**.

- **Backend:** Node.js + Express 5
- **Banco de dados:** MySQL (via `mysql2`)
- **Armazenamento de arquivos:** Cloudinary (produção) ou disco local (desenvolvimento)
- **Frontend:** Vanilla JS ES modules — sem framework

---

## Como iniciar (desenvolvimento local)

### 1. Pré-requisitos
- Node.js 18+
- Servidor MySQL rodando localmente

### 2. Configurar o banco

```sql
CREATE DATABASE gerenciador_pastas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```


> As tabelas são criadas automaticamente pelo servidor na primeira execução.

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com as credenciais do seu MySQL:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=sua_senha
DB_NAME=gerenciador_pastas
```

### 4. Instalar e iniciar

```bash
npm install
npm start       # produção — node server.js
npm run dev     # desenvolvimento — node --watch server.js (auto-restart)
```

Acesse: **http://localhost:3000**

**Login padrão** (altere em `.env`):
- Usuário: `Maria Pateis`
- Senha: `UpConsult@25`

---

## Integração em projeto maior (novo domínio)

O `server.js` exporta `{ app, db, inicializarDB }` e possui um guard `require.main === module`, permitindo usá-lo como sub-módulo de um servidor pai **ou** como servidor independente.

> **Atenção — caminhos do frontend:** o frontend usa `window.__BASE` para prefixar todos os `fetch()`. O servidor injeta esse valor automaticamente via `/config.js`. Defina `MOUNT_PATH` conforme a opção escolhida.

---

### Opção A — Sub-app Express (mesmo domínio, mesmo processo)

**Caso de uso:** o site principal é Express e quer expor este app em `empresa.com/rh`.

**1. No `.env` deste projeto:**
```
MOUNT_PATH=/rh
```

**2. No servidor pai:**
```js
const { app: rhApp, inicializarDB } = require('./gerenciador-pastas/server');

await inicializarDB(); // cria tabelas no banco se não existirem
servidorPai.use('/rh', rhApp);
```

Sem `require.main === module`, este app **não abre nenhuma porta** — só exporta o Express app.

---

### Opção B — Servidor independente + subdomínio (recomendada com Cloudflare)

**Caso de uso:** cada app roda em sua própria porta; Cloudflare Tunnel roteia por hostname.

```
emp.com          → localhost:3000 (site principal)
rh.emp.com       → localhost:3001 (este app)
```

**`.env` deste app:**
```
PORT=3001
MOUNT_PATH=        # vazio — app está na raiz do seu próprio domínio
```

Não é necessária nenhuma alteração de código. Todos os `fetch('/pastas')` continuam funcionando porque o browser está em `rh.emp.com`.

---

### Opção C — Servidor independente + nginx reverse proxy (mesmo domínio)

**Caso de uso:** nginx na frente, roteia `/rh` para este app na porta 3001.

**`.env` deste app:**
```
PORT=3001
MOUNT_PATH=/rh
```

**Config nginx:**
```nginx
location /rh/ {
    proxy_pass         http://localhost:3001/;   # barra final = strip do prefixo
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
}
```

> A barra final em `proxy_pass` faz o nginx remover `/rh` antes de repassar ao app — igual ao `express.use('/rh', app)` da Opção A.

---

## Cloudflare Tunnel

Use Cloudflare Tunnel para expor serviços locais na internet **sem abrir portas no roteador** e com HTTPS automático.

### Instalação

```bash
# Windows
winget install Cloudflare.cloudflared

# Linux / macOS
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
```

### Autenticar e criar tunnel

```bash
cloudflared tunnel login          # abre browser para autorizar no Cloudflare
cloudflared tunnel create empresa # cria o tunnel (salva credenciais em ~/.cloudflared/)
```

### Arquivo de configuração (`~/.cloudflared/config.yml`)

#### Opção B — um subdomínio por app (recomendada)

```yaml
tunnel: <ID-DO-TUNNEL>
credentials-file: /home/<usuario>/.cloudflared/<ID-DO-TUNNEL>.json

ingress:
  # Site principal (porta 3000)
  - hostname: empresa.com
    service: http://localhost:3000

  # Gerenciador RH/Documentos (porta 3001)
  - hostname: rh.empresa.com
    service: http://localhost:3001

  # Obrigatório: catch-all
  - service: http_status:404
```

#### Opção A/C — caminho único no mesmo domínio

```yaml
tunnel: <ID-DO-TUNNEL>
credentials-file: /home/<usuario>/.cloudflared/<ID-DO-TUNNEL>.json

ingress:
  - hostname: empresa.com
    service: http://localhost:3000   # nginx ou Express pai que roteia /rh → :3001

  - service: http_status:404
```

### Apontar DNS

```bash
# Cria registro CNAME no Cloudflare automaticamente
cloudflared tunnel route dns empresa empresa.com
cloudflared tunnel route dns empresa rh.empresa.com   # Opção B
```

### Iniciar o tunnel

```bash
# Rodar em primeiro plano (teste)
cloudflared tunnel run empresa

# Instalar como serviço (inicia com o sistema)
cloudflared service install
```

---

### Variáveis obrigatórias para produção

Copie `.env.example` e preencha:

| Variável | Descrição |
|---|---|
| `PORT` | Porta HTTP (padrão 3000) |
| `MOUNT_PATH` | Sub-caminho se montado em site maior (ex: `/rh`); vazio se standalone |
| `DB_HOST` | Host do MySQL |
| `DB_PORT` | Porta (padrão 3306) |
| `DB_USER` | Usuário do banco |
| `DB_PASS` | Senha do banco |
| `DB_NAME` | Nome do banco (deve existir previamente) |
| `LOGIN_USER` | Usuário de acesso ao painel |
| `LOGIN_PASS` | Senha de acesso ao painel |
| `CLOUDINARY_CLOUD_NAME` | *(opcional)* — sem isso, uploads ficam no disco |
| `CLOUDINARY_API_KEY` | *(opcional)* |
| `CLOUDINARY_API_SECRET` | *(opcional)* |

---

## Funcionalidades

### Pastas
- Criar, editar, excluir com undo de 5 s (cascata: arquivos + subpastas + registros de falta)
- Ordenação: A→Z, Z→A, mais recente, mais antigo
- Pesquisa em tempo real por nome ou CPF

### Subpastas
- Criar, renomear inline, excluir com undo
- Badge de contagem de arquivos, breadcrumb de navegação

### Arquivos
- Upload múltiplo (botão ou drag & drop)
- Pré-visualização inline (imagens, PDF, vídeo) sem precisar baixar
- Abrir em nova aba, excluir, mover entre raiz e subpastas
- Download de toda a pasta como ZIP
- Ícone automático por tipo de arquivo

### Módulo RH
- Registros de falta com suporte a atestado médico (período)
- Aniversariantes do mês
- Exportação Excel de funcionários e de registros de falta

### Módulo Comercial
- Campos: Captação e Parceiro
- Exportação Excel de clientes

---

## Banco de dados — tabelas

### `pastas`

| coluna | tipo | descrição |
|---|---|---|
| id | INT PK AUTO_INCREMENT | identificador |
| nome | VARCHAR(255) | nome do funcionário/cliente |
| cpf | VARCHAR(20) | CPF |
| cargo | VARCHAR(100) | cargo (RH) |
| setor | VARCHAR(100) | setor (RH) |
| captacao | VARCHAR(100) | canal de captação (Comercial) |
| parceiro | VARCHAR(255) | parceiro (Comercial) |
| modulo | VARCHAR(20) | `'RH'` ou `'COMERCIAL'` |
| data_nascimento | VARCHAR(10) | `YYYY-MM-DD` (RH) |
| criado_em | DATETIME | criado automaticamente |
| faltas | INT | total de dias de falta |

### `arquivos`

| coluna | tipo | descrição |
|---|---|---|
| id | INT PK | identificador |
| pasta_id | INT FK | pasta dona |
| subpasta_id | INT \| NULL | `NULL` = raiz da pasta |
| nome_original | VARCHAR(255) | nome original do arquivo |
| nome_arquivo | VARCHAR(255) | nome em armazenamento (Cloudinary public_id ou nome em disco) |
| mimetype | VARCHAR(100) | tipo MIME |
| tamanho | BIGINT | bytes |
| url_arquivo | TEXT | URL pública (Cloudinary) ou `/uploads/...` (disco) |
| criado_em | DATETIME | upload |

### `subpastas`

| coluna | tipo | descrição |
|---|---|---|
| id | INT PK | identificador |
| pasta_id | INT FK | pasta pai |
| nome | VARCHAR(255) | nome |
| criado_em | DATETIME | criação |

### `registros_falta`

| coluna | tipo | descrição |
|---|---|---|
| id | INT PK | identificador |
| pasta_id | INT FK | funcionário |
| data_falta | DATE | data da falta |
| tem_atestado | TINYINT(1) | `0` ou `1` |
| atestado_inicio | VARCHAR(10) | `YYYY-MM-DD` |
| atestado_fim | VARCHAR(10) | `YYYY-MM-DD` |
| criado_em | DATETIME | registro |

---

## API REST

| Método | Rota | Função |
|---|---|---|
| `POST` | `/login` | Autenticar |
| `GET` | `/logout` | Fazer logout |
| `GET` | `/ping` | Health check |
| `GET` | `/db-status` | Status do banco |
| `GET` | `/pastas?modulo=RH` | Listar pastas |
| `POST` | `/pastas` | Criar pasta |
| `PUT` | `/pastas/:id` | Editar pasta |
| `DELETE` | `/pastas/:id` | Excluir pasta (cascata) |
| `GET` | `/pastas/:id/exportar` | Baixar pasta como ZIP |
| `GET` | `/pastas/:id/arquivos` | Arquivos da raiz |
| `POST` | `/pastas/:id/arquivos` | Upload para raiz |
| `DELETE` | `/pastas/:id/arquivos/:aId` | Excluir arquivo |
| `GET` | `/pastas/:id/subpastas` | Listar subpastas |
| `POST` | `/pastas/:id/subpastas` | Criar subpasta |
| `PUT` | `/subpastas/:id` | Renomear subpasta |
| `DELETE` | `/pastas/:id/subpastas/:sId` | Excluir subpasta (cascata) |
| `GET` | `/subpastas/:id/arquivos` | Arquivos da subpasta |
| `POST` | `/subpastas/:id/arquivos` | Upload para subpasta |
| `PATCH` | `/arquivos/:id/mover` | Mover arquivo |
| `GET` | `/pastas/stats?modulo=RH` | Totais e aniversários do mês |
| `GET` | `/pastas/aniversarios-mes` | Aniversariantes do mês (RH) |
| `GET` | `/registros-falta` | Listar registros de falta |
| `POST` | `/registros-falta` | Criar registro |
| `DELETE` | `/registros-falta/:id` | Excluir registro |

---

## Estrutura de arquivos

```
projeto/
├── server.js                       # API Express + MySQL + uploads
├── package.json                    # Dependências: express, mysql2, multer, archiver, cloudinary, dotenv
├── .env                            # Variáveis reais (NÃO comitar)
├── .env.example                    # Modelo — copiar para .env e preencher
└── public/
    ├── index.html                  # Tela de login
    ├── asset/
    │   └── logo.png
    ├── css/
    │   ├── app.css                 # Tema dark — cards, modais, toasts, preview
    │   └── style.css               # Tela de login
    ├── html/
    │   ├── app.html                # Módulo RH
    │   ├── comercial.html          # Módulo Comercial
    │   └── select.html             # Seleção de módulo pós-login
    ├── js/
    │   ├── app.js                  # Entry point RH
    │   ├── comercial.js            # Entry point Comercial
    │   ├── login.js                # Formulário de login
    │   └── modules/
    │       └── modalNovaPasta.js   # Toda a lógica do frontend
    └── midia/
        └── uploads/                # Arquivos locais (dev apenas — ignorado pelo Git)
```

---

## Segurança
- Middleware de autenticação protege todas as rotas `/html/*`
- Sessão via cookie `logado=true` (24 h)
- Prepared statements no `mysql2` — previne SQL injection
- Multer com filename único — previne sobrescrita de arquivos
- Diretório `/midia` bloqueado com `403` para acesso direto
