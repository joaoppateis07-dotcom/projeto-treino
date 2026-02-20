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
    //onde as psatas criadas vao ficar
    const listaPastas = document.getElementById('listaPastas');

    //validaçao dos campos a serem preenchidos para criar as pastas
    btnCriarPasta.addEventListener('click', () => {

        if (NomePasta.value.trim() == '') {
           alert('preencha o nome da pasta');
           return
       }
        if (CpfFFuncionario.value.trim() == '') {
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

        const nome = NomePasta.value.trim();
        const cpf = CpfFFuncionario.value.trim();
        const cargo = Cargo.value;
        const setor = Setor.value;

        //cria um elemento para a nova pasta
        const novaPasta = document.createElement('div');

         
        //as informações que vao aparecer na pasta criada
        novaPasta.textContent = nome + ' - ' + cpf + ' - ' + cargo + ' - ' + setor;

        //adiciona a nova pasta a lista de pastas
        novaPasta.classList.add('pasta');

        
        listaPastas.appendChild(novaPasta);

        
        NomePasta.value = '';
        CpfFFuncionario.value = '';
        Cargo.value = '__';
        Setor.value = '__';
        
        modalNovaPasta.classList.add('hidden');

    });
}
