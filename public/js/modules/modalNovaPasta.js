export function initModalNovaPasta() {
    const btnNovaPasta = document.getElementById('btnNovaPasta');
    const modalNovaPasta = document.getElementById('modalNovaPasta');
    const btnCancelarPasta = document.getElementById('btnCancelarPasta');

    btnNovaPasta.addEventListener('click', () => {
        modalNovaPasta.classList.remove('hidden');
    });

    btnCancelarPasta.addEventListener('click', () => {
        modalNovaPasta.classList.add('hidden');
    });
}
