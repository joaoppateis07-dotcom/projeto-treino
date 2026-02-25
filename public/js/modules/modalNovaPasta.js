export function initModalNovaPasta() {
    const pastas = [];
    let pastaSelecionada = null;

    // ── Modal Nova Pasta ──────────────────────────────────────────
    const btnNovaPasta     = document.getElementById('btnNovaPasta');
    const modalNovaPasta   = document.getElementById('modalNovaPasta');
    const btnCancelarPasta = document.getElementById('btnCancelarPasta');

    btnNovaPasta.addEventListener('click', () => modalNovaPasta.classList.remove('hidden'));
    btnCancelarPasta.addEventListener('click', () => modalNovaPasta.classList.add('hidden'));

    const btnCriarPasta    = document.getElementById('btnCriarPasta');
    const NomePasta        = document.getElementById('inputNomePasta');
    const CpfFFuncionario  = document.getElementById('inputCpfFFuncionario');
    const Cargo            = document.getElementById('selectCargo');
    const Setor            = document.getElementById('selectSetor');
    const listaPastas      = document.getElementById('listaPastas');

    // ── Modal Upload / Detalhes da Pasta ─────────────────────────
    const modalUpload      = document.getElementById('modalUpload');
    const uploadInfoNome   = document.getElementById('uploadInfoNome');
    const uploadInfoCpf    = document.getElementById('uploadInfoCpf');
    const uploadInfoCargo  = document.getElementById('uploadInfoCargo');
    const uploadInfoSetor  = document.getElementById('uploadInfoSetor');
    const btnEditar        = document.getElementById('btnEditar');
    const editFormUpload   = document.getElementById('editFormUpload');
    const editNome         = document.getElementById('editNome');
    const editCpf          = document.getElementById('editCpf');
    const editCargo        = document.getElementById('editCargo');
    const editSetor        = document.getElementById('editSetor');
    const btnSalvarEdicao  = document.getElementById('btnSalvarEdicao');
    const btnCancelarEdicao= document.getElementById('btnCancelarEdicao');
    const uploadArea       = document.getElementById('uploadArea');
    const fileInput        = document.getElementById('fileInput');
    const btnUploadMais    = document.getElementById('btnUploadMais');
    const btnSair          = document.getElementById('btnSair');
    const listaArquivos    = document.getElementById('listaArquivos');
    const uploadAreaTexto  = document.getElementById('uploadAreaTexto');

    // Abre o modal de detalhes da pasta correta pelo ID
    function abrirModalPasta(dados) {
        pastaSelecionada = dados;
        uploadInfoNome.textContent  = 'Nome: '   + dados.nome;
        uploadInfoCpf.textContent   = 'CPF: '    + dados.cpf;
        uploadInfoCargo.textContent = 'Cargo: '  + dados.cargo;
        uploadInfoSetor.textContent = 'Setor: '  + dados.setor;
        editFormUpload.classList.add('hidden');
        modalUpload.classList.remove('hidden');
    }

    function fecharModalUpload() {
        modalUpload.classList.add('hidden');
        listaArquivos.innerHTML = '';
        uploadAreaTexto.style.display = '';
    }

    // Botão Editar – abre/fecha o formulário de edição
    btnEditar.addEventListener('click', () => {
        if (editFormUpload.classList.contains('hidden')) {
            editNome.value  = pastaSelecionada.nome;
            editCpf.value   = pastaSelecionada.cpf;
            editCargo.value = pastaSelecionada.cargo;
            editSetor.value = pastaSelecionada.setor;
            editFormUpload.classList.remove('hidden');
        } else {
            editFormUpload.classList.add('hidden');
        }
    });

    btnCancelarEdicao.addEventListener('click', () => editFormUpload.classList.add('hidden'));

    btnSalvarEdicao.addEventListener('click', () => {
        if (editNome.value.trim() === '')  { alert('Preencha o nome');       return; }
        if (editCpf.value.trim() === '')   { alert('Preencha o CPF');        return; }
        if (editCargo.value === '__')      { alert('Selecione um cargo');     return; }
        if (editSetor.value === '__')      { alert('Selecione um setor');     return; }

        const id    = pastaSelecionada.id;
        const nome  = editNome.value.trim();
        const cpf   = editCpf.value.trim();
        const cargo = editCargo.value;
        const setor = editSetor.value;

        fetch('/pastas/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cpf, cargo, setor })
        })
        .then(r => r.json())
        .then(() => {
            // Atualiza array local
            const idx = pastas.findIndex(p => p.id == id);
            if (idx !== -1) {
                pastas[idx] = { ...pastas[idx], nome, cpf, cargo, setor };
            }
            pastaSelecionada = { ...pastaSelecionada, nome, cpf, cargo, setor };

            // Atualiza o card na lista
            const pastaEl = listaPastas.querySelector(`[data-id="${id}"]`);
            if (pastaEl) pastaEl.textContent = nome + ' - ' + cpf + ' - ' + cargo + ' - ' + setor;

            // Atualiza o cabeçalho do modal
            uploadInfoNome.textContent  = 'Nome: '  + nome;
            uploadInfoCpf.textContent   = 'CPF: '   + cpf;
            uploadInfoCargo.textContent = 'Cargo: ' + cargo;
            uploadInfoSetor.textContent = 'Setor: ' + setor;

            editFormUpload.classList.add('hidden');
        })
        .catch(err => {
            console.error('Erro ao editar pasta:', err);
            alert('Erro ao salvar. Tente novamente.');
        });
    });

    // Área de upload – clicar na área branca ou no botão Upload+
    uploadArea.addEventListener('click', () => fileInput.click());
    btnUploadMais.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

    fileInput.addEventListener('change', () => {
        Array.from(fileInput.files).forEach(file => {
            uploadAreaTexto.style.display = 'none';
            const item = document.createElement('div');
            item.classList.add('arquivo-item');
            item.textContent = file.name;
            listaArquivos.appendChild(item);
        });
        fileInput.value = '';
    });

    // Botão Sair e clique no backdrop
    btnSair.addEventListener('click', fecharModalUpload);
    modalUpload.addEventListener('click', (e) => { if (e.target === modalUpload) fecharModalUpload(); });

    // ── Criar nova pasta ─────────────────────────────────────────
    btnCriarPasta.addEventListener('click', () => {
        if (NomePasta.value.trim() === '')      { alert('Preencha o nome da pasta');       return; }
        if (CpfFFuncionario.value.trim() === '') { alert('Preencha o CPF do funcionário'); return; }
        if (Cargo.value === '__')               { alert('Selecione um cargo');             return; }
        if (Setor.value === '__')               { alert('Selecione um setor');             return; }

        const nome  = NomePasta.value.trim();
        const cpf   = CpfFFuncionario.value.trim();
        const cargo = Cargo.value;
        const setor = Setor.value;

        fetch('/pastas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cpf, cargo, setor })
        })
        .then(r => r.json())
        .then(data => {
            pastas.push(data);
            const novaPasta = criarCardPasta(data);
            listaPastas.appendChild(novaPasta);

            NomePasta.value = '';
            CpfFFuncionario.value = '';
            Cargo.value = '__';
            Setor.value = '__';
            modalNovaPasta.classList.add('hidden');
        })
        .catch(err => {
            console.error('Erro ao criar pasta:', err);
            alert('Erro ao criar pasta. Tente novamente.');
        });
    });

    // ── Helper: cria o card de pasta com o listener de clique ────
    function criarCardPasta(dados) {
        const el = document.createElement('div');
        el.textContent = dados.nome + ' - ' + dados.cpf + ' - ' + dados.cargo + ' - ' + dados.setor;
        el.classList.add('pasta');
        el.dataset.id = dados.id;
        el.addEventListener('click', () => {
            const id = el.dataset.id;
            const d  = pastas.find(p => p.id == id);
            abrirModalPasta(d);
        });
        return el;
    }

    // ── Carregar pastas ao iniciar ────────────────────────────────
    function carregarPastas() {
        fetch('/pastas')
            .then(r => r.json())
            .then(data => {
                data.forEach(pasta => {
                    pastas.push(pasta);
                    listaPastas.appendChild(criarCardPasta(pasta));
                });
            })
            .catch(err => console.error('Erro ao carregar pastas:', err));
    }
    carregarPastas();}