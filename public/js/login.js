
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