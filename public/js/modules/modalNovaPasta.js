export function initModalNovaPasta() {
    const pastas = [];
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

        fetch('/pastas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome, cpf, cargo, setor })
        })
        .then(response => response.json())
        .then(data => {
            //cria um elemento para a nova pasta
            const novaPasta = document.createElement('div');

            pastas.push(data);
            //as informações que vao aparecer na pasta criada
            novaPasta.textContent = nome + ' - ' + cpf + ' - ' + cargo + ' - ' + setor;
            novaPasta.dataset.id = data.id; // ✅ CORREÇÃO: definir o ID

            //adiciona a nova pasta a lista de pastas
            novaPasta.classList.add('pasta');

            novaPasta.addEventListener('click' , () => {
                const id = novaPasta.dataset.id;
                const dados = pastas.find(p => p.id == id);
                alert(
                    'Nome: ' + dados.nome + '\n' +
                    'Cpf: ' + dados.cpf + "\n" +
                    'Cargo: ' + dados.cargo + '\n' +
                    'Setor: ' + dados.setor
                );
            });
            listaPastas.appendChild(novaPasta);

            
            NomePasta.value = '';
            CpfFFuncionario.value = '';
            Cargo.value = '__';
            Setor.value = '__';
            
            modalNovaPasta.classList.add('hidden');
        })
        .catch(error => {
            console.error('Erro ao criar pasta:', error);
            alert('Erro ao criar pasta. Tente novamente.');
        });

    });

    
    function carregarPastas() {
        fetch('/pastas')
            .then(response => response.json())
            .then(data => {
                data.forEach(pasta => {
                    pastas.push(pasta);
                    const novaPasta = document.createElement('div');
                    novaPasta.textContent = pasta.nome + ' - ' + pasta.cpf + ' - ' + pasta.cargo + ' - ' + pasta.setor;
                    novaPasta.classList.add('pasta');
                    
                    novaPasta.dataset.id = pasta.id;

                    novaPasta.addEventListener('click' , () => {
                        const id = novaPasta.dataset.id; // ✅ CORREÇÃO: pegar ID no momento certo
                        const dados = pastas.find(p => p.id == id);
                        alert(
                            'Nome: ' + dados.nome + '\n' +
                            'Cpf: ' + dados.cpf + "\n" +
                            'Cargo: ' + dados.cargo + '\n' +
                            'Setor: ' + dados.setor
                        );
                    });
                    
                    listaPastas.appendChild(novaPasta);
                });
            })
            .catch(error => console.error('Erro ao carregar pastas:', error));
    }
    carregarPastas();
}


