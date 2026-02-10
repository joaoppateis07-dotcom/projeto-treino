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

// Middleware para proteger /html/*: verifica cookie antes de servir
app.use('/html', (req, res, next) => {
  const cookie = req.headers.cookie || '';
  const isLoggedIn = cookie.split(';').some(c => c.trim().startsWith('logado='));
  if (!isLoggedIn) {
    console.log('Acesso negado a /html (sem autenticação):', req.path);
    return res.redirect('/');
  }
  next();
});

// Serve arquivos estáticos da pasta public
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
    // Pequeno delay para permitir que o navegador ofereça salvar a senha
    return res.status(200).send(`
      <html>
        <head><meta charset='UTF-8'><title>Autenticando...</title></head>
        <body style='display:none'>
          <script>setTimeout(() => window.location='/html/app.html', 500);</script>
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
