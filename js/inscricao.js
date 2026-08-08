// =============================================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================================
const SUPABASE_URL = 'https://jaslvoxljchhhkompelu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphc2x2b3hsamNoaGhrb21wZWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDY0MDAsImV4cCI6MjA5NzMyMjQwMH0.MoxG26k7LvtGm5hWvoA3YROXh6vJ3LARs9ndjF98hpc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    const form = document.querySelector('form');
    const btnSubmit = document.querySelector('.btn-submit');
    const inputCPF = document.getElementById('cpf');

    // Variável para controle de validação do CPF
    let cpfValido = true;

    // =============================================================
    // 1. MÁSCARAS DE FORMATAÇÃO E VALIDAÇÃO DE CPF EM TEMPO REAL
    // =============================================================
    if (inputCPF) {
        // Criar elemento visual para o feedback do CPF
        const avisoCPF = document.createElement('small');
        avisoCPF.id = 'aviso-cpf';
        avisoCPF.style.display = 'none';
        avisoCPF.style.marginTop = '6px';
        avisoCPF.style.fontWeight = '500';
        avisoCPF.style.fontSize = '12.5px';
        inputCPF.parentNode.appendChild(avisoCPF);

        // Função para consultar duplicidade no Supabase
        const verificarCpfDuplicado = async () => {
            const cpfLimpo = inputCPF.value.replace(/\D/g, '');

            if (cpfLimpo.length === 11) {
                avisoCPF.style.display = 'block';
                avisoCPF.style.color = '#6c757d';
                avisoCPF.innerText = '🔍 Verificando CPF no sistema...';

                try {
                    const { data: atletaExistente, error } = await supabaseClient
                        .from('atletas')
                        .select('id')
                        .eq('cpf', cpfLimpo)
                        .maybeSingle();

                    if (error) throw error;

                    if (atletaExistente) {
                        avisoCPF.style.color = '#c92a2a';
                        avisoCPF.innerText = '⚠️ Este CPF já está vinculado a uma inscrição!';
                        inputCPF.style.borderColor = '#c92a2a';
                        cpfValido = false;
                        if (btnSubmit) btnSubmit.disabled = true;
                    } else {
                        avisoCPF.style.color = '#2b8a3e';
                        avisoCPF.innerText = '✓ CPF livre para cadastro.';
                        inputCPF.style.borderColor = '#2b8a3e';
                        cpfValido = true;
                        if (btnSubmit) btnSubmit.disabled = false;
                    }
                } catch (err) {
                    console.error('Erro ao consultar CPF:', err);
                    avisoCPF.style.display = 'none';
                }
            } else {
                avisoCPF.style.display = 'none';
                inputCPF.style.borderColor = '';
                cpfValido = true;
                if (btnSubmit) btnSubmit.disabled = false;
            }
        };

        // Máscara e gatilho de verificação no input
        inputCPF.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;

            if (value.replace(/\D/g, '').length === 11) {
                verificarCpfDuplicado();
            } else {
                avisoCPF.style.display = 'none';
                inputCPF.style.borderColor = '';
                cpfValido = true;
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });

        // Verificação ao clicar fora do campo (blur)
        inputCPF.addEventListener('blur', verificarCpfDuplicado);
    }

    // =============================================================
    // 2. MÁSCARA DO WHATSAPP
    // =============================================================
    const inputWhatsApp = document.getElementById('whatsapp');
    if (inputWhatsApp) {
        inputWhatsApp.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)$/, '($1');
            }
            e.target.value = value;
        });
    }

    // =============================================================
    // 3. LÓGICA DE MENOR DE IDADE (NOME DO RESPONSÁVEL)
    // =============================================================
    const inputDataNascimento = document.getElementById('datanascimento');
    const campoResponsavel = document.getElementById('campo-responsavel');
    const inputResponsavel = document.getElementById('nomeresponsavel');

    if (inputDataNascimento) {
        inputDataNascimento.addEventListener('change', () => {
            const dataNascimentoVal = inputDataNascimento.value;
            if (!dataNascimentoVal) return;

            const dataNasc = new Date(dataNascimentoVal);
            const hoje = new Date();

            let idade = hoje.getFullYear() - dataNasc.getFullYear();
            const mes = hoje.getMonth() - dataNasc.getMonth();

            if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
                idade--;
            }

            if (idade < 18) {
                campoResponsavel.classList.add('active');
                inputResponsavel.required = true;
            } else {
                campoResponsavel.classList.remove('active');
                inputResponsavel.required = false;
                inputResponsavel.value = '';
            }
        });
    }

    // =============================================================
    // 4. LÓGICA DO MÓDULO DE INSCRIÇÃO / UPLOAD DE FOTO
    // =============================================================
    const radiosModulo = document.querySelectorAll('input[name="modulo"]');
    const campoFoto = document.getElementById('campo-foto');
    const inputFoto = document.getElementById('foto');

    radiosModulo.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const valor = e.target.value;
            if (valor === 'preinscricao' || valor === 'ambos') {
                campoFoto.classList.add('active');
                inputFoto.required = true;
            } else {
                campoFoto.classList.remove('active');
                inputFoto.required = false;
                inputFoto.value = '';
            }
        });
    });

    // =============================================================
    // 5. LÓGICA DE DEFICIÊNCIA / TIPO DE DEFICIÊNCIA
    // =============================================================
    const radiosDeficiencia = document.querySelectorAll('input[name="deficiencia"]');
    const campoTipoDeficiencia = document.getElementById('campo-tipo-deficiencia');
    const inputsTipoDeficiencia = campoTipoDeficiencia ? campoTipoDeficiencia.querySelectorAll('input[type="radio"]') : [];

    radiosDeficiencia.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'sim') {
                campoTipoDeficiencia.classList.add('active');
                inputsTipoDeficiencia.forEach(input => input.required = true);
            } else {
                campoTipoDeficiencia.classList.remove('active');
                inputsTipoDeficiencia.forEach(input => {
                    input.required = false;
                    input.checked = false;
                });
            }
        });
    });

    // =============================================================
    // 6. LÓGICA DE EQUIPAMENTOS AUXILIARES
    // =============================================================
    const radiosEquipamentos = document.querySelectorAll('input[name="equipamentos"]');
    const campoQualEquipamento = document.getElementById('campo-qual-equipamento');
    const inputQualEquipamento = document.getElementById('qual_equipamento');

    radiosEquipamentos.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'sim') {
                campoQualEquipamento.classList.add('active');
                inputQualEquipamento.required = true;
            } else {
                campoQualEquipamento.classList.remove('active');
                inputQualEquipamento.required = false;
                inputQualEquipamento.value = '';
            }
        });
    });

    // =============================================================
    // 7. ENVIO DO FORMULÁRIO PARA O SUPABASE (TABELA ATLETAS)
    // =============================================================
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!cpfValido) {
                alert('Este CPF já está vinculado a um atleta cadastrado.');
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Enviando inscrição...';

            try {
                const cpfLimpo = inputCPF.value.replace(/\D/g, '');

                if (cpfLimpo.length !== 11) {
                    alert('Por favor, digite um CPF válido com 11 dígitos.');
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'Enviar Inscrição';
                    return;
                }

                // Dupla verificação no submit por segurança
                const { data: atletaExistente } = await supabaseClient
                    .from('atletas')
                    .select('id')
                    .eq('cpf', cpfLimpo)
                    .maybeSingle();

                if (atletaExistente) {
                    alert('Este CPF já está cadastrado no sistema.');
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'Enviar Inscrição';
                    return;
                }

                let fotoUrl = null;

                // Upload da foto caso tenha sido selecionada
                if (inputFoto && inputFoto.files.length > 0) {
                    const file = inputFoto.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${cpfLimpo}_${Date.now()}.${fileExt}`;

                    const { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('fotos-atletas')
                        .upload(fileName, file, { upsert: true });

                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabaseClient.storage
                        .from('fotos-atletas')
                        .getPublicUrl(fileName);

                    fotoUrl = publicUrlData.publicUrl;
                }

                // Mapeamento dos campos
                const deficienciaValor = document.querySelector('input[name="deficiencia"]:checked')?.value || 'nao';
                const tipoDeficienciaChecked = document.querySelector('input[name="tipo_deficiencia"]:checked');
                const equipamentosValor = document.querySelector('input[name="equipamentos"]:checked')?.value || 'nao';

                const formData = {
                    nome_completo: document.getElementById('nome').value,
                    cpf: cpfLimpo,
                    data_nascimento: document.getElementById('datanascimento').value,
                    nome_responsavel: document.getElementById('nomeresponsavel')?.value || null,
                    email: document.getElementById('email').value || null,
                    whatsapp: document.getElementById('whatsapp').value || null,
                    modulo: document.querySelector('input[name="modulo"]:checked')?.value || null,
                    foto_url: fotoUrl,
                    possui_deficiencia: deficienciaValor,
                    tipo_deficiencia: deficienciaValor === 'sim' && tipoDeficienciaChecked ? tipoDeficienciaChecked.value : 'Não possui',
                    possui_equipamentos: equipamentosValor,
                    qual_equipamento: equipamentosValor === 'sim' ? document.getElementById('qual_equipamento').value : null
                };

                const { data, error } = await supabaseClient
                    .from('atletas')
                    .insert([formData]);

                if (error) throw error;

                alert('Inscrição realizada com sucesso!');
                form.reset();

                // Limpa avisos e esconde campos condicionais
                const avisoCPF = document.getElementById('aviso-cpf');
                if (avisoCPF) avisoCPF.style.display = 'none';
                if (inputCPF) inputCPF.style.borderColor = '';
                document.querySelectorAll('.conditional-field').forEach(el => el.classList.remove('active'));

            } catch (err) {
                console.error('Erro ao enviar formulário:', err);
                alert('Ocorreu um erro ao enviar sua inscrição: ' + (err.message || 'Tente novamente.'));
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Enviar Inscrição';
            }
        });
    }

});