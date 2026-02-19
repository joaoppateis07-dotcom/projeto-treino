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

    const btnCriarPasta = document.getElementById('btnCriarPasta');
    const NomePasta = document.getElementById('inputNomePasta');
    const CpfFFuncionario = document.getElementById('inputCpfFFuncionario');
    const Cargo = document.getElementById('selectCargo');
    const Setor = document.getElementById('selectSetor');

    btnCriarPasta.addEventListener('click', () => {
       if (NomePasta.value == '') {
           alert('preencha o nome da pasta');
           return
       }
        if (CpfFFuncionario.value == '') {
            alert('preencha o cpf do funcionário');
            return
        }
        if (Cargo.value == '__') {
            alert('selecione um cargo');
            return
        }
        if (Setor.value == '__') {
            alert('selecione um setor');
            return
        }
        alert('pasta criada com sucesso!!')
        NomePasta.value = '';
        CpfFFuncionario.value = '';
        Cargo.value = '__';
        Setor.value = '__';
        modalNovaPasta.classList.add('hidden');

    });
}
