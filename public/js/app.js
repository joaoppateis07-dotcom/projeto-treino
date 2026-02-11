const btnIrParaFuncionario = document.getElementById('btnIrParaFuncionario');
const btnVoltarDashboard = document.getElementById('btnVoltarDashboard');
const sectionDashboard = document.getElementById('tela-dashboard');
const sectionFuncionario = document.getElementById('tela-funcionario');

btnIrParaFuncionario.addEventListener('click', () => {
    sectionDashboard.classList.add('hidden');
    sectionFuncionario.classList.remove('hidden');
});

btnVoltarDashboard.addEventListener('click', () => {
    sectionFuncionario.classList.add('hidden');
    sectionDashboard.classList.remove('hidden');
});