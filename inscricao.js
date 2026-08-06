// =============================================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================================
const SUPABASE_URL = 'https://jaslvoxljchhhkompelu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphc2x2b3hsamNoaGhrb21wZWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDY0MDAsImV4cCI6MjA5NzMyMjQwMH0.MoxG26k7LvtGm5hWvoA3YROXh6vJ3LARs9ndjF98hpc';

// Alterado de 'supabase' para 'supabaseClient' para evitar conflito com a biblioteca CDN
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // =============================================================
    // 1. MÁSCARAS DE FORMATAÇÃO (CPF E WHATSAPP)
    // =============================================================
    const inputCPF = document.getElementById('cpf');
    if (inputCPF) {
        inputCPF.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

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
    // 2. LÓGICA DE MENOR DE IDADE (NOME DO RESPONSÁVEL)
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
    // 3. LÓGICA DO MÓDULO DE INSCRIÇÃO / UPLOAD DE FOTO
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
    // 4. LÓGICA DE DEFICIÊNCIA / TIPO DE DEFICIÊNCIA
    // =============================================================
    const radiosDeficiencia = document.querySelectorAll('input[name="deficiencia"]');
    const campoTipoDeficiencia = document.getElementById('campo-tipo-deficiencia');
    const inputsTipoDeficiencia = campoTipoDeficiencia.querySelectorAll('input[type="radio"]');

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
    // 5. LÓGICA DE EQUIPAMENTOS AUXILIARES
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
    // 6. ENVIO DO FORMULÁRIO PARA O SUPABASE
    // =============================================================
    const form = document.querySelector('form');
    const btnSubmit = document.querySelector('.btn-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        // Altera texto do botão para feedback visual
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Enviando inscrição...';

        try {
            let fotoUrl = null;

            // Upload da foto caso tenha sido selecionada
            if (inputFoto && inputFoto.files.length > 0) {
                const file = inputFoto.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('fotos-atletas')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Obter a URL pública da imagem enviada
                const { data: publicUrlData } = supabaseClient.storage
                    .from('fotos-atletas')
                    .getPublicUrl(fileName);

                fotoUrl = publicUrlData.publicUrl;
            }

            // Coleta dos dados do formulário
            const possuiDeficiencia = document.querySelector('input[name="deficiencia"]:checked')?.value === 'sim';
            const necessitaEquipamento = document.querySelector('input[name="equipamentos"]:checked')?.value === 'sim';
            const tipoDeficienciaChecked = document.querySelector('input[name="tipo_deficiencia"]:checked');

            const formData = {
                nome: document.getElementById('nome').value,
                cpf: document.getElementById('cpf').value,
                data_nascimento: document.getElementById('datanascimento').value,
                nome_responsavel: document.getElementById('nomeresponsavel')?.value || null,
                email: document.getElementById('email').value,
                whatsapp: document.getElementById('whatsapp').value,
                modulo: document.querySelector('input[name="modulo"]:checked')?.value,
                foto_url: fotoUrl,
                possui_deficiencia: possuiDeficiencia,
                tipo_deficiencia: possuiDeficiencia && tipoDeficienciaChecked ? tipoDeficienciaChecked.value : null,
                necessita_equipamento: necessitaEquipamento,
                qual_equipamento: necessitaEquipamento ? document.getElementById('qual_equipamento').value : null
            };

            // Inserção no banco de dados do Supabase
            const { data, error } = await supabaseClient
                .from('inscricoes')
                .insert([formData]);

            if (error) throw error;

            alert('Inscrição realizada com sucesso!');
            form.reset();

            // Esconde os campos dinâmicos após resetar
            document.querySelectorAll('.conditional-field').forEach(el => el.classList.remove('active'));

        } catch (err) {
            console.error('Erro ao enviar formulário:', err);
            alert('Ocorreu um erro ao enviar sua inscrição. Tente novamente.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Enviar Inscrição';
        }
    });

});