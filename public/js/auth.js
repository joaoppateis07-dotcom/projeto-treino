// Garante que somente usuários autenticados vejam o app
(function() {
  // Verifica cookie 'logado' ou fallback para localStorage
  const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('logado='));
  const hasStorage = localStorage.getItem('logado') === 'true';
  if (!hasCookie && !hasStorage) {
    window.location = "../index.html";
  }
})();
