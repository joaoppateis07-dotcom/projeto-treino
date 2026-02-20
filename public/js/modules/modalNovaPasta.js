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

    //validaçao dos campos a serem preenchidos para criar as pastas
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
      //onde as psatas criadas vao ficar
    const listaPastas = document.getElementById('listaPastas');
    const novaPasta = document.createElement('div');
    //as informações que vao aparecer na pasta crada
    novaPasta.textContent = `${NomePasta.value} - ${CpfFFuncionario.value} - ${Cargo.value} - ${Setor.value}`;
    novaPasta.classList.add('pasta');
    //adiciona a nova pasta a lista de pastas
    listaPastas.appendChild(novaPasta);
}
