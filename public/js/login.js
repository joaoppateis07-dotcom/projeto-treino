
console.log("script carregou");

// Mostra mensagem de falha quando a query ?login=failed estiver presente
(function () {
  const params = new URLSearchParams(window.location.search);
  const msg = document.getElementById('msg');
  if (params.get('login') === 'failed' && msg) {
    msg.textContent = 'Usuário ou senha incorretos.';
  }
})();

// NOTA: não previnimos o submit para permitir que o navegador
// detecte o envio do formulário e ofereça salvar as credenciais
// (Google Password Manager). A validação é feita no servidor via POST /login.

(function () {
  const form = document.getElementById('entrar');
  const usuario = document.getElementById('usuario');
  const senha = document.getElementById('senha');
  const remember = document.getElementById('remember');

  // Carrega credenciais salvas (se houver)
  try {
    const saved = localStorage.getItem('savedCredentials');
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj.username && usuario) usuario.value = obj.username;
      if (obj.password && senha) senha.value = obj.password;
      if (obj.remember && remember) remember.checked = true;
    }
  } catch (e) {
    console.warn('Erro ao carregar credenciais salvas', e);
  }

  // Ao submeter, salva ou remove as credenciais conforme o checkbox
  if (form) {
    form.addEventListener('submit', function () {
      try {
        if (remember && remember.checked) {
          const toSave = {
            username: usuario ? usuario.value : '',
            password: senha ? senha.value : '',
            remember: true,
          };
          localStorage.setItem('savedCredentials', JSON.stringify(toSave));
        } else {
          localStorage.removeItem('savedCredentials');
        }
      } catch (e) {
        console.warn('Erro ao salvar credenciais', e);
      }
      // Não previne o envio do formulário: deixa o navegador oferecer salvar senha
    });
  }
})();