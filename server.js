const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const fs      = require("fs");
const express = require("express");
const multer  = require("multer");

// ── Caminhos persistentes ─────────────────────────────────────────────────────
// Em produção (Render) use variáveis de ambiente apontando para o Persistent Disk.
// Localmente usa os caminhos padrão do projeto.
// No Render: DB_PATH=/var/data/db.sqlite  |  UPLOADS_DIR=/var/data/uploads
const DB_PATH   = process.env.DB_PATH    || path.join(__dirname, "db.sqlite");
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");

// Garante que o diretório de uploads existe (no disco persistente ou local)
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Banco de dados ────────────────────────────────────────────────────────────
const db = new sqlite3.Database(DB_PATH);

// Tabela de pastas (funcionários)
db.run(
  `CREATE TABLE IF NOT EXISTS pastas (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nome  TEXT NOT NULL,
    cpf   TEXT NOT NULL,
    cargo TEXT NOT NULL,
    setor TEXT NOT NULL
  )`,
  (err) => {
    if (err) console.log("Erro criando tabela pastas:", err.message);
    else {
      console.log("Tabela 'pastas' pronta ✅");
      // Garante que todas as colunas existem (migration via PRAGMA)
      garantirColunas();
    }
  }
);

// Tabela de arquivos vinculados a cada pasta.
// - pasta_id    : referência à pasta dona do arquivo
// - nome_original: nome original que o usuário viu no upload
// - nome_arquivo : nome único com que foi salvo em disco (evita colisões)
// - mimetype    : tipo MIME do arquivo (image/png, application/pdf, etc.)
// - tamanho     : tamanho em bytes
// - criado_em   : data/hora do upload (ISO 8601)
db.run(
  `CREATE TABLE IF NOT EXISTS arquivos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    pasta_id      INTEGER NOT NULL,
    nome_original TEXT    NOT NULL,
    nome_arquivo  TEXT    NOT NULL,
    mimetype      TEXT    NOT NULL,
    tamanho       INTEGER NOT NULL,
    criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) console.log("Erro criando tabela arquivos:", err.message);
    else console.log("Tabela 'arquivos' pronta ✅");
  }
);

// Tabela de subpastas – pastas filhas criadas dentro de uma pasta de funcionário
db.run(
  `CREATE TABLE IF NOT EXISTS subpastas (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pasta_id  INTEGER NOT NULL,
    nome      TEXT    NOT NULL,
    criado_em TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) console.log("Erro criando tabela subpastas:", err.message);
    else console.log("Tabela 'subpastas' pronta ✅");
  }
);
// Tabela de registros de falta por funcionário
db.run(
  `CREATE TABLE IF NOT EXISTS registros_falta (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pasta_id        INTEGER NOT NULL,
    data_falta      TEXT    NOT NULL,          -- YYYY-MM-DD (dia da falta ou início)
    tem_atestado    INTEGER NOT NULL DEFAULT 0, -- 0 = não, 1 = sim
    atestado_inicio TEXT    NOT NULL DEFAULT '',
    atestado_fim    TEXT    NOT NULL DEFAULT '',
    criado_em       TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) console.log("Erro criando tabela registros_falta:", err.message);
    else console.log("Tabela 'registros_falta' pronta \u2705");
  }
);
// Adiciona coluna subpasta_id em arquivos para saber a qual subpasta o arquivo pertence.
// NULL = arquivo fica na raiz da pasta principal.
// Ignora erro se a coluna já existir (migration segura).
db.run(`ALTER TABLE arquivos ADD COLUMN subpasta_id INTEGER DEFAULT NULL`, () => {});

// ── Migrations seguras via PRAGMA ──────────────────────────────────────────────
// Verifica quais colunas existem em 'pastas' e adiciona as que faltam.
// Desta forma a migração NÃO depende de timing de callbacks ou de versão do SQLite.
function garantirColunas() {
  db.all("PRAGMA table_info(pastas)", (err, cols) => {
    if (err) return console.error("PRAGMA table_info falhou:", err.message);
    const existentes = new Set(cols.map(c => c.name));

    const adicionar = [
      ["modulo",           "TEXT",    "DEFAULT 'RH'"],
      ["captacao",         "TEXT",    "DEFAULT ''"],
      ["parceiro",         "TEXT",    "DEFAULT ''"],
      ["criado_em",        "TEXT",    ""],           // sem default – preenchido pelo INSERT
      ["data_nascimento",  "TEXT",    "DEFAULT ''"],
      ["faltas",           "INTEGER", "DEFAULT 0"],
    ];

    adicionar.forEach(([coluna, tipo, def]) => {
      if (!existentes.has(coluna)) {
        const sql = `ALTER TABLE pastas ADD COLUMN ${coluna} ${tipo} ${def}`.trim();
        db.run(sql, (e) => {
          if (e) console.error(`Falha ao adicionar coluna '${coluna}':`, e.message);
          else   console.log(`Coluna '${coluna}' adicionada ✅`);
        });
      }
    });
  });
}

// ── Configuração do Multer ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext    = path.extname(file.originalname);
    const unique = Date.now() + "_" + Math.round(Math.random() * 1e6);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// ── Express ───────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log simples de todas as requisições para diagnóstico
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Serve os arquivos enviados pelos usuários em /uploads/*
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Proteção das páginas HTML ─────────────────────────────────────────────────
// Bloqueia acesso direto a /html/* para quem não estiver logado (sem cookie)
app.use((req, res, next) => {
  if (req.path.startsWith("/html/")) {
    const cookie    = req.headers.cookie || "";
    const isLoggedIn = cookie.includes("logado=true");
    if (!isLoggedIn) {
      console.log("❌ BLOQUEADO:", req.method, req.path, "- sem cookie logado=true");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      return res.status(401).redirect("/?unauthorized=1");
    }
    console.log("✓ Permitido:", req.method, req.path);
  }
  next();
});

// Serve os arquivos estáticos públicos (css, js, html)
app.use(express.static(path.join(__dirname, "public")));

// ── Autenticação ───────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {
  const username = req.body.username || req.body.usuario || "";
  const password = req.body.password || req.body.senha  || "";

  if (username === "Maria Pateis" && password === "UpConsult@25") {
    res.cookie("logado", "true", {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      path: "/",
      sameSite: "lax"
    });
    return res.status(200).send(`
      <!DOCTYPE html><html lang="pt-BR"><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Autenticando...</title>
        <style>
          body{font-family:Arial,sans-serif;display:flex;justify-content:center;
               align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
          .loading{text-align:center}
          .spinner{border:4px solid #f3f3f3;border-top:4px solid #333;border-radius:50%;
                   width:40px;height:40px;animation:spin 1s linear infinite;margin:20px auto}
          @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        </style></head><body>
        <div class="loading"><div class="spinner"></div><p>Autenticando...</p></div>
        <script>setTimeout(()=>{window.location="/html/select.html"},1200)</script>
      </body></html>
    `);
  }
  return res.redirect("/?login=failed");
});

app.get("/login",  (_req, res) => res.redirect("/"));
app.get("/logout", (_req, res) => { res.clearCookie("logado", { path: "/" }); res.redirect("/"); });
app.get("/ping",   (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("/",       (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ── Rotas: Pastas ──────────────────────────────────────────────────────────────

// Retorna estatísticas de pastas: total e quantas foram criadas hoje
// Usado pelos cards de resumo no topo dos módulos
app.get("/pastas/stats", (req, res) => {
  const modulo = req.query.modulo || 'RH';
  const hoje = new Date().toISOString().slice(0, 10);
  const mes  = new Date().toISOString().slice(5, 7); // "02" para fevereiro

  if (modulo === 'RH') {
    // faltas_total = registros deste mês na tabela registros_falta
    const mes = new Date().toISOString().slice(5, 7);
    const ano = new Date().getFullYear().toString();
    db.get(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN data_nascimento != '' AND strftime('%m', data_nascimento) = ? THEN 1 ELSE 0 END) AS aniversarios
       FROM pastas WHERE modulo = 'RH'`,
      [mes],
      (err, row) => {
        const total = (row && row.total) || 0;
        const aniversarios = (row && row.aniversarios) || 0;
        db.get(
          `SELECT COUNT(*) AS faltas_total FROM registros_falta
           WHERE strftime('%Y-%m', data_falta) = ?`,
          [ano + '-' + mes],
          (_e2, rf) => {
            res.json({ total, aniversarios, faltas_total: (rf && rf.faltas_total) || 0 });
          }
        );
      }
    );
  } else {
    db.get(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN date(criado_em) = ? THEN 1 ELSE 0 END) AS hoje FROM pastas WHERE modulo = ?",
      [hoje, modulo],
      (err, row) => {
        if (err) {
          return db.get("SELECT COUNT(*) AS total FROM pastas WHERE modulo = ?",
            [modulo],
            (_e2, row2) => res.json({ total: (row2 && row2.total) || 0, hoje: 0 })
          );
        }
        res.json({ total: row.total || 0, hoje: row.hoje || 0 });
      }
    );
  }
});

// Lista todos os funcionários RH que fazem aniversário no mês atual
app.get("/pastas/aniversarios-mes", (req, res) => {
  const mes = new Date().toISOString().slice(5, 7); // "02"
  db.all(
    `SELECT nome, data_nascimento FROM pastas
     WHERE modulo = 'RH' AND data_nascimento != '' AND data_nascimento IS NOT NULL
     AND strftime('%m', data_nascimento) = ?
     ORDER BY strftime('%d', data_nascimento)`,
    [mes],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ── Rotas: Registros de Falta ─────────────────────────────────────────────────

// Lista todos os registros de falta do mês atual (com nome do funcionário)
app.get("/registros-falta", (req, res) => {
  const { mes, all, inicio, fim, pasta_id } = req.query;

  let whereClauses = [];
  let params        = [];

  // Modo 1: intervalo explícito de datas (para exportação)
  if (inicio && fim) {
    whereClauses.push("rf.data_falta >= ? AND rf.data_falta <= ?");
    params.push(inicio, fim);
  // Modo 2: todos os registros (para histórico completo na modal)
  } else if (all === '1') {
    // sem filtro de data
  // Modo 3 (padrão): filtrar pelo mês informado (para stats)
  } else {
    const mesRef = mes || new Date().toISOString().slice(0, 7);
    whereClauses.push("strftime('%Y-%m', rf.data_falta) = ?");
    params.push(mesRef);
  }

  if (pasta_id) {
    whereClauses.push("rf.pasta_id = ?");
    params.push(pasta_id);
  }

  const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  db.all(
    `SELECT rf.id, rf.pasta_id, rf.data_falta, rf.tem_atestado,
            rf.atestado_inicio, rf.atestado_fim, rf.criado_em,
            p.nome AS funcionario_nome
     FROM registros_falta rf
     JOIN pastas p ON p.id = rf.pasta_id
     ${where}
     ORDER BY rf.data_falta DESC, p.nome`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Cria um novo registro de falta
app.post("/registros-falta", (req, res) => {
  const { pasta_id, data_falta, tem_atestado, atestado_inicio, atestado_fim } = req.body;
  if (!pasta_id || !data_falta)
    return res.status(400).json({ error: "pasta_id e data_falta são obrigatórios" });
  const atestado = tem_atestado ? 1 : 0;
  db.run(
    `INSERT INTO registros_falta (pasta_id, data_falta, tem_atestado, atestado_inicio, atestado_fim)
     VALUES (?, ?, ?, ?, ?)`,
    [pasta_id, data_falta, atestado, atestado_inicio || '', atestado_fim || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      // Retorna o registro recém-criado com o nome do funcionário
      db.get(
        `SELECT rf.id, rf.pasta_id, rf.data_falta, rf.tem_atestado,
                rf.atestado_inicio, rf.atestado_fim, p.nome AS funcionario_nome
         FROM registros_falta rf JOIN pastas p ON p.id = rf.pasta_id
         WHERE rf.id = ?`,
        [this.lastID],
        (_e, row) => res.status(201).json(row)
      );
    }
  );
});

// Remove um registro de falta
app.delete("/registros-falta/:id", (req, res) => {
  db.run("DELETE FROM registros_falta WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// Lista todas as pastas (usada ao carregar a página)
app.get("/pastas", (req, res) => {
  const modulo = req.query.modulo || 'RH';
  db.all("SELECT * FROM pastas WHERE modulo = ? ORDER BY id DESC", [modulo], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Cria uma nova pasta
app.post("/pastas", (req, res) => {
  const { nome, cpf, cargo, setor, captacao, parceiro, modulo, data_nascimento, faltas } = req.body;
  const mod = modulo || 'RH';

  if (mod === 'RH') {
    if (!nome || !cpf || !cargo || !setor)
      return res.status(400).json({ error: "Dados incompletos para RH" });
  } else {
    if (!nome)
      return res.status(400).json({ error: "Nome é obrigatório" });
    if (!cpf)
      return res.status(400).json({ error: "CPF é obrigatório" });
    if (!captacao)
      return res.status(400).json({ error: "Forma de captação é obrigatória" });
    if (!parceiro)
      return res.status(400).json({ error: "Parceiro é obrigatório" });
  }

  const dn = data_nascimento || '';
  const ft = parseInt(faltas, 10) || 0;

  db.run(
    "INSERT INTO pastas (nome, cpf, cargo, setor, captacao, parceiro, modulo, criado_em, data_nascimento, faltas) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)",
    [nome, cpf || '', cargo || '', setor || '', captacao || '', parceiro || '', mod, dn, ft],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, nome, cpf: cpf || '', cargo: cargo || '', setor: setor || '', captacao: captacao || '', parceiro: parceiro || '', modulo: mod, data_nascimento: dn, faltas: ft });
    }
  );
});

// Exclui uma pasta e tudo que ela contém:
// arquivos em disco + registros de arquivos + subpastas + a própria pasta
app.delete("/pastas/:id", (req, res) => {
  const { id } = req.params;

  // 1) Busca todos os arquivos da pasta (raiz + subpastas)
  db.all("SELECT nome_arquivo FROM arquivos WHERE pasta_id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Apaga cada arquivo do disco
    rows.forEach(row => {
      const fp = path.join(UPLOADS_DIR, row.nome_arquivo);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });

    // 2) Remove arquivos do banco
    db.run("DELETE FROM arquivos WHERE pasta_id = ?", [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // 3) Remove subpastas
      db.run("DELETE FROM subpastas WHERE pasta_id = ?", [id], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });

        // 4) Remove a pasta em si
        db.run("DELETE FROM pastas WHERE id = ?", [id], (err4) => {
          if (err4) return res.status(500).json({ error: err4.message });
          res.json({ ok: true });
        });
      });
    });
  });
});

// Atualiza os dados de uma pasta existente
app.put("/pastas/:id", (req, res) => {
  const { nome, cpf, cargo, setor, captacao, parceiro, modulo, data_nascimento, faltas } = req.body;
  const { id } = req.params;
  const mod = modulo || 'RH';

  if (mod === 'RH') {
    if (!nome || !cpf || !cargo || !setor)
      return res.status(400).json({ error: "Dados incompletos para RH" });
  } else {
    if (!nome)
      return res.status(400).json({ error: "Nome é obrigatório" });
    if (!cpf)
      return res.status(400).json({ error: "CPF é obrigatório" });
    if (!captacao)
      return res.status(400).json({ error: "Forma de captação é obrigatória" });
    if (!parceiro)
      return res.status(400).json({ error: "Parceiro é obrigatório" });
  }

  const dn = data_nascimento || '';
  const ft = parseInt(faltas, 10) || 0;

  db.run(
    "UPDATE pastas SET nome=?, cpf=?, cargo=?, setor=?, captacao=?, parceiro=?, modulo=?, data_nascimento=?, faltas=? WHERE id=?",
    [nome, cpf || '', cargo || '', setor || '', captacao || '', parceiro || '', mod, dn, ft, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: Number(id), nome, cpf: cpf || '', cargo: cargo || '', setor: setor || '', captacao: captacao || '', parceiro: parceiro || '', modulo: mod, data_nascimento: dn, faltas: ft });
    }
  );
});

// ── Rotas: Arquivos de uma pasta ───────────────────────────────────────────────

// Lista apenas os arquivos na raiz de uma pasta (sem subpasta_id) – arquivos dentro de
// subpastas são carregados pela rota GET /subpastas/:id/arquivos
app.get("/pastas/:id/arquivos", (req, res) => {
  db.all(
    "SELECT * FROM arquivos WHERE pasta_id = ? AND subpasta_id IS NULL ORDER BY criado_em ASC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Faz upload de um ou mais arquivos para uma pasta.
// O multer salva os arquivos em /uploads e disponibiliza os metadados em req.files.
app.post("/pastas/:id/arquivos", upload.array("arquivos"), (req, res) => {
  const pastaId = req.params.id;
  const files   = req.files;

  if (!files || files.length === 0)
    return res.status(400).json({ error: "Nenhum arquivo enviado" });

  const inseridos = [];
  let pendentes   = files.length;

  files.forEach((file) => {
    db.run(
      `INSERT INTO arquivos (pasta_id, nome_original, nome_arquivo, mimetype, tamanho)
       VALUES (?, ?, ?, ?, ?)`,
      [pastaId, file.originalname, file.filename, file.mimetype, file.size],
      function (err) {
        if (err) {
          console.error("Erro ao inserir arquivo:", err.message);
        } else {
          inseridos.push({
            id:            this.lastID,
            pasta_id:      Number(pastaId),
            nome_original: file.originalname,
            nome_arquivo:  file.filename,
            mimetype:      file.mimetype,
            tamanho:       file.size,
            url:           "/uploads/" + file.filename
          });
        }
        pendentes--;
        // Quando todos os inserts terminarem, responde
        if (pendentes === 0) res.status(201).json(inseridos);
      }
    );
  });
});

// Remove um arquivo de uma pasta (apaga do banco e do disco)
app.delete("/pastas/:id/arquivos/:arquivoId", (req, res) => {
  const { arquivoId } = req.params;

  db.get("SELECT nome_arquivo FROM arquivos WHERE id = ?", [arquivoId], (err, row) => {
    if (err)  return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Arquivo não encontrado" });

    // Apaga o arquivo do disco
    const filePath = path.join(UPLOADS_DIR, row.nome_arquivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Remove do banco de dados
    db.run("DELETE FROM arquivos WHERE id = ?", [arquivoId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ok: true });
    });
  });
});

// ── Rotas: Subpastas ──────────────────────────────────────────────────────────────

// Lista todas as subpastas de uma pasta
app.get("/pastas/:id/subpastas", (req, res) => {
  db.all(
    "SELECT * FROM subpastas WHERE pasta_id = ? ORDER BY criado_em ASC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Cria uma nova subpasta dentro de uma pasta
app.post("/pastas/:id/subpastas", (req, res) => {
  const { nome } = req.body;
  if (!nome || nome.trim() === "")
    return res.status(400).json({ error: "Nome da subpasta é obrigatório" });

  db.run(
    "INSERT INTO subpastas (pasta_id, nome) VALUES (?, ?)",
    [req.params.id, nome.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, pasta_id: Number(req.params.id), nome: nome.trim() });
    }
  );
});

// Remove uma subpasta e todos os seus arquivos do banco (arquivos no disco
// são deletados antes de remover o registro)
app.delete("/pastas/:id/subpastas/:subId", (req, res) => {
  const { subId } = req.params;

  // Busca todos os arquivos da subpasta para excluir do disco
  db.all("SELECT nome_arquivo FROM arquivos WHERE subpasta_id = ?", [subId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    rows.forEach(row => {
      const fp = path.join(UPLOADS_DIR, row.nome_arquivo);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });

    // Remove os arquivos do banco
    db.run("DELETE FROM arquivos WHERE subpasta_id = ?", [subId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Remove a subpasta
      db.run("DELETE FROM subpastas WHERE id = ?", [subId], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ ok: true });
      });
    });
  });
});

// Renomeia uma subpasta
app.put("/subpastas/:id", (req, res) => {
  const { nome } = req.body;
  if (!nome || nome.trim() === "")
    return res.status(400).json({ error: "Nome é obrigatório" });

  db.run(
    "UPDATE subpastas SET nome = ? WHERE id = ?",
    [nome.trim(), req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: Number(req.params.id), nome: nome.trim() });
    }
  );
});

// ── Rotas: Arquivos de uma subpasta ──────────────────────────────────────────────

// Lista os arquivos de uma subpasta específica
app.get("/subpastas/:id/arquivos", (req, res) => {
  db.all(
    "SELECT * FROM arquivos WHERE subpasta_id = ? ORDER BY criado_em ASC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Faz upload de arquivos direto para uma subpasta
app.post("/subpastas/:id/arquivos", upload.array("arquivos"), (req, res) => {
  const subpastaId = req.params.id;
  const files = req.files;
  if (!files || files.length === 0)
    return res.status(400).json({ error: "Nenhum arquivo enviado" });

  // Precisamos do pasta_id da subpasta para preencher o campo obrigatório
  db.get("SELECT pasta_id FROM subpastas WHERE id = ?", [subpastaId], (err, sub) => {
    if (err || !sub) return res.status(404).json({ error: "Subpasta não encontrada" });

    const inseridos = [];
    let pendentes = files.length;

    files.forEach((file) => {
      db.run(
        `INSERT INTO arquivos (pasta_id, subpasta_id, nome_original, nome_arquivo, mimetype, tamanho)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sub.pasta_id, subpastaId, file.originalname, file.filename, file.mimetype, file.size],
        function (err2) {
          if (!err2) {
            inseridos.push({
              id:            this.lastID,
              pasta_id:      sub.pasta_id,
              subpasta_id:   Number(subpastaId),
              nome_original: file.originalname,
              nome_arquivo:  file.filename,
              mimetype:      file.mimetype,
              tamanho:       file.size,
              url:           "/uploads/" + file.filename
            });
          }
          pendentes--;
          if (pendentes === 0) res.status(201).json(inseridos);
        }
      );
    });
  });
});

// Move um arquivo entre raiz e subpasta (ou entre subpastas).
// Body: { subpasta_id: <number|null> }
app.patch("/arquivos/:id/mover", (req, res) => {
  const { subpasta_id } = req.body; // null = mover para raiz
  db.run(
    "UPDATE arquivos SET subpasta_id = ? WHERE id = ?",
    [subpasta_id ?? null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

// ── Fallback SPA ───────────────────────────────────────────────────────────────
app.get(/^\/.*/, (req, res) => {
  if (req.method === "GET" && req.headers.accept && req.headers.accept.includes("text/html"))
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  return res.status(404).end();
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} 🚀`));
