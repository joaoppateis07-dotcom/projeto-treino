// ============================================================
// modalNovaPasta.js  –  Módulo principal das pastas
//
// Responsabilidades deste arquivo:
//  - Abrir e fechar o modal de criação de nova pasta
//  - Validar e enviar os dados da nova pasta para o servidor
//  - Carregar as pastas salvas no banco ao abrir a página
//  - Abrir o modal de detalhes/upload ao clicar em uma pasta
//  - Editar as informações de uma pasta já existente
//  - Adicionar arquivos à pasta e permitir abri-los
// ============================================================
export function initModalNovaPasta(options = {}) {
    const isComercial = options.isComercial || false;
    const moduloAtual = isComercial ? 'COMERCIAL' : 'RH';

    // Lista em memória com todas as pastas carregadas/criadas nesta sessão.
    // Usamos ela para encontrar os dados de uma pasta pelo ID sem ir ao servidor.
    const pastas = [];

    // Guarda qual pasta está aberta no momento (ao clicar numa pasta).
    // Usada ao editar ou exibir as informações no modal de upload.
    let pastaSelecionada = null;

    // ──────────────────────────────────────────────────────────────
    // REFERÊNCIAS DO MODAL "NOVA PASTA" (formulário de criação)
    // ──────────────────────────────────────────────────────────────

    // Botão "+ NOVA PASTA" na topbar – abre o modal de criação
    const btnNovaPasta     = document.getElementById('btnNovaPasta');
    // O modal de criação de pasta (overlay escuro + caixa de formulário)
    const modalNovaPasta   = document.getElementById('modalNovaPasta');
    // Botão "CANCELAR" dentro do modal de criação
    const btnCancelarPasta = document.getElementById('btnCancelarPasta');

    // Abre o modal removendo a classe 'hidden'
    btnNovaPasta.addEventListener('click', () => modalNovaPasta.classList.remove('hidden'));
    // Fecha o modal adicionando a classe 'hidden' de volta
    btnCancelarPasta.addEventListener('click', () => modalNovaPasta.classList.add('hidden'));

    // Botão "CRIAR" – confirma a criação da pasta
    const btnCriarPasta    = document.getElementById('btnCriarPasta');
    // Campo de texto para o nome do funcionário (nome da pasta)
    const NomePasta        = document.getElementById('inputNomePasta');
    // Campo de texto para o CPF do funcionário
    const CpfFFuncionario  = document.getElementById('inputCpfFFuncionario');
    // Selects comerciais
    const Captacao         = document.getElementById('selectCaptacao');
    const Parceiro        = document.getElementById('selectParceiro');
    // Select para o cargo do funcionário (RH)
    const Cargo            = document.getElementById('selectCargo');
    // Select para o setor do funcionário (RH)
    const Setor            = document.getElementById('selectSetor');
    // Campos RH: data de nascimento e faltas
    const DataNascimento   = document.getElementById('inputDataNascimento');
    const FaltasInput      = document.getElementById('inputFaltas');
    // Container onde os cards das pastas criadas serão exibidos na tela
    const listaPastas      = document.getElementById('listaPastas');

    // ── Barra de pesquisa ─────────────────────────────────────────────
    const inputPesquisa    = document.getElementById('inputPesquisa');
    const btnLimparPesquisa= document.getElementById('btnLimparPesquisa');
    const semResultados    = document.getElementById('semResultados');
    const termoPesquisado  = document.getElementById('termoPesquisado');

    // Filtra os cards de pasta visíveis com base no texto digitado
    function filtrarPastas() {
        const termo = inputPesquisa.value.trim().toLowerCase();

        // Mostra/esconde o botão de limpar
        btnLimparPesquisa.classList.toggle('hidden', termo === '');

        let visiveis = 0;
        document.querySelectorAll('#listaPastas .pasta').forEach(card => {
            const pasta = pastas.find(p => p.id == card.dataset.id);
            if (!pasta) return;
            const bate = pasta.nome.toLowerCase().includes(termo) ||
                         (pasta.cpf && pasta.cpf.toLowerCase().includes(termo)) ||
                         (pasta.cpf && pasta.cpf.replace(/\D/g,'').includes(termo.replace(/\D/g,'')));
            card.style.display = bate ? '' : 'none';
            if (bate) visiveis++;
        });

        // Exibe mensagem de "não encontrado" somente quando há termo e resultado zero
        if (termo !== '' && visiveis === 0) {
            termoPesquisado.textContent = inputPesquisa.value.trim();
            semResultados.classList.remove('hidden');
        } else {
            semResultados.classList.add('hidden');
        }
    }

    inputPesquisa.addEventListener('input', filtrarPastas);

    // Botão ✕: limpa o campo e restaura todos os cards
    btnLimparPesquisa.addEventListener('click', () => {
        inputPesquisa.value = '';
        filtrarPastas();
        inputPesquisa.focus();
    });

    // ──────────────────────────────────────────────────────────────
    // REFERÊNCIAS DO MODAL "UPLOAD / DETALHES DA PASTA"
    // (abre ao clicar em uma pasta existente)
    // ──────────────────────────────────────────────────────────────

    // O modal completo de detalhes e upload da pasta
    const modalUpload      = document.getElementById('modalUpload');
    // Spans no cabeçalho do modal que exibem as infos da pasta aberta
    const uploadInfoNome   = document.getElementById('uploadInfoNome');
    const uploadInfoCpf    = document.getElementById('uploadInfoCpf');
    const uploadInfoCargo  = document.getElementById('uploadInfoCargo');
    const uploadInfoSetor  = document.getElementById('uploadInfoSetor');
    const uploadInfoCaptacao = document.getElementById('uploadInfoCaptacao');
    const uploadInfoParceiro = document.getElementById('uploadInfoParceiro');
    const uploadInfoDataNascimento = document.getElementById('uploadInfoDataNascimento');
    const uploadInfoFaltas         = document.getElementById('uploadInfoFaltas');
    // Botão azul "Editar" no cabeçalho do modal – mostra/esconde o form de edição
    const btnEditar        = document.getElementById('btnEditar');
    // Formulário de edição (nome, CPF, cargo, setor) – fica oculto até clicar em Editar
    const editFormUpload   = document.getElementById('editFormUpload');
    // Campos do formulário de edição
    const editNome         = document.getElementById('editNome');
    const editCpf          = document.getElementById('editCpf');
    const editCargo        = document.getElementById('editCargo');
    const editSetor        = document.getElementById('editSetor');
    const editCaptacao     = document.getElementById('editCaptacao');
    const editParceiro     = document.getElementById('editParceiro');
    const editDataNascimento = document.getElementById('editDataNascimento');
    const editFaltasInput    = document.getElementById('editFaltas');
    // Botão "SALVAR" no formulário de edição
    const btnSalvarEdicao  = document.getElementById('btnSalvarEdicao');
    // Botão "CANCELAR" no formulário de edição
    const btnCancelarEdicao= document.getElementById('btnCancelarEdicao');
    // Botão vermelho "🗑 Excluir pasta" no rodapé do formulário de edição
    const btnExcluirPasta  = document.getElementById('btnExcluirPasta');
    // Área branca onde os arquivos enviados são listados
    const uploadArea       = document.getElementById('uploadArea');
    // Input de arquivo oculto – ativado pelo texto ou pelo botão Upload+
    const fileInput        = document.getElementById('fileInput');
    // Botão "Upload+" no rodapé do modal – abre o seletor de arquivos
    const btnUploadMais    = document.getElementById('btnUploadMais');
    // Botão "Concluído" no rodapé do modal – fecha o modal
    const btnSair                = document.getElementById('btnSair');
    // Botão "Descartar alterações" – habilitado apenas quando há alterações pendentes
    const btnDescartarAlteracoes = document.getElementById('btnDescartarAlteracoes');
    // Área de confirmação de descarte (inline no footer)
    const confirmDescarte        = document.getElementById('confirmDescarte');
    const btnConfirmarDescarte   = document.getElementById('btnConfirmarDescarte');
    const btnCancelarDescarte    = document.getElementById('btnCancelarDescarte');
    // Div onde os cards dos arquivos adicionados são inseridos
    const listaArquivos    = document.getElementById('listaArquivos');
    // Texto instrucional dentro da área de upload ("Clique em Upload+...")
    const uploadAreaTexto  = document.getElementById('uploadAreaTexto');

    // ──────────────────────────────────────────────────────────────
    // REFERÊNCIAS DA SEÇÃO SUBPASTAS
    // ──────────────────────────────────────────────────────────────

    // Seção inteira das subpastas (inclui cabeçalho, form e lista)
    const subpastasSection     = document.getElementById('subpastasSection');
    // Botão "+ Nova subpasta"
    const btnNovaSubpasta      = document.getElementById('btnNovaSubpasta');
    // Formulário inline de criação de nova subpasta
    const novaSubpastaForm     = document.getElementById('novaSubpastaForm');
    // Campo de texto onde o usuário digita o nome da nova subpasta
    const inputNomeSubpasta    = document.getElementById('inputNomeSubpasta');
    // Botão "Criar" dentro do formulário inline
    const btnCriarSubpasta     = document.getElementById('btnCriarSubpasta');
    // Botão "✕" para cancelar a criação
    const btnCancelarSubpasta  = document.getElementById('btnCancelarSubpasta');
    // Container onde os cards das subpastas são renderizados
    const listaSubpastas       = document.getElementById('listaSubpastas');
    // Barra de navegação de subpasta (breadcrumb) – fica oculta na raiz
    const breadcrumb           = document.getElementById('breadcrumb');
    // Texto descritivo do breadcrumb (ex: "Maria > Documentos")
    const breadcrumbTexto      = document.getElementById('breadcrumbTexto');
    // Botão "← Voltar" que sai da subpasta e volta à raiz
    const btnVoltarRaiz        = document.getElementById('btnVoltarRaiz');

    // Toast de Desfazer (elemento fixo na tela)
    const toastUndo      = document.getElementById('toastUndo');
    const toastMensagem  = document.getElementById('toastMensagem');
    const btnDesfazer    = document.getElementById('btnDesfazer');

    // Estado atual da navegação: null = raiz da pasta, objeto = dentro de uma subpasta
    // { id, nome } da subpasta atualmente aberta
    let subpastaAtual = null;
    // Rastreia se o usuário realizou alguma alteração no modal (upload, exclusão, edição, etc.)
    let alteracoes = false;

    // Ativa o botão "Descartar alterações" ao registrar uma mudança
    function marcarAlteracao() {
        alteracoes = true;
        btnDescartarAlteracoes.disabled = false;
    }

    // ──────────────────────────────────────────────────────────────
    // MÁSCARA DE CPF
    // Formata a string removendo não-dígitos e aplicando 000.000.000-00
    // ──────────────────────────────────────────────────────────────
    function mascaraCpf(v) {
        if (!v) return '';
        return v
            .replace(/\D/g, '')           // remove tudo que não é dígito
            .slice(0, 11)                 // limita a 11 dígitos
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    function onCpfInput(e) {
        const inicio = e.target.selectionStart;
        const antes  = e.target.value.length;
        e.target.value = mascaraCpf(e.target.value);
        // Mantém cursor na posição correta após reformatar
        const diff = e.target.value.length - antes;
        e.target.setSelectionRange(inicio + diff, inicio + diff);
    }

    if (CpfFFuncionario) CpfFFuncionario.addEventListener('input', onCpfInput);
    if (editCpf) editCpf.addEventListener('input', onCpfInput);

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: abrirModalPasta
    // Preenche o cabeçalho do modal com os dados da pasta clicada
    // e exibe o modal de upload/detalhes
    // ──────────────────────────────────────────────────────────────
    function abrirModalPasta(dados) {
        // Salva a pasta atual para usar em edição e upload
        pastaSelecionada = dados;

        // Preenche os spans do cabeçalho com as informações da pasta
        uploadInfoNome.textContent  = 'Nome: '   + dados.nome;
        if (!isComercial) {
            uploadInfoCpf.textContent   = 'CPF: '    + mascaraCpf(dados.cpf);
            uploadInfoCargo.textContent = 'Cargo: '  + dados.cargo;
            uploadInfoSetor.textContent = 'Setor: '  + dados.setor;
            if (uploadInfoDataNascimento) uploadInfoDataNascimento.textContent = dados.data_nascimento ? 'Nasc: ' + dados.data_nascimento : '';
            if (uploadInfoFaltas) uploadInfoFaltas.textContent = dados.faltas != null ? 'Faltas: ' + dados.faltas : '';
        } else {
            if (uploadInfoCpf) uploadInfoCpf.textContent = 'CPF: ' + mascaraCpf(dados.cpf);
            if (uploadInfoCaptacao) uploadInfoCaptacao.textContent = 'Captação: ' + (dados.captacao || '');
            if (uploadInfoParceiro) uploadInfoParceiro.textContent = 'Parceiro: ' + (dados.parceiro || '');
        }

        // Garante que o formulário de edição começa fechado
        editFormUpload.classList.add('hidden');

        // Reseta o estado de alterações a cada nova abertura de pasta
        alteracoes = false;
        btnDescartarAlteracoes.disabled = true;
        confirmDescarte.classList.add('hidden');

        // Exibe o modal removendo a classe 'hidden'
        modalUpload.classList.remove('hidden');

        // Carrega os arquivos salvos no servidor para esta pasta (raiz)
        carregarArquivos(dados.id);
        // Carrega as subpastas desta pasta
        carregarSubpastas(dados.id);
    }

    function fecharModalUpload() {
        modalUpload.classList.add('hidden');
        // Reseta estado de alterações
        alteracoes = false;
        btnDescartarAlteracoes.disabled = true;
        confirmDescarte.classList.add('hidden');
        // Remove destaque de seleção da pasta que estava aberta
        document.querySelectorAll('.pasta.selecionada').forEach(p => p.classList.remove('selecionada'));
        document.querySelectorAll('.subpasta-card.selecionada').forEach(c => c.classList.remove('selecionada'));
        listaArquivos.innerHTML = '';
        listaSubpastas.innerHTML = '';
        listaSubpastas.style.display = ''; // Garante que não fica oculto para a próxima abertura
        uploadAreaTexto.style.display = '';
        // Reseta estado de navegação para a raiz
        subpastaAtual = null;
        breadcrumb.classList.add('hidden');
        subpastasSection.classList.remove('hidden');
        novaSubpastaForm.classList.add('hidden');
        // Os arquivos e subpastas continuam salvos no servidor
    }

    // Verifica se ambas as listas estão vazias e exibe/esconde o texto instrucional
    function verificarTextoVazio() {
        const vazio = listaArquivos.children.length === 0 && listaSubpastas.children.length === 0;
        uploadAreaTexto.style.display = vazio ? '' : 'none';
    }

    // ──────────────────────────────────────────────────────────────
    // BOTÃO EDITAR – Alterna a visibilidade do formulário de edição.
    // Se estiver oculto: preenche os campos com os dados atuais e exibe.
    // Se estiver visível: apenas esconde novamente.
    // ──────────────────────────────────────────────────────────────
    btnEditar.addEventListener('click', () => {
        if (editFormUpload.classList.contains('hidden')) {
            // Preenche os campos com os dados atuais da pasta selecionada
            editNome.value  = pastaSelecionada.nome;
            if (!isComercial) {
                editCpf.value   = mascaraCpf(pastaSelecionada.cpf);
                editCargo.value = pastaSelecionada.cargo;
                editSetor.value = pastaSelecionada.setor;
                if (editDataNascimento) editDataNascimento.value = pastaSelecionada.data_nascimento || '';
                if (editFaltasInput)    editFaltasInput.value    = pastaSelecionada.faltas != null ? pastaSelecionada.faltas : 0;
            } else {
                if (editCpf) editCpf.value = mascaraCpf(pastaSelecionada.cpf);
                if (editCaptacao) editCaptacao.value = pastaSelecionada.captacao || '__';
                if (editParceiro) editParceiro.value = pastaSelecionada.parceiro || '__';
            }
            editFormUpload.classList.remove('hidden');
        } else {
            // Fecha o formulário de edição sem salvar
            editFormUpload.classList.add('hidden');
        }
    });

    // Cancela a edição e fecha o formulário sem fazer nenhuma alteração
    btnCancelarEdicao.addEventListener('click', () => editFormUpload.classList.add('hidden'));

    // ──────────────────────────────────────────────────────────────
    // BOTÃO SALVAR EDIÇÃO
    // Valida os campos, envia PUT para o servidor e atualiza
    // o card na lista e o cabeçalho do modal com os novos dados
    // ──────────────────────────────────────────────────────────────
    btnSalvarEdicao.addEventListener('click', () => {
        // Validação: nenhum campo pode estar vazio ou sem seleção
        if (editNome.value.trim() === '')  { alert('Preencha o nome');       return; }
        
        let cpf = '';
        let cargo = '';
        let setor = '';
        let captacao = '';
        let parceiro = '';
        let data_nascimento = '';
        let faltas = 0;

        if (!isComercial) {
            if (editCpf.value.replace(/\D/g,'').length < 11) { alert('Preencha o CPF completo (000.000.000-00)'); return; }
            if (editCargo.value === '__')      { alert('Selecione um cargo');     return; }
            if (editSetor.value === '__')      { alert('Selecione um setor');     return; }
            cpf = editCpf.value.trim();
            cargo = editCargo.value;
            setor = editSetor.value;
            data_nascimento = editDataNascimento ? editDataNascimento.value : '';
            faltas = editFaltasInput ? parseInt(editFaltasInput.value, 10) || 0 : 0;
        } else {
            if (editCpf && editCpf.value.replace(/\D/g,'').length < 11) { alert('Preencha o CPF completo (000.000.000-00)'); return; }
            if (editCaptacao && editCaptacao.value === '__') { alert('Selecione a forma de captação'); return; }
            if (editParceiro && editParceiro.value === '__') { alert('Selecione o parceiro'); return; }
            cpf = editCpf ? editCpf.value.trim() : '';
            captacao = editCaptacao ? editCaptacao.value : '';
            parceiro = editParceiro ? editParceiro.value : '';
        }

        // Captura o ID da pasta que está sendo editada
        const id    = pastaSelecionada.id;
        const nome  = editNome.value.trim();

        // Envia a requisição PUT para o servidor atualizar no banco de dados
        fetch('/pastas/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cpf, cargo, setor, captacao, parceiro, modulo: moduloAtual, data_nascimento, faltas })
        })
        .then(r => r.json())
        .then(() => {
            // Atualiza os dados no array local (sem precisar recarregar a página)
            const idx = pastas.findIndex(p => p.id == id);
            if (idx !== -1) {
                pastas[idx] = { ...pastas[idx], nome, cpf, cargo, setor, captacao, parceiro, data_nascimento, faltas };
            }
            // Atualiza a variável da pasta atualmente selecionada
            pastaSelecionada = { ...pastaSelecionada, nome, cpf, cargo, setor, captacao, parceiro, data_nascimento, faltas };

            // Atualiza o card na lista de pastas com os novos dados
            const pastaEl = listaPastas.querySelector(`[data-id="${id}"]`);
            if (pastaEl) {
                const nomeSpan  = pastaEl.querySelector('.pasta-nome');
                const infoSpan  = pastaEl.querySelector('.pasta-info');
                if (nomeSpan) nomeSpan.textContent = nome;
                if (infoSpan) {
                    if (isComercial) {
                        infoSpan.textContent = [
                            cpf      ? 'CPF: ' + mascaraCpf(cpf)   : '',
                            captacao ? 'Captação: ' + captacao      : '',
                            parceiro ? 'Parceiro: ' + parceiro      : ''
                        ].filter(Boolean).join('  ·  ');
                    } else {
                        infoSpan.textContent = [
                            cpf   ? mascaraCpf(cpf) : '',
                            cargo ? cargo           : '',
                            setor ? setor           : '',
                            data_nascimento ? 'Nasc: ' + data_nascimento : '',
                            faltas > 0      ? 'Faltas: ' + faltas        : ''
                        ].filter(Boolean).join('  ·  ');
                    }
                }
            }

            // Atualiza os spans do cabeçalho do modal com os novos valores
            uploadInfoNome.textContent  = 'Nome: '  + nome;
            if (!isComercial) {
                uploadInfoCpf.textContent   = 'CPF: '   + mascaraCpf(cpf);
                uploadInfoCargo.textContent = 'Cargo: ' + cargo;
                uploadInfoSetor.textContent = 'Setor: ' + setor;
                if (uploadInfoDataNascimento) uploadInfoDataNascimento.textContent = data_nascimento ? 'Nasc: ' + data_nascimento : '';
                if (uploadInfoFaltas) uploadInfoFaltas.textContent = 'Faltas: ' + faltas;
            } else {
                if (uploadInfoCpf) uploadInfoCpf.textContent = 'CPF: ' + mascaraCpf(cpf);
                if (uploadInfoCaptacao) uploadInfoCaptacao.textContent = 'Captação: ' + captacao;
                if (uploadInfoParceiro) uploadInfoParceiro.textContent = 'Parceiro: ' + parceiro;
            }

            // Fecha o formulário de edição após salvar com sucesso
            editFormUpload.classList.add('hidden');
            marcarAlteracao();
        })
        .catch(err => {
            console.error('Erro ao editar pasta:', err);
            alert('Erro ao salvar. Tente novamente.');
        });
    });

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: mostrarToastUndo
    // Exibe a notificação de desfazer na parte inferior da tela.
    // Parâmetros:
    //  - mensagem  : texto exibido no toast
    //  - onDesfazer: função chamada se o usuário clicar em "Desfazer"
    //  - onConfirmar: função chamada quando o tempo encerra (exclusão real)
    //  - duracao   : milissegundos até confirmar (padrão 5000 ms)
    // ──────────────────────────────────────────────────────────────
    let _toastTimer = null;

    function mostrarToastUndo(mensagem, onDesfazer, onConfirmar, duracao = 5000) {
        // Cancela timer anterior se já houver um toast em andamento
        if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }

        toastMensagem.textContent = mensagem;
        toastUndo.classList.remove('hidden');
        // (Re)inicia a animação da barra de progresso
        const barra = document.getElementById('toastBarra');
        barra.style.transition = 'none';
        barra.style.width = '100%';
        // Pequeno delay para o browser "resetar" a transição
        requestAnimationFrame(() => requestAnimationFrame(() => {
            barra.style.transition = `width ${duracao}ms linear`;
            barra.style.width = '0%';
        }));

        // Handler do botão Desfazer – limpa o anterior para evitar duplicatas
        const novoDesfazer = () => {
            clearTimeout(_toastTimer);
            _toastTimer = null;
            toastUndo.classList.add('hidden');
            btnDesfazer.removeEventListener('click', novoDesfazer);
            onDesfazer();
        };
        btnDesfazer.removeEventListener('click', btnDesfazer._handler || (() => {}));
        btnDesfazer._handler = novoDesfazer;
        btnDesfazer.addEventListener('click', novoDesfazer);

        // Timer que efetiva a exclusão após o prazo
        _toastTimer = setTimeout(() => {
            _toastTimer = null;
            toastUndo.classList.add('hidden');
            btnDesfazer.removeEventListener('click', novoDesfazer);
            onConfirmar();
        }, duracao);
    }

    // ──────────────────────────────────────────────────────────────
    // BOTÃO EXCLUIR PASTA
    // Pede confirmação, fecha o modal e exibe o toast de Desfazer.
    // Se o usuário não desfizer em 5 s, envia DELETE ao servidor.
    // ──────────────────────────────────────────────────────────────
    btnExcluirPasta.addEventListener('click', () => {
        if (!confirm('Excluir a pasta de "' + pastaSelecionada.nome + '"?\nEsta ação pode ser desfeita nos próximos 5 segundos.')) return;

        const dadosSalvos = { ...pastaSelecionada };
        const id = dadosSalvos.id;

        // Remove o card da tela imediatamente (esconde antes de confirmar)
        const cardEl = listaPastas.querySelector('[data-id="' + id + '"]');
        if (cardEl) cardEl.style.display = 'none';

        // Fecha o modal para dar foco ao toast
        fecharModalUpload();

        mostrarToastUndo(
            'Pasta "' + dadosSalvos.nome + '" excluída.',
            // Desfazer: restaura o card e os dados
            () => {
                if (cardEl) cardEl.style.display = '';
            },
            // Confirmar: envia DELETE ao servidor e remove definitivamente
            () => {
                fetch('/pastas/' + id, { method: 'DELETE' })
                    .then(r => r.json())
                    .then(() => {
                        // Remove do array em memória
                        const idx = pastas.findIndex(p => p.id == id);
                        if (idx !== -1) pastas.splice(idx, 1);
                        // Remove o card do DOM
                        if (cardEl) cardEl.remove();
                        // Atualiza os cards de resumo com o novo total
                        atualizarStats();
                    })
                    .catch(err => {
                        console.error('Erro ao excluir pasta:', err);
                        // Em caso de erro, restaura o card
                        if (cardEl) cardEl.style.display = '';
                    });
            }
        );
    });

    // ──────────────────────────────────────────────────────────
    // FUNÇÃO: carregarArquivos
    // Busca no servidor todos os arquivos de uma pasta pelo ID
    // e renderiza-os na área de upload do modal.
    // ──────────────────────────────────────────────────────────
    function carregarArquivos(pastaId) {
        fetch('/pastas/' + pastaId + '/arquivos')
            .then(r => r.json())
            .then(arquivos => {
                arquivos.forEach(arq => {
                    // Monta a URL pública do arquivo a partir do nome salvo no disco
                    const url = '/uploads/' + arq.nome_arquivo;
                    renderizarCardArquivo(arq.id, arq.nome_original, url);
                });
            })
            .catch(err => console.error('Erro ao carregar arquivos:', err));
    }

    // ──────────────────────────────────────────────────────────
    // FUNÇÃO: renderizarCardArquivo
    // Cria e insere na tela o card visual de um arquivo.
    // Recebe: id do arquivo no banco, nome original e URL pública.
    // Botões: "Abrir ↗" (nova aba) e "✕" (excluir do servidor).
    // ──────────────────────────────────────────────────────────
    function renderizarCardArquivo(arquivoId, nomeOriginal, url) {
        const item = document.createElement('div');
        item.classList.add('arquivo-item');
        item.dataset.arquivoId = arquivoId;

        // Emoji baseado na extensão do arquivo
        const icon = document.createElement('span');
        icon.classList.add('arquivo-icon');
        icon.textContent = getIcone(nomeOriginal);

        // Nome do arquivo
        const nomeEl = document.createElement('span');
        nomeEl.classList.add('arquivo-nome');
        nomeEl.textContent = nomeOriginal;

        // Botão "Abrir ↗" – abre o arquivo em nova aba
        const abrir = document.createElement('span');
        abrir.classList.add('arquivo-abrir');
        abrir.textContent = 'Abrir ↗';
        abrir.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(url, '_blank');
        });

        // Botão "✕" – exclui o arquivo do servidor e remove o card da tela
        const excluir = document.createElement('span');
        excluir.classList.add('arquivo-excluir');
        excluir.textContent = '✕';
        excluir.title = 'Excluir arquivo';
        excluir.addEventListener('click', (e) => {
            e.stopPropagation();

            // Esconde o card imediatamente e oferece toast de desfazer
            item.style.display = 'none';

            mostrarToastUndo(
                'Arquivo "' + nomeOriginal + '" excluído.',
                // Desfazer: reexibe o card
                () => { item.style.display = ''; },
                // Confirmar: de fato remove do servidor e do DOM
                () => {
                    fetch('/pastas/' + pastaSelecionada.id + '/arquivos/' + arquivoId, { method: 'DELETE' })
                        .then(r => r.json())
                        .then(() => {
                            item.remove();
                            verificarTextoVazio(); // Mostra texto se ambas as listas ficarem vazias
                            marcarAlteracao();
                        })
                        .catch(err => {
                            console.error('Erro ao excluir arquivo:', err);
                            // Em caso de erro, restaura o card
                            item.style.display = '';
                        });
                },
                5000
            );
        });

        // Monta o card: ícone + nome + botão abrir + [↩ Raiz se dentro de subpasta] + botão excluir
        item.appendChild(icon);
        item.appendChild(nomeEl);
        item.appendChild(abrir);

        // Botão "↩ Raiz" – aparece apenas quando o arquivo está dentro de uma subpasta
        if (subpastaAtual) {
            const moverRaiz = document.createElement('span');
            moverRaiz.classList.add('arquivo-mover-raiz');
            moverRaiz.textContent = '↩ Raiz';
            moverRaiz.title = 'Mover de volta para a raiz da pasta';
            moverRaiz.addEventListener('click', (e) => {
                e.stopPropagation();
                fetch('/arquivos/' + arquivoId + '/mover', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subpasta_id: null })
                })
                .then(r => r.json())
                .then(() => {
                    item.remove();
                    verificarTextoVazio();
                    marcarAlteracao();
                })
                .catch(err => console.error('Erro ao mover arquivo para raiz:', err));
            });
            item.appendChild(moverRaiz);
        }

        item.appendChild(excluir);

        // Clicar em qualquer parte do card também abre o arquivo
        item.addEventListener('click', () => window.open(url, '_blank'));

        // ── Arrastar este arquivo para dentro de uma subpasta ──────────────
        // O ID do arquivo é passado via dataTransfer para a zona de drop da subpasta
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/arquivo-id', String(arquivoId));
            item.classList.add('arrastando');
        });
        item.addEventListener('dragend', () => item.classList.remove('arrastando'));

        listaArquivos.appendChild(item);
        verificarTextoVazio(); // Esconde o texto instrucional assim que um item é adicionado
    }

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: carregarSubpastas
    // Busca todas as subpastas de uma pasta no servidor e renderiza
    // cada card na seção de subpastas do modal.
    // ──────────────────────────────────────────────────────────────
    function carregarSubpastas(pastaId) {
        listaSubpastas.innerHTML = ''; // Limpa antes de repopular
        fetch('/pastas/' + pastaId + '/subpastas')
            .then(r => r.json())
            .then(subs => subs.forEach(s => renderizarCardSubpasta(s.id, s.nome)))
            .catch(err => console.error('Erro ao carregar subpastas:', err));
    }

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: renderizarCardSubpasta
    // Cria o card visual de uma subpasta:
    //  - Zona de drop para arquivos existentes (drag de card) e do SO (OS drag)
    //  - Clique abre a visualização da subpasta
    //  - Botão ✕ exclui a subpasta e todos os seus arquivos
    // ──────────────────────────────────────────────────────────────
    function renderizarCardSubpasta(subId, subNome) {
        const card = document.createElement('div');
        card.classList.add('subpasta-card');
        card.dataset.subId = subId;

        // Ícone de pasta + nome
        const icone = document.createElement('span');
        icone.classList.add('subpasta-icon');
        icone.textContent = '📁';

        const nomeEl = document.createElement('span');
        nomeEl.classList.add('subpasta-nome');
        nomeEl.textContent = subNome;

        // Botão ✕ para excluir a subpasta
        const excluir = document.createElement('button');
        excluir.classList.add('subpasta-excluir');
        excluir.textContent = '✕';
        excluir.title = 'Excluir subpasta';
        excluir.addEventListener('click', (e) => {
            e.stopPropagation();

            // Esconde o card imediatamente antes do toast
            card.style.display = 'none';

            mostrarToastUndo(
                'Subpasta "' + subNome + '" excluída.',
                // Desfazer: restaura o card
                () => { card.style.display = ''; },
                // Confirmar: exclui no servidor
                () => {
                    fetch('/pastas/' + pastaSelecionada.id + '/subpastas/' + subId, { method: 'DELETE' })
                        .then(r => r.json())
                        .then(() => {
                            card.remove();
                            verificarTextoVazio();
                            marcarAlteracao();
                        })
                        .catch(err => {
                            console.error('Erro ao excluir subpasta:', err);
                            card.style.display = '';
                        });
                }
            );
        });

        // ── Zona de drop para arquivos arrastados da lista da raiz ──
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', (e) => {
            // Só remove o highlight se o mouse saiu do card de verdade
            if (!card.contains(e.relatedTarget)) card.classList.remove('drag-over');
        });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');

            // 1) Arquivo vindo do explorador do SO (arquivos externos)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const formData = new FormData();
                Array.from(e.dataTransfer.files).forEach(f => formData.append('arquivos', f));
                fetch('/subpastas/' + subId + '/arquivos', { method: 'POST', body: formData })
                    .then(r => r.json())
                    .then(() => {
                        // Atualiza contador do card
                        atualizarContagemSubpasta(card, subId);
                        marcarAlteracao();
                    })
                    .catch(err => console.error('Erro ao dropar arquivo do SO:', err));
                return;
            }

            // 2) Arquivo vindo de outro card da lista (drag interno)
            const arquivoId = e.dataTransfer.getData('text/arquivo-id');
            if (!arquivoId) return;

            fetch('/arquivos/' + arquivoId + '/mover', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subpasta_id: Number(subId) })
            })
            .then(r => r.json())
            .then(() => {
                // Remove o card do arquivo da lista atual
                const itemEl = listaArquivos.querySelector('[data-arquivo-id="' + arquivoId + '"]');
                if (itemEl) {
                    itemEl.remove();
                    verificarTextoVazio(); // Mostra texto se ambas as listas ficarem vazias
                }
                // Atualiza o contador no card da subpasta destino
                atualizarContagemSubpasta(card, subId);
                marcarAlteracao();
            })
            .catch(err => console.error('Erro ao mover arquivo:', err));
        });

        // 1 clique – seleciona o card (tira seleção das outras subpastas)
        card.addEventListener('click', (e) => {
            if (e.target === excluir || e.target === renomear || e.target === renameInput) return;
            document.querySelectorAll('.subpasta-card.selecionada').forEach(c => c.classList.remove('selecionada'));
            card.classList.add('selecionada');
        });

        // 2 cliques – abre a visualização da subpasta
        card.addEventListener('dblclick', (e) => {
            if (e.target === excluir || e.target === renomear || e.target === renameInput) return;
            document.querySelectorAll('.subpasta-card.selecionada').forEach(c => c.classList.remove('selecionada'));
            abrirSubpasta(subId, subNome);
        });

        // ── Rename inline ──────────────────────────────────────────────
        // Input oculto que substitui o nomeEl durante a edição
        const renameInput = document.createElement('input');
        renameInput.classList.add('subpasta-rename-input');
        renameInput.style.display = 'none';
        renameInput.maxLength = 50;

        // Botão ✏ no canto superior esquerdo do card – ativa o modo de edição
        const renomear = document.createElement('button');
        renomear.classList.add('subpasta-renomear');
        renomear.textContent = '✏';
        renomear.title = 'Renomear subpasta';

        let _renameAtivo = false;

        renomear.addEventListener('click', (e) => {
            e.stopPropagation();
            _renameAtivo = true;
            nomeEl.style.display = 'none';
            renameInput.value = nomeEl.textContent;
            renameInput.style.display = '';
            renomear.style.display = 'none';
            renameInput.focus();
            renameInput.select();
        });

        function cancelarRenomear() {
            renameInput.style.display = 'none';
            nomeEl.style.display = '';
            renomear.style.display = '';
        }

        function confirmarRenomear() {
            const novoNome = renameInput.value.trim();
            cancelarRenomear();
            if (!novoNome || novoNome === nomeEl.textContent) return;
            fetch('/subpastas/' + subId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: novoNome })
            })
            .then(r => r.json())
            .then(data => {
                nomeEl.textContent = data.nome;
                // Atualiza o breadcrumb se esta subpasta estiver aberta
                if (subpastaAtual && subpastaAtual.id == subId) {
                    subpastaAtual.nome = data.nome;
                    breadcrumbTexto.textContent = pastaSelecionada.nome + '  /  📂 ' + data.nome;
                }
                marcarAlteracao();
            })
            .catch(err => console.error('Erro ao renomear subpasta:', err));
        }

        renameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')  { e.preventDefault(); _renameAtivo = false; confirmarRenomear(); }
            if (e.key === 'Escape') { _renameAtivo = false; cancelarRenomear(); }
        });
        renameInput.addEventListener('blur', () => {
            if (_renameAtivo) { _renameAtivo = false; cancelarRenomear(); }
        });

        card.appendChild(icone);
        card.appendChild(nomeEl);
        card.appendChild(renameInput);
        card.appendChild(renomear);
        card.appendChild(excluir);
        listaSubpastas.appendChild(card);
        verificarTextoVazio(); // Esconde o texto quando a primeira subpasta é adicionada

        // Busca a contagem inicial de arquivos para exibir no card
        atualizarContagemSubpasta(card, subId);
    }

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: atualizarContagemSubpasta
    // Busca quantos arquivos existem na subpasta e atualiza o badge
    // de contagem no card visual.
    // ──────────────────────────────────────────────────────────────
    function atualizarContagemSubpasta(card, subId) {
        fetch('/subpastas/' + subId + '/arquivos')
            .then(r => r.json())
            .then(arqs => {
                // Remove badge anterior se existir
                const badgeAntigo = card.querySelector('.subpasta-badge');
                if (badgeAntigo) badgeAntigo.remove();

                if (arqs.length > 0) {
                    const badge = document.createElement('span');
                    badge.classList.add('subpasta-badge');
                    badge.textContent = arqs.length;
                    card.appendChild(badge);
                }
            })
            .catch(() => {});
    }

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: abrirSubpasta
    // Navega para dentro de uma subpasta:
    //  - Esconde a seção de subpastas
    //  - Mostra o breadcrumb com botão de voltar
    //  - Limpa e carrega os arquivos desta subpasta
    // ──────────────────────────────────────────────────────────────
    function abrirSubpasta(subId, subNome) {
        subpastaAtual = { id: subId, nome: subNome };

        // Troca a seção de subpastas pelo breadcrumb
        subpastasSection.classList.add('hidden');
        breadcrumb.classList.remove('hidden');
        breadcrumbTexto.textContent = pastaSelecionada.nome + '  /  📂 ' + subNome;

        // Limpa a lista de arquivos, esconde cards de subpastas, carrega os da subpasta
        listaArquivos.innerHTML = '';
        listaSubpastas.style.display = 'none'; // Esconde subpastas enquanto navega dentro de uma
        verificarTextoVazio();

        fetch('/subpastas/' + subId + '/arquivos')
            .then(r => r.json())
            .then(arqs => {
                arqs.forEach(arq =>
                    renderizarCardArquivo(arq.id, arq.nome_original, '/uploads/' + arq.nome_arquivo)
                );
            })
            .catch(err => console.error('Erro ao carregar arquivos da subpasta:', err));
    }

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: voltarParaRaiz
    // Sai da subpasta e volta à visão da raiz:
    //  - Reexibe a seção de subpastas
    //  - Esconde o breadcrumb
    //  - Recarrega os arquivos raiz da pasta original
    // ──────────────────────────────────────────────────────────────
    function voltarParaRaiz() {
        subpastaAtual = null;
        breadcrumb.classList.add('hidden');
        subpastasSection.classList.remove('hidden');

        listaArquivos.innerHTML = '';
        listaSubpastas.style.display = ''; // Restaura os cards de subpastas na área
        verificarTextoVazio();
        carregarArquivos(pastaSelecionada.id);
    }

    // Botão "← Voltar" no breadcrumb
    btnVoltarRaiz.addEventListener('click', voltarParaRaiz);

    // ── Listeners para criação de nova subpasta ──────────────────

    // Mostra o formulário inline de nova subpasta
    btnNovaSubpasta.addEventListener('click', () => {
        novaSubpastaForm.classList.remove('hidden');
        inputNomeSubpasta.focus();
    });

    // Cancela a criação e esconde o formulário
    btnCancelarSubpasta.addEventListener('click', () => {
        novaSubpastaForm.classList.add('hidden');
        inputNomeSubpasta.value = '';
    });

    // Confirma a criação da subpasta via POST no servidor
    btnCriarSubpasta.addEventListener('click', () => {
        const nome = inputNomeSubpasta.value.trim();
        if (!nome) { alert('Digite o nome da subpasta'); return; }

        fetch('/pastas/' + pastaSelecionada.id + '/subpastas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        })
        .then(r => r.json())
        .then(sub => {
            renderizarCardSubpasta(sub.id, sub.nome);
            inputNomeSubpasta.value = '';
            novaSubpastaForm.classList.add('hidden');
            marcarAlteracao();
        })
        .catch(err => {
            console.error('Erro ao criar subpasta:', err);
            alert('Erro ao criar subpasta.');
        });
    });

    // Criar subpasta ao pressionar Enter no campo de nome
    inputNomeSubpasta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnCriarSubpasta.click();
        if (e.key === 'Escape') btnCancelarSubpasta.click();
    });

    // Botão Upload+ no rodapé – sempre abre o seletor de arquivos,
    // mesmo quando já existem arquivos na lista
    btnUploadMais.addEventListener('click', () => fileInput.click());

    // Clicar no texto instrucional da área vazia também abre o seletor
    uploadAreaTexto.addEventListener('click', () => fileInput.click());

    // EVENTO: seleção de arquivos
    // Disparado quando o usuário escolhe arquivos no seletor do SO.
    // Envia os arquivos para o servidor via FormData (multipart/form-data).
    // O servidor salva em disco e registra no banco de dados.
    fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files);
        if (files.length === 0) return;

        // Monta o FormData com todos os arquivos selecionados
        const formData = new FormData();
        files.forEach(f => formData.append('arquivos', f));

        // A rota de upload muda dependendo se estamos na raiz ou dentro de uma subpasta
        const uploadUrl = subpastaAtual
            ? '/subpastas/' + subpastaAtual.id + '/arquivos'
            : '/pastas/' + pastaSelecionada.id + '/arquivos';

        // Envia para o servidor – o browser define o Content-Type automaticamente
        fetch(uploadUrl, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(inseridos => {
            // Para cada arquivo salvo, renderiza o card na lista
            inseridos.forEach(arq => {
                renderizarCardArquivo(arq.id, arq.nome_original, '/uploads/' + arq.nome_arquivo);
            });
            marcarAlteracao();
        })
        .catch(err => {
            console.error('Erro ao fazer upload:', err);
            alert('Erro ao enviar arquivo. Tente novamente.');
        });

        // Limpa o input para permitir selecionar o mesmo arquivo novamente
        fileInput.value = '';
    });

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: getIcone
    // Retorna um emoji adequado para cada tipo de arquivo,
    // baseado na extensão do nome do arquivo.
    // Se a extensão não for reconhecida, retorna 📎 (clipe genérico).
    // ──────────────────────────────────────────────────────────────
    function getIcone(nome) {
        const ext = nome.split('.').pop().toLowerCase(); // Pega a extensão em minúsculo
        const mapa = {
            pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
            ppt: '📋', pptx: '📋', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
            gif: '🖼️', mp4: '🎬', mp3: '🎵', zip: '🗜️', rar: '🗜️'
        };
        return mapa[ext] || '📎'; // Retorna o ícone correspondente ou clipe genérico
    }

    // Botão "Concluído" fecha e limpa o modal
    btnSair.addEventListener('click', fecharModalUpload);

    // Botão "Descartar alterações" mostra a confirmação inline no footer
    btnDescartarAlteracoes.addEventListener('click', () => {
        confirmDescarte.classList.remove('hidden');
    });

    // "Sim, descartar" → fecha o modal (dados já persistidos no servidor não são afetados)
    btnConfirmarDescarte.addEventListener('click', () => fecharModalUpload());

    // "Não" → cancela: esconde a confirmação e mantém o modal aberto
    btnCancelarDescarte.addEventListener('click', () => confirmDescarte.classList.add('hidden'));

    // Clicar no fundo escuro (backdrop) fora da caixa do modal também fecha
    modalUpload.addEventListener('click', (e) => { if (e.target === modalUpload) fecharModalUpload(); });

    // ──────────────────────────────────────────────────────────────
    // BOTÃO CRIAR PASTA
    // Valida os campos, envia POST para o servidor criar a pasta
    // no banco de dados e adiciona o card na tela
    // ──────────────────────────────────────────────────────────────
    btnCriarPasta.addEventListener('click', () => {
        // Validação: todos os campos são obrigatórios
        if (NomePasta.value.trim() === '')      { alert('Preencha o nome da pasta');       return; }
        
        let cpf = '';
        let cargo = '';
        let setor = '';
        let captacao = '';
        let parceiro = '';
        let data_nascimento = '';
        let faltas = 0;

        if (!isComercial) {
            if (CpfFFuncionario.value.replace(/\D/g,'').length < 11) { alert('Preencha o CPF completo (000.000.000-00)'); return; }
            if (Cargo.value === '__')               { alert('Selecione um cargo');             return; }
            if (Setor.value === '__')               { alert('Selecione um setor');             return; }
            cpf = CpfFFuncionario.value.trim();
            cargo = Cargo.value;
            setor = Setor.value;
            data_nascimento = DataNascimento ? DataNascimento.value : '';
            faltas = FaltasInput ? parseInt(FaltasInput.value, 10) || 0 : 0;
        } else {
            if (CpfFFuncionario && CpfFFuncionario.value.replace(/\D/g,'').length < 11) { alert('Preencha o CPF completo (000.000.000-00)'); return; }
            if (Captacao && Captacao.value === '__') { alert('Selecione a forma de captação'); return; }
            if (Parceiro && Parceiro.value === '__') { alert('Selecione o parceiro'); return; }
            cpf = CpfFFuncionario ? CpfFFuncionario.value.trim() : '';
            captacao = Captacao ? Captacao.value : '';
            parceiro = Parceiro ? Parceiro.value : '';
        }

        // Captura os valores dos campos
        const nome  = NomePasta.value.trim();

        // Envia POST para o servidor salvar a nova pasta no banco SQLite
        fetch('/pastas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cpf, cargo, setor, captacao, parceiro, modulo: moduloAtual, data_nascimento, faltas })
        })
        .then(r => r.json())
        .then(data => {
            // Adiciona a nova pasta no array local com o ID gerado pelo banco
            pastas.push(data);

            // Cria e insere o card visual na lista de pastas da tela
            const novaPasta = criarCardPasta(data);
            listaPastas.appendChild(novaPasta);

            // Limpa os campos do formulário para uma próxima criação
            NomePasta.value = '';
            if (!isComercial) {
                CpfFFuncionario.value = '';
                Cargo.value = '__';
                Setor.value = '__';
                if (DataNascimento) DataNascimento.value = '';
                if (FaltasInput)    FaltasInput.value    = '0';
            } else {
                if (CpfFFuncionario) CpfFFuncionario.value = '';
                if (Captacao) Captacao.value = '__';
                if (Parceiro) Parceiro.value = '__';
            }

            // Fecha o modal de criação
            modalNovaPasta.classList.add('hidden');
            // Atualiza os cards de resumo com o novo total
            atualizarStats();
        })
        .catch(err => {
            console.error('Erro ao criar pasta:', err);
            alert('Erro ao criar pasta. Tente novamente.');
        });
    });

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: criarCardPasta
    // Recebe os dados de uma pasta e cria o elemento HTML (div.pasta)
    // que aparece na tela principal.
    // — Estrutura visual: ícone + nome em destaque + linha de meta-info
    // — Um clique abre diretamente o modal (sem precisar de duplo clique)
    // ──────────────────────────────────────────────────────────────
    function criarCardPasta(dados) {
        const el = document.createElement('div');
        el.classList.add('pasta');
        // Guarda o ID da pasta no atributo data-id para identificar qual abrir
        el.dataset.id = dados.id;

        // ── Ícone da pasta ──────────────────────────────────────────
        const icone = document.createElement('div');
        icone.classList.add('pasta-icone');
        icone.textContent = isComercial ? '👤' : '📁';

        // ── Nome em destaque ─────────────────────────────────────────
        const nomeEl = document.createElement('div');
        nomeEl.classList.add('pasta-nome');
        nomeEl.textContent = dados.nome || '(sem nome)';

        // ── Linha de informações secundárias ─────────────────────────
        const infoEl = document.createElement('div');
        infoEl.classList.add('pasta-info');
        if (isComercial) {
            // CPF + captação + parceiro para o módulo Comercial
            const cpfFmt = mascaraCpf(dados.cpf);
            infoEl.textContent = [
                cpfFmt         ? 'CPF: ' + cpfFmt              : '',
                dados.captacao ? 'Captação: ' + dados.captacao : '',
                dados.parceiro ? 'Parceiro: ' + dados.parceiro : ''
            ].filter(Boolean).join('  ·  ');
        } else {
            // CPF + cargo + setor para o módulo RH
            infoEl.textContent = [
                dados.cpf   ? mascaraCpf(dados.cpf) : '',
                dados.cargo ? dados.cargo           : '',
                dados.setor ? dados.setor           : '',
                dados.data_nascimento ? 'Nasc: ' + dados.data_nascimento : '',
                dados.faltas > 0      ? 'Faltas: ' + dados.faltas        : ''
            ].filter(Boolean).join('  ·  ');
        }

        el.appendChild(icone);

        // ── Wrapper de texto ─────────────────────────────────────────
        const textoWrap = document.createElement('div');
        textoWrap.classList.add('pasta-texto');
        textoWrap.appendChild(nomeEl);
        textoWrap.appendChild(infoEl);
        el.appendChild(textoWrap);

        // ── Interação: clique único abre o modal ─────────────────────
        // (duplo clique era confuso e não funciona bem em touch)
        el.addEventListener('click', () => {
            // Tira seleção das outras pastas e marca esta como selecionada
            document.querySelectorAll('.pasta.selecionada').forEach(p => p.classList.remove('selecionada'));
            el.classList.add('selecionada');

            // Busca os dados completos no array em memória pelo ID
            const d = pastas.find(p => p.id == el.dataset.id);
            if (d) abrirModalPasta(d);
        });

        return el;
    }

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: carregarPastas
    // Carregada uma única vez ao abrir a página.
    // Busca todas as pastas salvas no banco de dados via GET /pastas
    // e cria os cards na tela para cada uma delas.
    // ──────────────────────────────────────────────────────────────
    function carregarPastas() {
        fetch('/pastas?modulo=' + moduloAtual)
            .then(r => r.json())
            .then(data => {
                data.forEach((pasta, i) => {
                    pastas.push(pasta); // Adiciona no array local
                    const card = criarCardPasta(pasta);
                    // Entrada escalonada: cada card aparece 60ms depois do anterior
                    card.style.animationDelay = (i * 60) + 'ms';
                    listaPastas.appendChild(card); // Cria o card na tela
                });
            })
            .catch(err => console.error('Erro ao carregar pastas:', err));
    }

    // Inicia o carregamento das pastas assim que o módulo é inicializado
    carregarPastas();

    // ──────────────────────────────────────────────────────────────
    // FUNÇÃO: atualizarStats
    // Busca o total de pastas e as criadas hoje no servidor
    // e preenche os cards de resumo no topo da página.
    // Funciona apenas quando os elementos existem no HTML
    // (Módulo Comercial) — no módulo RH os elementos não existem
    // e a função retorna silenciosamente.
    // ──────────────────────────────────────────────────────────────
    function atualizarStats() {
        // Tenta os IDs do módulo RH (3 cards)
        const elTotalRH   = document.getElementById('cardTotalFuncionarios');
        const elAniver    = document.getElementById('cardAniversarios');
        const elFaltas    = document.getElementById('cardFaltas');
        // Tenta os IDs do módulo Comercial (2 cards)
        const elTotal     = document.getElementById('cardTotalPastas');
        const elHoje      = document.getElementById('cardHojePastas');
        if (!elTotalRH && !elAniver && !elFaltas && !elTotal && !elHoje) return;

        fetch('/pastas/stats?modulo=' + moduloAtual)
            .then(r => r.json())
            .then(data => {
                // Função auxiliar: atualiza valor e dispara animação "pop"
                function setValor(el, valor) {
                    if (!el) return;
                    if (el.textContent !== String(valor)) {
                        el.textContent = valor;
                        // Remove a classe primeiro para poder re-adicionar (reinicia animação)
                        el.classList.remove('atualizado');
                        // Force reflow para reiniciar a animação CSS
                        void el.offsetWidth;
                        el.classList.add('atualizado');
                        // Remove a classe após animação terminar
                        setTimeout(() => el.classList.remove('atualizado'), 500);
                    }
                }
                setValor(elTotal, data.total);
                setValor(elHoje,  data.hoje);
                setValor(elTotalRH, data.total);
                setValor(elAniver,  data.aniversarios);
                setValor(elFaltas,  data.faltas_total);
            })
            .catch(err => console.error('Erro ao buscar stats:', err));
    }

    // Atualiza os cards de resumo assim que as pastas forem carregadas
    atualizarStats();
}
