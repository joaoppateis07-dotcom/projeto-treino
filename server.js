require("dotenv").config();
const { createClient } = require("@libsql/client");
const http    = require("http");
const path    = require("path");
const fs      = require("fs");
const express = require("express");
const multer  = require("multer");

// ── Caminhos de dados ────────────────────────────────────────────────────────
const MIDIA_DIR   = path.join(__dirname, "public", "midia");
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(MIDIA_DIR, "uploads");

// Garante que uploads existem localmente
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Banco de dados (Turso em producao / SQLite local em dev) ──────────────────
const db = createClient({
  url:       process.env.TURSO_URL   || "file:public/midia/db.sqlite",
  authToken: process.env.TURSO_TOKEN || undefined,
});

// ── Inicializacao das tabelas ─────────────────────────────────────────────────
async function inicializarDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pastas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nome            TEXT NOT NULL,
      cpf             TEXT NOT NULL,
      cargo           TEXT NOT NULL DEFAULT '',
      setor           TEXT NOT NULL DEFAULT '',
      captacao        TEXT DEFAULT '',
      parceiro        TEXT DEFAULT '',
      modulo          TEXT DEFAULT 'RH',
      criado_em       TEXT DEFAULT (datetime('now')),
      data_nascimento TEXT DEFAULT '',
      faltas          INTEGER DEFAULT 0
    )
  `);
  console.log("Tabela 'pastas' pronta");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS arquivos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      pasta_id      INTEGER NOT NULL,
      nome_original TEXT    NOT NULL,
      nome_arquivo  TEXT    NOT NULL,
      mimetype      TEXT    NOT NULL,
      tamanho       INTEGER NOT NULL,
      criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
      subpasta_id   INTEGER DEFAULT NULL,
      FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE
    )
  `);
  console.log("Tabela 'arquivos' pronta");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS subpastas (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      pasta_id  INTEGER NOT NULL,
      nome      TEXT    NOT NULL,
      criado_em TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE
    )
  `);
  console.log("Tabela 'subpastas' pronta");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS registros_falta (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      pasta_id        INTEGER NOT NULL,
      data_falta      TEXT    NOT NULL,
      tem_atestado    INTEGER NOT NULL DEFAULT 0,
      atestado_inicio TEXT    NOT NULL DEFAULT '',
      atestado_fim    TEXT    NOT NULL DEFAULT '',
      criado_em       TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE
    )
  `);
  console.log("Tabela 'registros_falta' pronta");

  const migrations = [
    "ALTER TABLE pastas   ADD COLUMN captacao        TEXT    DEFAULT ''",
    "ALTER TABLE pastas   ADD COLUMN parceiro        TEXT    DEFAULT ''",
    "ALTER TABLE pastas   ADD COLUMN modulo          TEXT    DEFAULT 'RH'",
    "ALTER TABLE pastas   ADD COLUMN criado_em       TEXT    DEFAULT (datetime('now'))",
    "ALTER TABLE pastas   ADD COLUMN data_nascimento TEXT    DEFAULT ''",
    "ALTER TABLE pastas   ADD COLUMN faltas          INTEGER DEFAULT 0",
    "ALTER TABLE arquivos ADD COLUMN subpasta_id     INTEGER DEFAULT NULL",
  ];
  for (const sql of migrations) {
    try { await db.execute(sql); } catch (_) { /* coluna ja existe */ }
  }
  console.log("Migrations seguras aplicadas");
}

// ── Configuracao do Multer ──────────────────────────────────────────────────
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

app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/midia", (_req, res) => res.status(403).end());

app.use((req, res, next) => {
  if (req.path.startsWith("/html/")) {
    const cookie     = req.headers.cookie || "";
    const isLoggedIn = cookie.includes("logado=true");
    if (!isLoggedIn) {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      return res.status(401).redirect("/?unauthorized=1");
    }
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// ── Autenticacao ───────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {
  const username = req.body.username || req.body.usuario || "";
  const password = req.body.password || req.body.senha   || "";
  if (username === "Maria Pateis" && password === "UpConsult@25") {
    res.cookie("logado", "true", { maxAge: 24*60*60*1000, httpOnly: false, path: "/", sameSite: "lax" });
    return res.status(200).send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Autenticando...</title><style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}.loading{text-align:center}.spinner{border:4px solid #f3f3f3;border-top:4px solid #333;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:20px auto}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head><body><div class="loading"><div class="spinner"></div><p>Autenticando...</p></div><script>setTimeout(()=>{window.location="/html/select.html"},1200)</script></body></html>`);
  }
  return res.redirect("/?login=failed");
});

app.get("/login",  (_req, res) => res.redirect("/"));
app.get("/logout", (_req, res) => { res.clearCookie("logado", { path: "/" }); res.redirect("/"); });
app.get("/ping",   (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("/",       (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ── Rotas: Stats ──────────────────────────────────────────────────────────────
app.get("/pastas/stats", async (req, res) => {
  try {
    const modulo = req.query.modulo || "RH";
    const hoje   = new Date().toISOString().slice(0, 10);
    const mes    = new Date().toISOString().slice(5, 7);
    const ano    = new Date().getFullYear().toString();

    if (modulo === "RH") {
      const r1 = await db.execute({ sql: `SELECT COUNT(*) AS total, SUM(CASE WHEN data_nascimento != '' AND strftime('%m', data_nascimento) = ? THEN 1 ELSE 0 END) AS aniversarios FROM pastas WHERE modulo = 'RH'`, args: [mes] });
      const row = r1.rows[0];
      const total        = Number(row?.total ?? 0);
      const aniversarios = Number(row?.aniversarios ?? 0);
      const r2 = await db.execute({ sql: `SELECT SUM(CASE WHEN tem_atestado = 1 AND atestado_inicio != '' AND atestado_fim != '' THEN CAST(julianday(atestado_fim) - julianday(atestado_inicio) + 1 AS INTEGER) ELSE 1 END) AS faltas_total FROM registros_falta WHERE strftime('%Y-%m', data_falta) = ?`, args: [ano + "-" + mes] });
      return res.json({ total, aniversarios, faltas_total: Number(r2.rows[0]?.faltas_total ?? 0) });
    }
    const r = await db.execute({ sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN date(criado_em) = ? THEN 1 ELSE 0 END) AS hoje FROM pastas WHERE modulo = ?", args: [hoje, modulo] });
    return res.json({ total: Number(r.rows[0]?.total ?? 0), hoje: Number(r.rows[0]?.hoje ?? 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/pastas/aniversarios-mes", async (_req, res) => {
  try {
    const mes = new Date().toISOString().slice(5, 7);
    const r = await db.execute({ sql: `SELECT nome, data_nascimento FROM pastas WHERE modulo = 'RH' AND data_nascimento != '' AND data_nascimento IS NOT NULL AND strftime('%m', data_nascimento) = ? ORDER BY strftime('%d', data_nascimento)`, args: [mes] });
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Rotas: Registros de Falta ─────────────────────────────────────────────────
app.get("/registros-falta", async (req, res) => {
  try {
    const { mes, all, inicio, fim, pasta_id } = req.query;
    const whereClauses = [];
    const args         = [];
    if (inicio && fim) {
      whereClauses.push("rf.data_falta >= ? AND rf.data_falta <= ?");
      args.push(inicio, fim);
    } else if (all !== "1") {
      const mesRef = mes || new Date().toISOString().slice(0, 7);
      whereClauses.push("strftime('%Y-%m', rf.data_falta) = ?");
      args.push(mesRef);
    }
    if (pasta_id) { whereClauses.push("rf.pasta_id = ?"); args.push(pasta_id); }
    const where = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";
    const r = await db.execute({ sql: `SELECT rf.id, rf.pasta_id, rf.data_falta, rf.tem_atestado, rf.atestado_inicio, rf.atestado_fim, rf.criado_em, p.nome AS funcionario_nome FROM registros_falta rf JOIN pastas p ON p.id = rf.pasta_id ${where} ORDER BY rf.data_falta DESC, p.nome`, args });
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/registros-falta", async (req, res) => {
  try {
    const { pasta_id, data_falta, tem_atestado, atestado_inicio, atestado_fim } = req.body;
    if (!pasta_id || !data_falta) return res.status(400).json({ error: "pasta_id e data_falta sao obrigatorios" });
    const ins = await db.execute({ sql: `INSERT INTO registros_falta (pasta_id, data_falta, tem_atestado, atestado_inicio, atestado_fim) VALUES (?, ?, ?, ?, ?)`, args: [pasta_id, data_falta, tem_atestado ? 1 : 0, atestado_inicio || "", atestado_fim || ""] });
    const r = await db.execute({ sql: `SELECT rf.id, rf.pasta_id, rf.data_falta, rf.tem_atestado, rf.atestado_inicio, rf.atestado_fim, p.nome AS funcionario_nome FROM registros_falta rf JOIN pastas p ON p.id = rf.pasta_id WHERE rf.id = ?`, args: [Number(ins.lastInsertRowid)] });
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/registros-falta/:id", async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM registros_falta WHERE id = ?", args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Rotas: Pastas ─────────────────────────────────────────────────────────────
app.get("/pastas", async (req, res) => {
  try {
    const modulo = req.query.modulo || "RH";
    const r = await db.execute({ sql: "SELECT * FROM pastas WHERE modulo = ? ORDER BY id DESC", args: [modulo] });
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/pastas", async (req, res) => {
  try {
    const { nome, cpf, cargo, setor, captacao, parceiro, modulo, data_nascimento, faltas } = req.body;
    const mod = modulo || "RH";
    if (mod === "RH") {
      if (!nome || !cpf || !cargo || !setor) return res.status(400).json({ error: "Dados incompletos para RH" });
    } else {
      if (!nome)     return res.status(400).json({ error: "Nome e obrigatorio" });
      if (!cpf)      return res.status(400).json({ error: "CPF e obrigatorio" });
      if (!captacao) return res.status(400).json({ error: "Forma de captacao e obrigatoria" });
      if (!parceiro) return res.status(400).json({ error: "Parceiro e obrigatorio" });
    }
    const dn = data_nascimento || "";
    const ft = parseInt(faltas, 10) || 0;
    const ins = await db.execute({ sql: "INSERT INTO pastas (nome, cpf, cargo, setor, captacao, parceiro, modulo, criado_em, data_nascimento, faltas) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)", args: [nome, cpf||"", cargo||"", setor||"", captacao||"", parceiro||"", mod, dn, ft] });
    res.status(201).json({ id: Number(ins.lastInsertRowid), nome, cpf: cpf||"", cargo: cargo||"", setor: setor||"", captacao: captacao||"", parceiro: parceiro||"", modulo: mod, data_nascimento: dn, faltas: ft });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/pastas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await db.execute({ sql: "SELECT nome_arquivo FROM arquivos WHERE pasta_id = ?", args: [id] });
    r.rows.forEach(row => { const fp = path.join(UPLOADS_DIR, row.nome_arquivo); if (fs.existsSync(fp)) fs.unlinkSync(fp); });
    await db.batch([
      { sql: "DELETE FROM arquivos        WHERE pasta_id = ?", args: [id] },
      { sql: "DELETE FROM subpastas       WHERE pasta_id = ?", args: [id] },
      { sql: "DELETE FROM registros_falta WHERE pasta_id = ?", args: [id] },
      { sql: "DELETE FROM pastas          WHERE id = ?",       args: [id] },
    ], "write");
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/pastas/:id", async (req, res) => {
  try {
    const { nome, cpf, cargo, setor, captacao, parceiro, modulo, data_nascimento, faltas } = req.body;
    const { id } = req.params;
    const mod = modulo || "RH";
    if (mod === "RH") {
      if (!nome || !cpf || !cargo || !setor) return res.status(400).json({ error: "Dados incompletos para RH" });
    } else {
      if (!nome)     return res.status(400).json({ error: "Nome e obrigatorio" });
      if (!cpf)      return res.status(400).json({ error: "CPF e obrigatorio" });
      if (!captacao) return res.status(400).json({ error: "Forma de captacao e obrigatoria" });
      if (!parceiro) return res.status(400).json({ error: "Parceiro e obrigatorio" });
    }
    const dn = data_nascimento || "";
    const ft = parseInt(faltas, 10) || 0;
    await db.execute({ sql: "UPDATE pastas SET nome=?, cpf=?, cargo=?, setor=?, captacao=?, parceiro=?, modulo=?, data_nascimento=?, faltas=? WHERE id=?", args: [nome, cpf||"", cargo||"", setor||"", captacao||"", parceiro||"", mod, dn, ft, id] });
    res.json({ id: Number(id), nome, cpf: cpf||"", cargo: cargo||"", setor: setor||"", captacao: captacao||"", parceiro: parceiro||"", modulo: mod, data_nascimento: dn, faltas: ft });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Rotas: Arquivos de uma pasta ──────────────────────────────────────────────
app.get("/pastas/:id/arquivos", async (req, res) => {
  try {
    const r = await db.execute({ sql: "SELECT * FROM arquivos WHERE pasta_id = ? AND subpasta_id IS NULL ORDER BY criado_em ASC", args: [req.params.id] });
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/pastas/:id/arquivos", upload.array("arquivos"), async (req, res) => {
  try {
    const pastaId = req.params.id;
    const files   = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    const inseridos = await Promise.all(files.map(async (file) => {
      const ins = await db.execute({ sql: "INSERT INTO arquivos (pasta_id, nome_original, nome_arquivo, mimetype, tamanho) VALUES (?, ?, ?, ?, ?)", args: [pastaId, file.originalname, file.filename, file.mimetype, file.size] });
      return { id: Number(ins.lastInsertRowid), pasta_id: Number(pastaId), nome_original: file.originalname, nome_arquivo: file.filename, mimetype: file.mimetype, tamanho: file.size, url: "/uploads/" + file.filename };
    }));
    res.status(201).json(inseridos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/pastas/:id/arquivos/:arquivoId", async (req, res) => {
  try {
    const { arquivoId } = req.params;
    const r = await db.execute({ sql: "SELECT nome_arquivo FROM arquivos WHERE id = ?", args: [arquivoId] });
    if (!r.rows[0]) return res.status(404).json({ error: "Arquivo nao encontrado" });
    const filePath = path.join(UPLOADS_DIR, r.rows[0].nome_arquivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.execute({ sql: "DELETE FROM arquivos WHERE id = ?", args: [arquivoId] });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Rotas: Subpastas ──────────────────────────────────────────────────────────
app.get("/pastas/:id/subpastas", async (req, res) => {
  try {
    const r = await db.execute({ sql: "SELECT * FROM subpastas WHERE pasta_id = ? ORDER BY criado_em ASC", args: [req.params.id] });
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/pastas/:id/subpastas", async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || nome.trim() === "") return res.status(400).json({ error: "Nome da subpasta e obrigatorio" });
    const ins = await db.execute({ sql: "INSERT INTO subpastas (pasta_id, nome) VALUES (?, ?)", args: [req.params.id, nome.trim()] });
    res.status(201).json({ id: Number(ins.lastInsertRowid), pasta_id: Number(req.params.id), nome: nome.trim() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/pastas/:id/subpastas/:subId", async (req, res) => {
  try {
    const { subId } = req.params;
    const r = await db.execute({ sql: "SELECT nome_arquivo FROM arquivos WHERE subpasta_id = ?", args: [subId] });
    r.rows.forEach(row => { const fp = path.join(UPLOADS_DIR, row.nome_arquivo); if (fs.existsSync(fp)) fs.unlinkSync(fp); });
    await db.batch([
      { sql: "DELETE FROM arquivos  WHERE subpasta_id = ?", args: [subId] },
      { sql: "DELETE FROM subpastas WHERE id = ?",          args: [subId] },
    ], "write");
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/subpastas/:id", async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || nome.trim() === "") return res.status(400).json({ error: "Nome e obrigatorio" });
    await db.execute({ sql: "UPDATE subpastas SET nome = ? WHERE id = ?", args: [nome.trim(), req.params.id] });
    res.json({ id: Number(req.params.id), nome: nome.trim() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Rotas: Arquivos de uma subpasta ───────────────────────────────────────────
app.get("/subpastas/:id/arquivos", async (req, res) => {
  try {
    const r = await db.execute({ sql: "SELECT * FROM arquivos WHERE subpasta_id = ? ORDER BY criado_em ASC", args: [req.params.id] });
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/subpastas/:id/arquivos", upload.array("arquivos"), async (req, res) => {
  try {
    const subpastaId = req.params.id;
    const files      = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    const subR = await db.execute({ sql: "SELECT pasta_id FROM subpastas WHERE id = ?", args: [subpastaId] });
    if (!subR.rows[0]) return res.status(404).json({ error: "Subpasta nao encontrada" });
    const pastaId = subR.rows[0].pasta_id;
    const inseridos = await Promise.all(files.map(async (file) => {
      const ins = await db.execute({ sql: "INSERT INTO arquivos (pasta_id, subpasta_id, nome_original, nome_arquivo, mimetype, tamanho) VALUES (?, ?, ?, ?, ?, ?)", args: [pastaId, subpastaId, file.originalname, file.filename, file.mimetype, file.size] });
      return { id: Number(ins.lastInsertRowid), pasta_id: pastaId, subpasta_id: Number(subpastaId), nome_original: file.originalname, nome_arquivo: file.filename, mimetype: file.mimetype, tamanho: file.size, url: "/uploads/" + file.filename };
    }));
    res.status(201).json(inseridos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/arquivos/:id/mover", async (req, res) => {
  try {
    const { subpasta_id } = req.body;
    await db.execute({ sql: "UPDATE arquivos SET subpasta_id = ? WHERE id = ?", args: [subpasta_id ?? null, req.params.id] });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Fallback SPA ───────────────────────────────────────────────────────────────
app.get(/^\/.*/, (req, res) => {
  if (req.method === "GET" && req.headers.accept && req.headers.accept.includes("text/html"))
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  return res.status(404).end();
});

// ── Inicia servidor ────────────────────────────────────────────────────────────
inicializarDB()
  .then(() => {
    const server = http.createServer(app);
    server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch(err => { console.error("Falha ao inicializar banco:", err); process.exit(1); });
