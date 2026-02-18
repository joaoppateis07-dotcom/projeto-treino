const btnNovaPasta = document.getElementById('btnNovaPasta');
const modalNovaPasta = document.getElementById('modalNovaPasta')
const btnCancelarPasta = document.getElementById('btnCancelarPasta');
btnCancelarPasta.addEventListener('click', () => {
    modalNovaPasta.classList.add('hidden');
});
btnNovaPasta.addEventListener('click', () => {
    modalNovaPasta.classList.remove('hidden');
});