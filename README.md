# 📁 Gestão de Documentos — RH & Comercial

Sistema web para gestão de pastas e documentos de funcionários/clientes, com dois módulos independentes: **RH** e **Comercial**.

Banco de dados via **Turso (libsql)** em produção e SQLite local em desenvolvimento. Armazenamento de arquivos via **Cloudinary** em produção e disco local em desenvolvimento.

---

## 🚀 Como iniciar

1. Copie o arquivo de variáveis de ambiente:
```bash
cp .env.example .env
```

2. Preencha o `.env` com suas credenciais (Turso + Cloudinary)

3. Instale as dependências e inicie:
```bash
npm install    # Express, @libsql/client, Cloudinary, Multer, Archiver
npm start      # produção – node server.js
npm run dev    # desenvolvimento – node --watch server.js
```

Acesse: **http://localhost:3000**

**Login padrão:**
- Usuário: `Maria Pateis`
- Senha: `UpConsult@25`

---

## 🔌 Integração em projeto maior

O `server.js` exporta `{ app, db, inicializarDB }` e **não abre porta** quando importado como módulo.

```js
const { app, db, inicializarDB } = require('./server');

// Montando como sub-app num servidor pai:
await inicializarDB();
pai.use('/rh', app);
```

Executado diretamente (`node server.js`) sobe o listener normalmente.

---

## ✅ Funcionalidades

### Pastas
- **Criar** pasta (módulo RH: Nome, CPF, Cargo, Setor, Data de nascimento — módulo Comercial: Nome, CPF, Captação, Parceiro)
- **Editar** e **Excluir** com undo de 5 segundos
- **Ordenação** configurável: A→Z, Z→A, mais recente, mais antigo
- **Pesquisa** em tempo real por nome ou CPF

### Subpastas
- Criar, renomear (inline) e excluir com undo
- Badge com contagem de arquivos
- Breadcrumb com botão "← Voltar"

### Arquivos
- Upload múltiplo via botão ou drag & drop
- Abrir, excluir, mover entre raiz e subpastas
- Ícone automático por tipo (PDF, Word, Excel, imagem, vídeo, ZIP…)
- Download em ZIP da pasta inteira

### Módulo RH
- Registros de falta com atestado médico (início/fim)
- Aniversariantes do mês
- Exportação Excel dos registros de falta

---

## 🗄️ Banco de dados

Em produção usa **Turso** (libsql). Em desenvolvimento cria `public/midia/db.sqlite` automaticamente.

### Tabela `pastas`

| coluna | tipo | descrição |
|---|---|---|
| id | INTEGER PK | identificador único |
| nome | TEXT | nome do funcionário/cliente |
| cpf | TEXT | CPF com máscara |
| cargo | TEXT | cargo (módulo RH) |
| setor | TEXT | setor (módulo RH) |
| captacao | TEXT | canal de captação (módulo Comercial) |
| parceiro | TEXT | parceiro (módulo Comercial) |
| modulo | TEXT | `'RH'` ou `'COMERCIAL'` |
| data_nascimento | TEXT | data de nascimento (módulo RH) |
| criado_em | TEXT | data/hora de criação |

### Tabela `subpastas`

| coluna | tipo | descrição |
|---|---|---|
| id | INTEGER PK | identificador único |
| pasta_id | INTEGER FK | pasta pai |
| nome | TEXT | nome da subpasta |
| criado_em | TEXT | data/hora de criação |

### Tabela `arquivos`

| coluna | tipo | descrição |
|---|---|---|
| id | INTEGER PK | identificador único |
| pasta_id | INTEGER FK | pasta dona |
| subpasta_id | INTEGER\|NULL | subpasta (`NULL` = raiz) |
| nome_original | TEXT | nome original do arquivo |
| nome_arquivo | TEXT | nome único em armazenamento |
| mimetype | TEXT | tipo MIME |
| tamanho | INTEGER | tamanho em bytes |
| criado_em | TEXT | data/hora do upload |

### Tabela `registros_falta`

| coluna | tipo | descrição |
|---|---|---|
| id | INTEGER PK | identificador único |
| pasta_id | INTEGER FK | funcionário |
| data_falta | TEXT | data da falta |
| tem_atestado | INTEGER | `0` ou `1` |
| atestado_inicio | TEXT | início do atestado |
| atestado_fim | TEXT | fim do atestado |
| criado_em | TEXT | data/hora do registro |

---

## 🔌 API REST

| Método | Rota | Função |
|---|---|---|
| `POST` | `/login` | Autenticar |
| `GET` | `/logout` | Fazer logout |
| `GET` | `/pastas?modulo=RH` | Listar pastas por módulo |
| `POST` | `/pastas` | Criar pasta |
| `PUT` | `/pastas/:id` | Editar pasta |
| `DELETE` | `/pastas/:id` | Excluir pasta (cascata) |
| `GET` | `/pastas/:id` | Detalhes completos da pasta |
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
| `GET` | `/pastas/:id/zip` | Baixar pasta como ZIP |
| `GET` | `/stats` | Totais gerais |
| `GET` | `/stats/modulo?modulo=` | Totais por módulo |
| `GET` | `/aniversariantes?mes=` | Aniversariantes do mês (RH) |
| `GET` | `/registros-falta` | Listar registros de falta |
| `POST` | `/registros-falta` | Criar registro de falta |
| `DELETE` | `/registros-falta/:id` | Excluir registro |

---

## 🗂️ Estrutura do projeto

```
projeto treino/
├── server.js                  # API Express + banco + uploads
├── package.json
├── .env                       # Variáveis de ambiente (não commitado)
├── .env.example               # Modelo das variáveis necessárias
├── render.yaml                # Config de deploy no Render
└── public/
    ├── index.html             # Tela de login
    ├── asset/                 # Logo e imagens estáticas
    ├── css/
    │   ├── app.css            # Tema dark, cards, modais
    │   └── style.css          # Tela de login
    ├── html/
    │   ├── app.html           # Módulo RH
    │   ├── comercial.html     # Módulo Comercial
    │   └── select.html        # Seleção de módulo pós-login
    ├── js/
    │   ├── app.js             # Entry point RH
    │   ├── comercial.js       # Entry point Comercial
    │   ├── login.js           # Lógica de login
    │   └── modules/
    │       └── modalNovaPasta.js  # Toda a lógica do frontend
    └── midia/
        └── uploads/           # Arquivos locais (apenas dev)
```

---

## 🔐 Segurança
- Middleware de autenticação em rotas `/html/*`
- Cookies `httpOnly` para sessão
- Prepared statements — previne SQL injection
- Multer com filename único — previne sobrescrita de arquivos


Sistema web para gestão de documentos de funcionários. Cada funcionário tem uma pasta digital com subpastas e arquivos, tudo persistido em banco de dados SQLite.

---

## 🚀 Como iniciar

```bash
npm install    # instala dependências (Express, SQLite3, Multer)
npm start      # inicia o servidor na porta 3000
```

Acesse: **http://localhost:3000**

**Login padrão:**
- Usuário: `Maria Pateis`
- Senha: `UpConsult@25`

---

## ✅ Funcionalidades

### Pastas de funcionários
- **Criar** pasta com Nome, CPF (máscara `000.000.000-00` automática), Cargo e Setor
- **Editar** nome, CPF, cargo e setor de uma pasta existente
- **Excluir** pasta com undo de 5 segundos (barra de contagem regressiva) — cascata total: arquivos do disco + banco + subpastas
- **1 clique** seleciona (destaque dourado), **2 cliques** abre o modal
- Cards de **tamanho fixo** — não se expandem quando há poucas pastas

### Pesquisa em tempo real
- Filtra por nome ou CPF (aceita digitar com ou sem pontuação)
- Mensagem de "não encontrado" quando sem resultados
- Botão ✕ limpa a pesquisa

### Modal da pasta
- Exibe nome, CPF formatado, cargo e setor no cabeçalho
- **"Concluído"** fecha o modal
- **"Descartar alterações"** — ativado automaticamente ao detectar qualquer mudança (upload, exclusão, edição, mover arquivo, subpastas); pede confirmação inline antes de fechar

### Subpastas
- **Criar** com nome personalizado (Enter confirma, Escape cancela)
- **Renomear** inline — botão ✏ aparece ao passar o mouse; Enter salva, Escape cancela
- **Excluir** com undo de 5 segundos (remove todos os arquivos da subpasta)
- **1 clique** seleciona, **2 cliques** abre a subpasta
- Badge numérico com a quantidade de arquivos
- Breadcrumb com botão "← Voltar"

### Arquivos
- **Upload múltiplo** via botão "Upload+" ou clique na área central
- Arquivos salvos em `/uploads/` com nome único (sem risco de sobrescrever)
- **Abrir ↗** abre em nova aba
- **✕** exclui do banco e do disco
- **↩ Raiz** (visível dentro de subpastas) — move o arquivo de volta para a raiz
- **Drag & Drop** de arquivo da raiz para uma subpasta (muda `subpasta_id` no banco)
- **Drag & Drop** de arquivo do explorador do Windows direto para uma subpasta
- Ícone automático por tipo (PDF, Word, Excel, imagem, vídeo, ZIP etc.)

---

## 🗄️ Banco de dados — `db.sqlite`

**`pastas`**

| coluna | tipo | descrição |
|--------|------|-----------|
| id | INTEGER PK | identificador único |
| nome | TEXT | nome do funcionário |
| cpf | TEXT | CPF com máscara |
| cargo | TEXT | cargo selecionado |
| setor | TEXT | setor selecionado |

**`subpastas`**

| coluna | tipo | descrição |
|--------|------|-----------|
| id | INTEGER PK | identificador único |
| pasta_id | INTEGER FK | pasta pai |
| nome | TEXT | nome da subpasta |
| criado_em | TEXT | data/hora de criação |

**`arquivos`**

| coluna | tipo | descrição |
|--------|------|-----------|
| id | INTEGER PK | identificador único |
| pasta_id | INTEGER FK | pasta dona |
| subpasta_id | INTEGER \| NULL | subpasta (`NULL` = raiz) |
| nome_original | TEXT | nome original do arquivo |
| nome_arquivo | TEXT | nome único em disco |
| mimetype | TEXT | tipo MIME |
| tamanho | INTEGER | tamanho em bytes |
| criado_em | TEXT | data/hora do upload |

---

## 🔌 API REST

| Método | Rota | Função |
|--------|------|--------|
| `POST` | `/login` | Autenticar usuário |
| `GET` | `/logout` | Fazer logout |
| `GET` | `/pastas` | Listar todas as pastas |
| `POST` | `/pastas` | Criar nova pasta |
| `PUT` | `/pastas/:id` | Editar pasta |
| `DELETE` | `/pastas/:id` | Excluir pasta em cascata |
| `GET` | `/pastas/:id/arquivos` | Listar arquivos da raiz |
| `POST` | `/pastas/:id/arquivos` | Upload para raiz |
| `DELETE` | `/pastas/:id/arquivos/:arquivoId` | Excluir arquivo |
| `GET` | `/pastas/:id/subpastas` | Listar subpastas |
| `POST` | `/pastas/:id/subpastas` | Criar subpasta |
| `PUT` | `/subpastas/:id` | Renomear subpasta |
| `DELETE` | `/pastas/:id/subpastas/:subId` | Excluir subpasta em cascata |
| `GET` | `/subpastas/:id/arquivos` | Listar arquivos da subpasta |
| `POST` | `/subpastas/:id/arquivos` | Upload para subpasta |
| `PATCH` | `/arquivos/:id/mover` | Mover arquivo (raiz ↔ subpasta) |

---

## 🗂️ Estrutura do projeto

```
projeto treino/
├── server.js              # Servidor Express (API + auth + SQLite + Multer)
├── package.json
├── db.sqlite              # Banco de dados (criado automaticamente)
├── uploads/               # Arquivos enviados (criado automaticamente)
└── public/
    ├── index.html         # Página de login
    ├── css/
    │   ├── app.css        # Estilos principais (tema dark, cards, modais)
    │   └── style.css      # Estilos da tela de login
    ├── html/
    │   └── app.html       # App principal (dashboard + modais + toasts)
    └── js/
        ├── app.js         # Entry point
        └── modules/
            └── modalNovaPasta.js   # Toda a lógica do frontend (~1000 linhas)
```

---

## 🔐 Segurança
- Middleware de autenticação protege rotas `/html/*`
- Cookies `httpOnly` para sessão
- Prepared statements — previne SQL injection
- Multer com filename único — previne sobrescrita de arquivos