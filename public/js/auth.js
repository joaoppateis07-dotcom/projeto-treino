// Verificação adicional no cliente: limpa qualquer dados locais
// (A proteção REAL é no servidor via cookie autenticado)
(function() {
  localStorage.removeItem('logado');
  localStorage.removeItem('savedCredentials');
})();
