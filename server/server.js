const sqlite3 = require("sqlite3").verbose();
new sqlite3.Database("db.sqlite");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// logging simples de todas as requisições para diagnóstico
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Parse application/x-www-form-urlencoded (forms)
app.use(express.urlencoded({ extended: false }));

// MIDDLEWARE DE PROTEÇÃO: deve vir ANTES do static para bloquear /html/*
app.use((req, res, next) => {
  // Bloqueia acesso a /html/* se não estiver autenticado
  if (req.path.startsWith('/html/') || req.path === '/html') {
    const cookie = req.headers.cookie || '';
    const isLoggedIn = cookie.split(';').some(c => c.trim().startsWith('logado='));
    if (!isLoggedIn) {
      console.log('Acesso negado a', req.path, '(sem autenticação)');
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res.status(401).redirect('/?unauthorized=1');
    }
    // Usuário autenticado: evita cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }
  next();
});

// Serve arquivos estáticos (css, js, assets, HTML) - protegido acima para /html/*
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rota para processar login via form POST
app.post('/login', (req, res) => {
  console.log('POST /login body:', req.body);
  const username = req.body.username || req.body.usuario || '';
  const password = req.body.password || req.body.senha || '';

  // Credenciais fixas (apenas para demo local)
  if (username === 'Maria Pateis' && password === 'UpConsult@25') {
    // Define cookie com opções para melhorar compatibilidade com gerenciador de senhas
    res.cookie('logado', 'true', {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      path: '/',
      sameSite: 'lax'
    });
    // Delay maior para gerenciador de senhas oferecer salvar (1.2s)
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset='UTF-8'>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Autenticando...</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
            .loading { text-align: center; }
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #333; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loading">
            <div class="spinner"></div>
            <p>Autenticando...</p>
          </div>
          <script>setTimeout(() => { window.location='/html/app.html'; }, 1200);</script>
        </body>
      </html>
    `);
  }

  // Falha: redireciona para a página de login com query
  return res.redirect('/?login=failed');
});

// Aceita GET /login (redireciona para /) para evitar "Cannot POST /login" quando o usuário navega direto
app.get('/login', (req, res) => {
  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('logado', { path: '/' });
  res.redirect('/');
});

// Rota de diagnóstico simples
app.get('/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Rota fallback: index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});
