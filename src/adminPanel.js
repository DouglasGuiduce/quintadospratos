// Arquivo: src/adminPanel.js - Sistema Administrativo

import { supabase } from './supabaseClient.js';
import { gerarEDownloadPDFRodada } from './pdfService.js';

// --- VARIÁVEIS GLOBAIS ---
let IS_ADMIN = false;
let ADMIN_DATA = null;

// ========================================================================
// 1. VERIFICAÇÃO DE PERMISSÕES ADMIN
// ========================================================================

async function verificarPermissoesAdmin() {
  try {
    console.log('🔍 Verificando permissões de administrador...');
    
    // Chamar função do Supabase para verificar se é admin
    const { data, error } = await supabase.rpc('get_admin_data');
    
    if (error) {
      console.error('❌ Erro ao verificar permissões admin:', error);
      return false;
    }
    
    if (data && data.length > 0 && data[0].is_admin) {
      IS_ADMIN = true;
      ADMIN_DATA = data[0];
      console.log('✅ Usuário é administrador:', ADMIN_DATA);
      
      // Mostrar botão admin no menu
      const navAdmin = document.getElementById('nav-admin');
      if (navAdmin) {
        navAdmin.classList.remove('hidden');
      }
      
      return true;
    } else {
      console.log('❌ Usuário não é administrador');
      IS_ADMIN = false;
      ADMIN_DATA = null;
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na verificação de admin:', error);
    return false;
  }
}

// ========================================================================
// 2. INICIALIZAÇÃO DO PAINEL ADMIN
// ========================================================================

async function inicializarPainelAdmin() {
  if (!IS_ADMIN) {
    console.log('❌ Acesso negado: usuário não é administrador');
    return;
  }
  
  console.log('🔧 Inicializando painel administrativo...');
  
  // Configurar event listeners
  configurarEventListenersAdmin();
  
  // Carregar dashboard inicial
  await carregarDashboardAdmin();
}

function configurarEventListenersAdmin() {
  // Botões de gestão de usuários
  document.getElementById('btn-listar-usuarios')?.addEventListener('click', listarUsuarios);
  
  // Botões de gestão de rodadas
  document.getElementById('btn-listar-rodadas')?.addEventListener('click', listarRodadas);
  document.getElementById('btn-finalizar-rodada-admin')?.addEventListener('click', finalizarRodadaForcado);
  document.getElementById('btn-gerar-pdf-rodadas')?.addEventListener('click', mostrarModalSelecionarRodadaPDF);
  
  // Botão de verificar votos
  document.getElementById('btn-verificar-votos')?.addEventListener('click', verificarStatusVotacao);
  
  // Botões de gestão de conteúdo
  document.getElementById('btn-listar-pratos')?.addEventListener('click', listarPratos);
  
  // Botões de manutenção
  document.getElementById('btn-recalcular-pontos')?.addEventListener('click', recalcularPontos);
  document.getElementById('btn-zerar-dados-usuarios')?.addEventListener('click', zerarDadosUsuarios);
  document.getElementById('btn-limpar-dados')?.addEventListener('click', limparDados);
  
  // Botões do modal PDF
  document.getElementById('btn-cancelar-pdf')?.addEventListener('click', fecharModalPDF);
}

// ========================================================================
// 3. DASHBOARD ADMINISTRATIVO
// ========================================================================

async function carregarDashboardAdmin() {
  if (!IS_ADMIN) return;
  
  try {
    console.log('📊 Carregando dashboard administrativo...');
    
    // Buscar estatísticas do dashboard
    const { data: stats, error } = await supabase
      .from('vw_admin_dashboard')
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      mostrarStatusAdmin('❌ Erro ao carregar estatísticas', 'error');
      return;
    }
    
    // Renderizar estatísticas
    renderizarDashboardStats(stats);
    
  } catch (error) {
    console.error('❌ Erro no dashboard admin:', error);
    mostrarStatusAdmin('❌ Erro no dashboard', 'error');
  }
}

function renderizarDashboardStats(stats) {
  const container = document.getElementById('admin-dashboard-stats');
  if (!container) return;
  
  container.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div class="text-center">
        <p class="text-2xl font-bold text-blue-600">${stats.total_usuarios || 0}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">Usuários</p>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div class="text-center">
        <p class="text-2xl font-bold text-green-600">${stats.total_rodadas || 0}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">Rodadas</p>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div class="text-center">
        <p class="text-2xl font-bold text-purple-600">${stats.total_pratos || 0}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">Pratos</p>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div class="text-center">
        <p class="text-2xl font-bold text-orange-600">${stats.total_avaliacoes || 0}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">Avaliações</p>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div class="text-center">
        <p class="text-2xl font-bold text-red-600">${stats.rodadas_ativas || 0}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">Rodadas Ativas</p>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div class="text-center">
        <p class="text-2xl font-bold text-yellow-600">${stats.usuarios_7_dias || 0}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400">Novos (7 dias)</p>
      </div>
    </div>
  `;
}

// ========================================================================
// 4. GESTÃO DE USUÁRIOS
// ========================================================================

async function listarUsuarios() {
  if (!IS_ADMIN) return;
  
  try {
    console.log('👥 Listando todos os usuários...');
    mostrarStatusAdmin('📋 Carregando usuários...', 'info');
    
    const { data: usuarios, error } = await supabase
      .from('vw_admin_usuarios')
      .select('*')
      .order('pontos_totais', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao listar usuários:', error);
      mostrarStatusAdmin('❌ Erro ao carregar usuários', 'error');
      return;
    }
    
    renderizarListaUsuarios(usuarios);
    mostrarStatusAdmin(`✅ ${usuarios.length} usuários carregados`, 'success');
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    mostrarStatusAdmin('❌ Erro ao listar usuários', 'error');
  }
}

function renderizarListaUsuarios(usuarios) {
  const container = document.getElementById('lista-usuarios');
  if (!container) return;
  
  container.innerHTML = '';
  container.classList.remove('hidden');
  
  usuarios.forEach(usuario => {
    const card = document.createElement('div');
    card.className = 'bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border';
    
    const statusColor = usuario.status_conta === 'ativa' ? 'text-green-600' : 
                       usuario.status_conta === 'suspensa' ? 'text-yellow-600' : 'text-red-600';
    
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-sm text-text-light dark:text-text-dark">${usuario.nome_completo || 'Sem nome'}</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400">${usuario.email}</p>
          <div class="flex gap-4 mt-2 text-xs">
            <span class="text-blue-600 dark:text-blue-400">P: ${(usuario.pontos_totais || 0).toFixed(2)}</span>
            <span class="text-green-600 dark:text-green-400">J: ${usuario.jogos_participados || 0}</span>
            <span class="text-purple-600 dark:text-purple-400">V: ${usuario.vitorias || 0}</span>
            <span class="text-orange-600 dark:text-orange-400">M: ${(usuario.media_geral || 0).toFixed(2)}</span>
          </div>
          <p class="text-xs ${statusColor} mt-1">Status: ${usuario.status_conta}</p>
        </div>
        <div class="flex gap-1">
          <button onclick="editarUsuario('${usuario.id}')" class="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Editar">
            <span class="material-symbols-outlined text-sm">edit</span>
          </button>
          <button onclick="suspenderUsuario('${usuario.id}')" class="p-1 text-yellow-600 hover:bg-yellow-100 rounded" title="Suspender">
            <span class="material-symbols-outlined text-sm">block</span>
          </button>
          <button onclick="deletarUsuario('${usuario.id}')" class="p-1 text-red-600 hover:bg-red-100 rounded" title="Deletar">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// ========================================================================
// 5. GESTÃO DE RODADAS
// ========================================================================

async function listarRodadas() {
  if (!IS_ADMIN) return;
  
  try {
    console.log('🎮 Listando todas as rodadas...');
    mostrarStatusAdmin('📋 Carregando rodadas...', 'info');
    
    const { data: rodadas, error } = await supabase
      .from('rodadas')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao listar rodadas:', error);
      mostrarStatusAdmin('❌ Erro ao carregar rodadas', 'error');
      return;
    }
    
    renderizarListaRodadas(rodadas);
    mostrarStatusAdmin(`✅ ${rodadas.length} rodadas carregadas`, 'success');
    
  } catch (error) {
    console.error('❌ Erro ao listar rodadas:', error);
    mostrarStatusAdmin('❌ Erro ao listar rodadas', 'error');
  }
}

function renderizarListaRodadas(rodadas) {
  const container = document.getElementById('lista-rodadas');
  if (!container) return;
  
  container.innerHTML = '';
  container.classList.remove('hidden');
  
  rodadas.forEach(rodada => {
    const card = document.createElement('div');
    card.className = 'bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border';
    
    const statusColor = rodada.status === 'votacao_aberta' ? 'text-green-600' : 
                       rodada.status === 'finalizada' ? 'text-blue-600' : 'text-gray-600';
    
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-sm text-text-light dark:text-text-dark">${rodada.nome}</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400">ID: ${rodada.id}</p>
          <p class="text-xs ${statusColor} mt-1">Status: ${rodada.status}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Criada: ${new Date(rodada.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
        <div class="flex gap-1">
          <button onclick="editarRodada(${rodada.id})" class="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Editar">
            <span class="material-symbols-outlined text-sm">edit</span>
          </button>
          <button onclick="deletarRodada(${rodada.id})" class="p-1 text-red-600 hover:bg-red-100 rounded" title="Deletar">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

async function finalizarRodadaForcado() {
  if (!IS_ADMIN) return;
  
  const confirmacao = confirm('⚠️ Tem certeza que deseja finalizar a rodada atual FORÇADAMENTE?\n\nIsso vai finalizar a rodada independente dos votos.');
  
  if (!confirmacao) return;
  
  try {
    console.log('🔨 Finalizando rodada forçadamente...');
    mostrarStatusAdmin('⏳ Finalizando rodada...', 'info');
    
    // Buscar rodada ativa
    const { data: rodadaAtiva, error: errorRodada } = await supabase
      .from('rodadas')
      .select('*')
      .eq('status', 'votacao_aberta')
      .single();
    
    if (errorRodada || !rodadaAtiva) {
      console.log('Erro ao buscar rodada ativa:', errorRodada);
      mostrarStatusAdmin('❌ Nenhuma rodada ativa encontrada', 'error');
      return;
    }
    
    console.log('Rodada ativa encontrada:', rodadaAtiva);
    
    // Usar função SQL para finalizar rodada
    const { error: errorFinalizar } = await supabase.rpc('finalizar_rodada_admin', {
      p_rodada_id: rodadaAtiva.id
    });
    
    if (errorFinalizar) {
      console.error('❌ Erro ao finalizar rodada:', errorFinalizar);
      mostrarStatusAdmin(`❌ Erro ao finalizar rodada: ${errorFinalizar.message}`, 'error');
      return;
    }
    
    mostrarStatusAdmin('✅ Rodada finalizada com sucesso!', 'success');
    
    // Recarregar dashboard e listas
    setTimeout(() => {
      carregarDashboardAdmin();
      listarRodadas();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro ao finalizar rodada:', error);
    mostrarStatusAdmin(`❌ Erro ao finalizar rodada: ${error.message}`, 'error');
  }
}

// ========================================================================
// 5.1. GERAÇÃO DE PDF DAS RODADAS
// ========================================================================

async function mostrarModalSelecionarRodadaPDF() {
  if (!IS_ADMIN) return;
  
  try {
    console.log('📄 Carregando rodadas finalizadas para PDF...');
    mostrarStatusAdmin('📋 Carregando rodadas finalizadas...', 'info');
    
    // Buscar rodadas finalizadas
    const { data: rodadas, error } = await supabase
      .from('rodadas')
      .select('*')
      .eq('status', 'finalizada')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar rodadas finalizadas:', error);
      mostrarStatusAdmin('❌ Erro ao carregar rodadas', 'error');
      return;
    }
    
    if (rodadas.length === 0) {
      mostrarStatusAdmin('❌ Nenhuma rodada finalizada encontrada', 'error');
      return;
    }
    
    // Renderizar lista no modal
    renderizarListaRodadasPDF(rodadas);
    
    // Mostrar modal
    const modal = document.getElementById('modal-selecionar-rodada-pdf');
    if (modal) {
      modal.classList.remove('hidden');
    }
    
    mostrarStatusAdmin(`✅ ${rodadas.length} rodadas finalizadas encontradas`, 'success');
    
  } catch (error) {
    console.error('❌ Erro ao carregar rodadas para PDF:', error);
    mostrarStatusAdmin('❌ Erro ao carregar rodadas', 'error');
  }
}

function renderizarListaRodadasPDF(rodadas) {
  const container = document.getElementById('lista-rodadas-pdf');
  if (!container) return;
  
  container.innerHTML = '';
  
  rodadas.forEach(rodada => {
    const item = document.createElement('div');
    item.className = 'bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors';
    
    const dataFinalizacao = rodada.finalizada_em ? 
      new Date(rodada.finalizada_em).toLocaleDateString('pt-BR') : 
      new Date(rodada.created_at).toLocaleDateString('pt-BR');
    
    item.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h4 class="font-bold text-sm text-text-light dark:text-text-dark">${rodada.nome}</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400">Finalizada em: ${dataFinalizacao}</p>
        </div>
        <button onclick="gerarPDFRodada(${rodada.id})" 
                class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors">
          Gerar PDF
        </button>
      </div>
    `;
    
    container.appendChild(item);
  });
}

async function gerarPDFRodada(rodadaId) {
  if (!IS_ADMIN) return;
  
  try {
    console.log('🚀 Gerando PDF para rodada:', rodadaId);
    mostrarStatusAdmin('⏳ Gerando PDF... (pode demorar alguns segundos)', 'info');
    
    // Fechar modal
    fecharModalPDF();
    
    // Gerar e baixar PDF
    await gerarEDownloadPDFRodada(rodadaId);
    
    mostrarStatusAdmin('✅ PDF gerado e baixado com sucesso!', 'success');
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    mostrarStatusAdmin(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
  }
}

function fecharModalPDF() {
  const modal = document.getElementById('modal-selecionar-rodada-pdf');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ========================================================================
// 5.2. VERIFICAÇÃO DE STATUS DE VOTAÇÃO
// ========================================================================

async function verificarStatusVotacao() {
  if (!IS_ADMIN) return;
  
  try {
    console.log('🔍 Verificando status de votação...');
    mostrarStatusAdmin('📋 Carregando status de votação...', 'info');
    
    // Buscar rodada ativa
    const { data: rodadaAtiva, error: errorRodada } = await supabase
      .from('rodadas')
      .select('*')
      .eq('status', 'votacao_aberta')
      .single();
    
    if (errorRodada || !rodadaAtiva) {
      console.log('Nenhuma rodada ativa encontrada');
      mostrarStatusVotacaoVazio('Nenhuma rodada em votação no momento');
      mostrarStatusAdmin('ℹ️ Nenhuma rodada ativa encontrada', 'info');
      return;
    }
    
    console.log('Rodada ativa encontrada:', rodadaAtiva);
    
    // Buscar todos os pratos da rodada
    const { data: pratos, error: errorPratos } = await supabase
      .from('pratos')
      .select('id, id_usuario, nome_prato, perfis(nome_completo)')
      .eq('rodada_id', rodadaAtiva.id);
    
    if (errorPratos) {
      console.error('Erro ao buscar pratos:', errorPratos);
      mostrarStatusAdmin('❌ Erro ao buscar pratos', 'error');
      return;
    }
    
    if (!pratos || pratos.length === 0) {
      mostrarStatusVotacaoVazio('A rodada ainda não tem pratos cadastrados');
      mostrarStatusAdmin('ℹ️ Nenhum prato encontrado na rodada', 'info');
      return;
    }
    
    console.log(`Encontrados ${pratos.length} pratos na rodada`);
    
    // Buscar todos os usuários
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('perfis')
      .select('id, nome_completo, email')
      .order('nome_completo', { ascending: true });
    
    if (errorUsuarios) {
      console.error('Erro ao buscar usuários:', errorUsuarios);
      mostrarStatusAdmin('❌ Erro ao buscar usuários', 'error');
      return;
    }
    
    console.log(`Encontrados ${usuarios.length} usuários`);
    
    // Buscar todas as avaliações da rodada
    const { data: avaliacoes, error: errorAvaliacoes } = await supabase
      .from('avaliacoes')
      .select('id_votante, id_prato')
      .in('id_prato', pratos.map(p => p.id));
    
    if (errorAvaliacoes) {
      console.error('Erro ao buscar avaliações:', errorAvaliacoes);
      mostrarStatusAdmin('❌ Erro ao buscar avaliações', 'error');
      return;
    }
    
    console.log(`Encontradas ${avaliacoes?.length || 0} avaliações`);
    
    // Processar dados para cada usuário
    const statusUsuarios = [];
    
    for (const usuario of usuarios) {
      // Verificar se o usuário tem prato nesta rodada
      const pratosDoUsuario = pratos.filter(p => p.id_usuario === usuario.id);
      const temPrato = pratosDoUsuario.length > 0;
      
      // Buscar pratos que o usuário deve avaliar (todos exceto o próprio)
      const pratosParaAvaliar = pratos.filter(p => p.id_usuario !== usuario.id);
      
      // Verificar quantos pratos o usuário já avaliou
      const avaliacoesDoUsuario = avaliacoes?.filter(a => a.id_votante === usuario.id) || [];
      const pratosAvaliados = avaliacoesDoUsuario.length;
      
      // Verificar se completou a votação
      const completouVotacao = pratosAvaliados >= pratosParaAvaliar.length && pratosParaAvaliar.length > 0;
      
      statusUsuarios.push({
        nome: usuario.nome_completo || usuario.email || 'Sem nome',
        temPrato: temPrato,
        pratosParaAvaliar: pratosParaAvaliar.length,
        pratosAvaliados: pratosAvaliados,
        completouVotacao: completouVotacao,
        porcentagem: pratosParaAvaliar.length > 0 ? (pratosAvaliados / pratosParaAvaliar.length * 100) : 0
      });
    }
    
    // Separar usuários que completaram e que faltam
    const usuariosCompletaram = statusUsuarios.filter(u => u.completouVotacao);
    const usuariosFaltam = statusUsuarios.filter(u => !u.completouVotacao);
    
    console.log(`Status: ${usuariosCompletaram.length} completaram, ${usuariosFaltam.length} faltam`);
    
    // Renderizar status
    renderizarStatusVotacao({
      rodada: rodadaAtiva,
      totalPratos: pratos.length,
      totalUsuarios: usuarios.length,
      usuariosCompletaram: usuariosCompletaram,
      usuariosFaltam: usuariosFaltam
    });
    
    mostrarStatusAdmin(`✅ Status atualizado: ${usuariosCompletaram.length}/${usuarios.length} usuários votaram`, 'success');
    
  } catch (error) {
    console.error('❌ Erro ao verificar status de votação:', error);
    mostrarStatusAdmin('❌ Erro ao verificar status de votação', 'error');
  }
}

function mostrarStatusVotacaoVazio(mensagem) {
  const container = document.getElementById('status-votacao-container');
  if (!container) return;
  
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span class="material-symbols-outlined text-6xl text-gray-400 mb-3">info</span>
      <p class="text-sm text-gray-600 dark:text-gray-400">${mensagem}</p>
    </div>
  `;
}

function renderizarStatusVotacao(dados) {
  const container = document.getElementById('status-votacao-container');
  if (!container) return;
  
  container.classList.remove('hidden');
  
  const porcentagemGeral = dados.totalUsuarios > 0 
    ? (dados.usuariosCompletaram.length / dados.totalUsuarios * 100).toFixed(0)
    : 0;
  
  let html = `
    <!-- Resumo Geral -->
    <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
      <h3 class="font-bold text-center mb-3 text-orange-800 dark:text-orange-400">
        📊 ${dados.rodada.nome}
      </h3>
      <div class="grid grid-cols-3 gap-3 mb-3">
        <div class="text-center bg-white dark:bg-gray-800 p-2 rounded">
          <p class="text-xl font-bold text-blue-600">${dados.totalPratos}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Pratos</p>
        </div>
        <div class="text-center bg-white dark:bg-gray-800 p-2 rounded">
          <p class="text-xl font-bold text-green-600">${dados.usuariosCompletaram.length}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Votaram</p>
        </div>
        <div class="text-center bg-white dark:bg-gray-800 p-2 rounded">
          <p class="text-xl font-bold text-red-600">${dados.usuariosFaltam.length}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Faltam</p>
        </div>
      </div>
      
      <!-- Barra de Progresso -->
      <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
        <div class="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500" 
             style="width: ${porcentagemGeral}%">
          ${porcentagemGeral}%
        </div>
      </div>
    </div>
  `;
  
  // Usuários que JÁ votaram
  if (dados.usuariosCompletaram.length > 0) {
    html += `
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <h4 class="font-bold text-sm mb-2 flex items-center gap-2 text-green-800 dark:text-green-400">
          <span class="material-symbols-outlined text-base">check_circle</span>
          Já Votaram (${dados.usuariosCompletaram.length})
        </h4>
        <div class="space-y-2">
    `;
    
    dados.usuariosCompletaram.forEach(usuario => {
      html += `
        <div class="bg-white dark:bg-gray-800 p-2 rounded flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-green-600 text-sm">person</span>
            <span class="text-xs font-medium text-text-light dark:text-text-dark">${usuario.nome}</span>
            ${usuario.temPrato ? '<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">Chef</span>' : ''}
          </div>
          <span class="text-xs font-bold text-green-600">${usuario.pratosAvaliados}/${usuario.pratosParaAvaliar} ✓</span>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // Usuários que FALTAM votar
  if (dados.usuariosFaltam.length > 0) {
    html += `
      <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <h4 class="font-bold text-sm mb-2 flex items-center gap-2 text-red-800 dark:text-red-400">
          <span class="material-symbols-outlined text-base">pending</span>
          Faltam Votar (${dados.usuariosFaltam.length})
        </h4>
        <div class="space-y-2">
    `;
    
    dados.usuariosFaltam.forEach(usuario => {
      const faltam = usuario.pratosParaAvaliar - usuario.pratosAvaliados;
      html += `
        <div class="bg-white dark:bg-gray-800 p-2 rounded">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-red-600 text-sm">person</span>
              <span class="text-xs font-medium text-text-light dark:text-text-dark">${usuario.nome}</span>
              ${usuario.temPrato ? '<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">Chef</span>' : ''}
            </div>
            <span class="text-xs font-bold text-red-600">${usuario.pratosAvaliados}/${usuario.pratosParaAvaliar}</span>
          </div>
          <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div class="bg-orange-500 h-full transition-all duration-300" style="width: ${usuario.porcentagem}%"></div>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Faltam ${faltam} voto${faltam !== 1 ? 's' : ''}</p>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// ========================================================================
// 6. GESTÃO DE CONTEÚDO
// ========================================================================

async function listarPratos() {
  if (!IS_ADMIN) return;
  
  try {
    console.log('🍽️ Listando todos os pratos...');
    mostrarStatusAdmin('📋 Carregando pratos...', 'info');
    
    const { data: pratos, error } = await supabase
      .from('pratos')
      .select(`
        *,
        perfis(nome_completo, email),
        rodadas(nome, status)
      `)
      .order('id', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao listar pratos:', error);
      mostrarStatusAdmin('❌ Erro ao carregar pratos', 'error');
      return;
    }
    
    renderizarListaPratos(pratos);
    mostrarStatusAdmin(`✅ ${pratos.length} pratos carregados`, 'success');
    
  } catch (error) {
    console.error('❌ Erro ao listar pratos:', error);
    mostrarStatusAdmin('❌ Erro ao listar pratos', 'error');
  }
}

function renderizarListaPratos(pratos) {
  const container = document.getElementById('lista-pratos');
  if (!container) return;
  
  container.innerHTML = '';
  container.classList.remove('hidden');
  
  pratos.forEach(prato => {
    const card = document.createElement('div');
    card.className = 'bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border';
    
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-sm text-text-light dark:text-text-dark">${prato.nome_prato}</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400">Por: ${prato.perfis?.nome_completo || 'Desconhecido'}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Rodada: ${prato.rodadas?.nome || 'N/A'}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Enviado: ${new Date(prato.data_envio).toLocaleDateString('pt-BR')}</p>
        </div>
        <div class="flex gap-1">
          <button onclick="verPrato('${prato.url_imagem}')" class="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Ver imagem">
            <span class="material-symbols-outlined text-sm">visibility</span>
          </button>
          <button onclick="deletarPrato(${prato.id})" class="p-1 text-red-600 hover:bg-red-100 rounded" title="Deletar">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// ========================================================================
// 7. FERRAMENTAS DE MANUTENÇÃO
// ========================================================================

async function recalcularPontos() {
  if (!IS_ADMIN) return;
  
  const confirmacao = confirm('⚠️ Tem certeza que deseja recalcular TODOS os pontos?\n\nIsso vai recalcular os pontos de todos os usuários baseado nas avaliações recebidas.');
  
  if (!confirmacao) return;
  
  try {
    console.log('🔢 Recalculando todos os pontos...');
    mostrarStatusAdmin('⏳ Recalculando pontos... (pode demorar)', 'info');
    
    // Buscar todas as rodadas finalizadas
    console.log('🔍 Buscando rodadas finalizadas...');
    
    const { data: rodadasFinalizadas, error: errorRodadas } = await supabase
      .from('rodadas')
      .select('id, nome, status')
      .eq('status', 'finalizada')
      .order('id', { ascending: true });
    
    console.log('Resposta da busca de rodadas:', { data: rodadasFinalizadas, error: errorRodadas });
    
    if (errorRodadas) {
      console.error('Erro detalhado ao buscar rodadas finalizadas:', errorRodadas);
      console.error('Código do erro:', errorRodadas.code);
      console.error('Mensagem do erro:', errorRodadas.message);
      console.error('Detalhes do erro:', errorRodadas.details);
      console.error('Hint do erro:', errorRodadas.hint);
      
      mostrarStatusAdmin(`❌ Erro ao buscar rodadas: ${errorRodadas.message || errorRodadas.details || 'Erro desconhecido'}`, 'error');
      return;
    }
    
    if (!rodadasFinalizadas || rodadasFinalizadas.length === 0) {
      console.log('⚠️ Nenhuma rodada finalizada encontrada - zerando todos os dados dos usuários');
      mostrarStatusAdmin('⚠️ Nenhuma rodada finalizada encontrada - zerando dados dos usuários', 'info');
      
    // Zerar todos os dados dos usuários quando não há rodadas finalizadas
    console.log('🔄 Tentando zerar dados de todos os usuários...');
    
    const { data: dataZerar, error: errorZerar } = await supabase
      .from('perfis')
      .update({
        pontos_totais: 0,
        jogos_participados: 0,
        vitorias: 0,
        media_geral: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualiza todos
    
    console.log('Resposta da atualização:', { data: dataZerar, error: errorZerar });
    
    if (errorZerar) {
      console.error('Erro detalhado ao zerar dados dos usuários (método em lote):', errorZerar);
      console.error('Código do erro:', errorZerar.code);
      console.error('Mensagem do erro:', errorZerar.message);
      console.error('Detalhes do erro:', errorZerar.details);
      console.error('Hint do erro:', errorZerar.hint);
      
      const mensagemErro = errorZerar.message || errorZerar.details || JSON.stringify(errorZerar);
      mostrarStatusAdmin(`❌ Erro ao zerar dados: ${mensagemErro}`, 'error');
      return;
    }
      
      console.log('✅ Todos os dados dos usuários foram zerados');
      mostrarStatusAdmin('✅ Todos os dados dos usuários foram zerados com sucesso!', 'success');
      
      // Recarregar dashboard e listas
      setTimeout(() => {
        carregarDashboardAdmin();
        listarUsuarios();
      }, 2000);
      
      return;
    }
    
    console.log(`📊 Encontradas ${rodadasFinalizadas.length} rodadas finalizadas`);
    
    // Resetar pontos de todos os usuários
    const { error: errorReset } = await supabase
      .from('perfis')
      .update({
        pontos_totais: 0,
        jogos_participados: 0,
        vitorias: 0,
        media_geral: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualiza todos
    
    if (errorReset) {
      console.error('Erro ao resetar pontos:', errorReset);
      const mensagemErro = errorReset.message || errorReset.details || JSON.stringify(errorReset);
      mostrarStatusAdmin(`❌ Erro ao resetar pontos: ${mensagemErro}`, 'error');
      return;
    }
    
    console.log('✅ Pontos resetados para todos os usuários');
    
    // Recalcular pontos para cada rodada finalizada
    for (const rodada of rodadasFinalizadas) {
      console.log(`🔄 Recalculando pontos da rodada ${rodada.id} - ${rodada.nome}`);
      
      // Buscar todos os pratos da rodada
      const { data: pratos, error: errorPratos } = await supabase
        .from('pratos')
        .select('id, id_usuario')
        .eq('rodada_id', rodada.id);
      
      if (errorPratos) {
        console.error(`Erro ao buscar pratos da rodada ${rodada.id}:`, errorPratos);
        continue;
      }
      
      if (!pratos || pratos.length === 0) {
        console.log(`⚠️ Nenhum prato encontrado na rodada ${rodada.id}`);
        continue;
      }
      
      // Calcular pontos para cada prato
      for (const prato of pratos) {
        // Buscar avaliações do prato
        const { data: avaliacoes, error: errorAvaliacoes } = await supabase
          .from('avaliacoes')
          .select('nota')
          .eq('id_prato', prato.id);
        
        if (errorAvaliacoes) {
          console.error(`Erro ao buscar avaliações do prato ${prato.id}:`, errorAvaliacoes);
          continue;
        }
        
        if (!avaliacoes || avaliacoes.length === 0) {
          console.log(`⚠️ Nenhuma avaliação encontrada para o prato ${prato.id}`);
          continue;
        }
        
        // Calcular média do prato
        const somaNotas = avaliacoes.reduce((sum, av) => sum + av.nota, 0);
        const mediaPrato = somaNotas / avaliacoes.length;
        
        console.log(`📊 Prato ${prato.id} - Média: ${mediaPrato.toFixed(2)}`);
        
        // Buscar perfil atual do usuário
        const { data: perfilData, error: errorPerfil } = await supabase
          .from('perfis')
          .select('pontos_totais, jogos_participados, vitorias')
          .eq('id', prato.id_usuario)
          .single();
        
        if (errorPerfil) {
          console.error(`Erro ao buscar perfil do usuário ${prato.id_usuario}:`, errorPerfil);
          continue;
        }
        
        const pontosAtuais = perfilData?.pontos_totais || 0;
        const jogosAtuais = perfilData?.jogos_participados || 0;
        const vitoriasAtuais = perfilData?.vitorias || 0;
        
        // Atualizar pontos do usuário
        const novosPontos = pontosAtuais + mediaPrato;
        const novosJogos = jogosAtuais + 1;
        const novaMedia = novosPontos / novosJogos;
        
        // Verificar se é vitória (média >= 7.0)
        const novasVitorias = mediaPrato >= 7.0 ? vitoriasAtuais + 1 : vitoriasAtuais;
        
        const { error: errorUpdate } = await supabase
          .from('perfis')
          .update({
            pontos_totais: novosPontos,
            jogos_participados: novosJogos,
            vitorias: novasVitorias,
            media_geral: novaMedia
          })
          .eq('id', prato.id_usuario);
        
        if (errorUpdate) {
          console.error(`Erro ao atualizar perfil do usuário ${prato.id_usuario}:`, errorUpdate);
          continue;
        }
        
        console.log(`✅ Usuário ${prato.id_usuario} - Pontos: ${novosPontos.toFixed(2)}, Jogos: ${novosJogos}, Média: ${novaMedia.toFixed(2)}`);
      }
    }
    
    mostrarStatusAdmin('✅ Pontos recalculados com sucesso!', 'success');
    
    // Recarregar dashboard e listas
    setTimeout(() => {
      carregarDashboardAdmin();
      listarUsuarios();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro ao recalcular pontos:', error);
    mostrarStatusAdmin('❌ Erro ao recalcular pontos', 'error');
  }
}

async function zerarDadosUsuarios() {
  if (!IS_ADMIN) return;
  
  const confirmacao = confirm('⚠️ Tem certeza que deseja ZERAR os dados de TODOS os usuários?\n\nIsso vai zerar:\n- Pontos totais\n- Jogos participados\n- Vitórias\n- Média geral\n\nEsta ação pode ser revertida recalculando os pontos.');
  
  if (!confirmacao) return;
  
  try {
    console.log('🔄 Zerando dados de todos os usuários...');
    mostrarStatusAdmin('⏳ Zerando dados dos usuários...', 'info');
    
    // Primeiro, vamos verificar quantos usuários existem
    const { data: usuariosAntes, error: errorContar } = await supabase
      .from('perfis')
      .select('id, nome_completo, pontos_totais, jogos_participados, vitorias')
      .limit(10);
    
    if (errorContar) {
      console.error('Erro ao contar usuários:', errorContar);
      mostrarStatusAdmin('❌ Erro ao verificar usuários', 'error');
      return;
    }
    
    console.log('Usuários encontrados antes da atualização:', usuariosAntes);
    
    const { data: dataAtualizada, error } = await supabase
      .from('perfis')
      .update({
        pontos_totais: 0,
        jogos_participados: 0,
        vitorias: 0,
        media_geral: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualiza todos
    
    console.log('Resposta da atualização:', { data: dataAtualizada, error });
    
    if (error) {
      console.error('Erro detalhado ao zerar dados dos usuários:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);
      console.error('Detalhes do erro:', error.details);
      console.error('Hint do erro:', error.hint);
      
      const mensagemErro = error.message || error.details || JSON.stringify(error);
      mostrarStatusAdmin(`❌ Erro ao zerar dados: ${mensagemErro}`, 'error');
      return;
    }
    
    console.log('✅ Dados de todos os usuários foram zerados');
    mostrarStatusAdmin('✅ Dados de todos os usuários foram zerados com sucesso!', 'success');
    
    // Recarregar dashboard e listas
    setTimeout(() => {
      carregarDashboardAdmin();
      listarUsuarios();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro ao zerar dados dos usuários:', error);
    mostrarStatusAdmin('❌ Erro ao zerar dados dos usuários', 'error');
  }
}

async function zerarDadosUsuariosIndividual() {
  if (!IS_ADMIN) return;
  
  const confirmacao = confirm('⚠️ Tem certeza que deseja ZERAR os dados de TODOS os usuários?\n\nIsso vai zerar:\n- Pontos totais\n- Jogos participados\n- Vitórias\n- Média geral\n\nEsta ação pode ser revertida recalculando os pontos.');
  
  if (!confirmacao) return;
  
  try {
    console.log('🔄 Zerando dados de todos os usuários (método individual)...');
    mostrarStatusAdmin('⏳ Zerando dados dos usuários (método individual)...', 'info');
    
    // Buscar todos os usuários
    const { data: todosUsuarios, error: errorBuscar } = await supabase
      .from('perfis')
      .select('id, nome_completo, pontos_totais, jogos_participados, vitorias');
    
    if (errorBuscar) {
      console.error('Erro ao buscar usuários:', errorBuscar);
      mostrarStatusAdmin('❌ Erro ao buscar usuários', 'error');
      return;
    }
    
    if (!todosUsuarios || todosUsuarios.length === 0) {
      mostrarStatusAdmin('❌ Nenhum usuário encontrado', 'error');
      return;
    }
    
    console.log(`📊 Encontrados ${todosUsuarios.length} usuários para atualizar`);
    
    let sucessos = 0;
    let erros = 0;
    
    // Atualizar cada usuário individualmente
    for (const usuario of todosUsuarios) {
      try {
        const { error: errorUpdate } = await supabase
          .from('perfis')
          .update({
            pontos_totais: 0,
            jogos_participados: 0,
            vitorias: 0,
            media_geral: 0
          })
          .eq('id', usuario.id);
        
        if (errorUpdate) {
          console.error(`Erro ao atualizar usuário ${usuario.id} (${usuario.nome_completo}):`, errorUpdate);
          erros++;
        } else {
          console.log(`✅ Usuário ${usuario.id} (${usuario.nome_completo}) atualizado com sucesso`);
          sucessos++;
        }
      } catch (error) {
        console.error(`Erro inesperado ao atualizar usuário ${usuario.id}:`, error);
        erros++;
      }
    }
    
    console.log(`📊 Resultado: ${sucessos} sucessos, ${erros} erros`);
    
    if (erros === 0) {
      mostrarStatusAdmin(`✅ Todos os ${sucessos} usuários foram atualizados com sucesso!`, 'success');
    } else if (sucessos > 0) {
      mostrarStatusAdmin(`⚠️ ${sucessos} usuários atualizados, ${erros} erros`, 'warning');
    } else {
      mostrarStatusAdmin('❌ Erro ao atualizar usuários', 'error');
    }
    
    // Recarregar dashboard e listas
    setTimeout(() => {
      carregarDashboardAdmin();
      listarUsuarios();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro ao zerar dados dos usuários:', error);
    mostrarStatusAdmin('❌ Erro ao zerar dados dos usuários', 'error');
  }
}

async function limparDados() {
  if (!IS_ADMIN) return;
  
  const confirmacao = confirm('🚨 ATENÇÃO: Tem certeza que deseja RESETAR TODO O SISTEMA?\n\nIsso vai:\n✅ MANTER todos os usuários cadastrados\n❌ DELETAR todas as rodadas\n❌ DELETAR todos os pratos\n❌ DELETAR todas as avaliações\n❌ DELETAR todos os comentários\n❌ ZERAR todas as estatísticas dos usuários\n🔄 RESETAR os IDs para começar do 1\n\nEsta ação NÃO PODE ser desfeita!');
  
  if (!confirmacao) return;
  
  const confirmacao2 = confirm('🚨 ÚLTIMA CONFIRMAÇÃO!\n\nTem CERTEZA ABSOLUTA que deseja resetar tudo?');
  
  if (!confirmacao2) return;
  
  try {
    console.log('🗑️ Resetando todo o sistema...');
    mostrarStatusAdmin('⏳ Resetando sistema... (isso pode demorar)', 'info');
    
    // Chamar função SQL para resetar tudo
    const { error } = await supabase.rpc('resetar_sistema_completo');
    
    if (error) {
      console.error('❌ Erro ao resetar sistema:', error);
      console.error('Código:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      
      // Se a função não existir, fazer manualmente
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.log('⚠️ Função SQL não encontrada, executando reset manual...');
        await resetarSistemaManual();
      } else {
        mostrarStatusAdmin(`❌ Erro ao resetar sistema: ${error.message}`, 'error');
        return;
      }
    } else {
      mostrarStatusAdmin('✅ Sistema resetado com sucesso!', 'success');
    }
    
    // Recarregar dashboard
    setTimeout(() => {
      carregarDashboardAdmin();
      location.reload(); // Recarregar página para atualizar tudo
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro ao resetar sistema:', error);
    mostrarStatusAdmin('❌ Erro ao resetar sistema', 'error');
  }
}

async function resetarSistemaManual() {
  try {
    console.log('🔄 Iniciando reset manual do sistema...');
    mostrarStatusAdmin('⏳ Executando reset manual...', 'info');
    
    // PASSO 1: Deletar todas as curtidas de comentários
    console.log('1️⃣ Deletando curtidas de comentários...');
    const { error: errorCurtidas } = await supabase
      .from('curtidas_comentarios')
      .delete()
      .neq('id', 0); // Deleta todos
    
    if (errorCurtidas) {
      console.error('Erro ao deletar curtidas:', errorCurtidas);
    }
    
    // PASSO 2: Deletar todos os comentários
    console.log('2️⃣ Deletando comentários...');
    const { error: errorComentarios } = await supabase
      .from('comentarios')
      .delete()
      .neq('id', 0);
    
    if (errorComentarios) {
      console.error('Erro ao deletar comentários:', errorComentarios);
    }
    
    // PASSO 3: Deletar todas as avaliações
    console.log('3️⃣ Deletando avaliações...');
    const { error: errorAvaliacoes } = await supabase
      .from('avaliacoes')
      .delete()
      .neq('id', 0);
    
    if (errorAvaliacoes) {
      console.error('Erro ao deletar avaliações:', errorAvaliacoes);
    }
    
    // PASSO 4: Deletar votos de finalização
    console.log('4️⃣ Deletando votos de finalização...');
    const { error: errorFinalizacoes } = await supabase
      .from('finalizacoes_rodada')
      .delete()
      .neq('id', 0);
    
    if (errorFinalizacoes) {
      console.error('Erro ao deletar finalizações:', errorFinalizacoes);
    }
    
    // PASSO 5: Deletar todos os pratos
    console.log('5️⃣ Deletando pratos...');
    const { error: errorPratos } = await supabase
      .from('pratos')
      .delete()
      .neq('id', 0);
    
    if (errorPratos) {
      console.error('Erro ao deletar pratos:', errorPratos);
    }
    
    // PASSO 6: Deletar todas as rodadas
    console.log('6️⃣ Deletando rodadas...');
    const { error: errorRodadas } = await supabase
      .from('rodadas')
      .delete()
      .neq('id', 0);
    
    if (errorRodadas) {
      console.error('Erro ao deletar rodadas:', errorRodadas);
    }
    
    // PASSO 7: Zerar estatísticas dos usuários
    console.log('7️⃣ Zerando estatísticas dos usuários...');
    const { error: errorPerfis } = await supabase
      .from('perfis')
      .update({
        pontos_totais: 0,
        jogos_participados: 0,
        vitorias: 0,
        media_geral: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualiza todos
    
    if (errorPerfis) {
      console.error('Erro ao zerar perfis:', errorPerfis);
      throw errorPerfis;
    }
    
    console.log('✅ Reset manual concluído com sucesso!');
    mostrarStatusAdmin('✅ Sistema resetado com sucesso!', 'success');
    
    // Informar sobre reset de IDs
    alert('✅ Sistema resetado com sucesso!\n\n⚠️ ATENÇÃO: Os IDs das tabelas foram mantidos.\n\nPara resetar os IDs para começarem do 1, execute o seguinte SQL no Supabase:\n\nALTER SEQUENCE rodadas_id_seq RESTART WITH 1;\nALTER SEQUENCE pratos_id_seq RESTART WITH 1;\nALTER SEQUENCE avaliacoes_id_seq RESTART WITH 1;\nALTER SEQUENCE comentarios_id_seq RESTART WITH 1;');
    
  } catch (error) {
    console.error('❌ Erro no reset manual:', error);
    mostrarStatusAdmin('❌ Erro no reset manual', 'error');
    throw error;
  }
}

// ========================================================================
// 8. FUNÇÕES AUXILIARES
// ========================================================================

function mostrarStatusAdmin(mensagem, tipo = 'info') {
  const statusEl = document.getElementById('admin-status');
  if (!statusEl) return;
  
  const cores = {
    info: 'text-blue-600',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600'
  };
  
  statusEl.innerHTML = `<p class="${cores[tipo] || cores.info} font-bold">${mensagem}</p>`;
  
  // Limpar após 5 segundos
  setTimeout(() => {
    statusEl.innerHTML = '';
  }, 5000);
}

// ========================================================================
// 9. FUNÇÕES GLOBAIS (para os botões onclick)
// ========================================================================

// Funções que serão chamadas pelos botões onclick
window.editarUsuario = async function(userId) {
  console.log('Editar usuário:', userId);
  
  // Buscar dados do usuário
  const { data: usuario, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    mostrarStatusAdmin('❌ Erro ao buscar dados do usuário', 'error');
    return;
  }
  
  // Criar modal de edição
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
      <h3 class="text-lg font-bold mb-4">Editar Usuário</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Nome:</label>
          <input type="text" id="edit-nome" value="${usuario.nome_completo || ''}" 
                 class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Email:</label>
          <input type="email" id="edit-email" value="${usuario.email || ''}" 
                 class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Pontos:</label>
          <input type="number" step="0.01" id="edit-pontos" value="${usuario.pontos_totais || 0}" 
                 class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Status:</label>
          <select id="edit-status" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
            <option value="ativa" ${usuario.status_conta === 'ativa' ? 'selected' : ''}>Ativa</option>
            <option value="suspensa" ${usuario.status_conta === 'suspensa' ? 'selected' : ''}>Suspensa</option>
            <option value="banida" ${usuario.status_conta === 'banida' ? 'selected' : ''}>Banida</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick="salvarEdicaoUsuario('${userId}')" 
                class="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Salvar
        </button>
        <button onclick="fecharModal()" 
                class="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

window.suspenderUsuario = async function(userId) {
  const confirmacao = confirm('⚠️ Tem certeza que deseja suspender este usuário?\n\nEle não poderá mais acessar o sistema.');
  
  if (!confirmacao) return;
  
  try {
    mostrarStatusAdmin('⏳ Suspendo usuário...', 'info');
    
    const { error } = await supabase.rpc('alterar_status_usuario', {
      user_id: userId,
      novo_status: 'suspensa'
    });
    
    if (error) {
      console.error('Erro ao suspender usuário:', error);
      mostrarStatusAdmin('❌ Erro ao suspender usuário', 'error');
      return;
    }
    
    mostrarStatusAdmin('✅ Usuário suspenso com sucesso!', 'success');
    
    // Recarregar lista de usuários
    setTimeout(() => {
      listarUsuarios();
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao suspender usuário:', error);
    mostrarStatusAdmin('❌ Erro ao suspender usuário', 'error');
  }
};

window.deletarUsuario = async function(userId) {
  const confirmacao = confirm('🚨 ATENÇÃO: Tem certeza que deseja DELETAR este usuário?\n\nIsso vai apagar:\n- Todos os pratos do usuário\n- Todas as avaliações\n- O perfil completo\n\nEsta ação NÃO PODE ser desfeita!');
  
  if (!confirmacao) return;
  
  const confirmacao2 = confirm('🚨 ÚLTIMA CONFIRMAÇÃO!\n\nDigite "CONFIRMAR" no próximo prompt para continuar.');
  
  if (!confirmacao2) return;
  
  try {
    mostrarStatusAdmin('⏳ Deletando usuário...', 'info');
    
    const { error } = await supabase.rpc('deletar_usuario_completo', {
      user_id: userId
    });
    
    if (error) {
      console.error('Erro ao deletar usuário:', error);
      mostrarStatusAdmin('❌ Erro ao deletar usuário', 'error');
      return;
    }
    
    mostrarStatusAdmin('✅ Usuário deletado com sucesso!', 'success');
    
    // Recarregar lista de usuários
    setTimeout(() => {
      listarUsuarios();
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    mostrarStatusAdmin('❌ Erro ao deletar usuário', 'error');
  }
};

window.editarRodada = async function(rodadaId) {
  console.log('Editar rodada:', rodadaId);
  
  // Buscar dados da rodada
  const { data: rodada, error } = await supabase
    .from('rodadas')
    .select('*')
    .eq('id', rodadaId)
    .single();
  
  if (error) {
    mostrarStatusAdmin('❌ Erro ao buscar dados da rodada', 'error');
    return;
  }
  
  // Criar modal de edição
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
      <h3 class="text-lg font-bold mb-4">Editar Rodada</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Nome:</label>
          <input type="text" id="edit-rodada-nome" value="${rodada.nome || ''}" 
                 class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Status:</label>
          <select id="edit-rodada-status" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
            <option value="votacao_aberta" ${rodada.status === 'votacao_aberta' ? 'selected' : ''}>Votação Aberta</option>
            <option value="finalizada" ${rodada.status === 'finalizada' ? 'selected' : ''}>Finalizada</option>
            <option value="proxima" ${rodada.status === 'proxima' ? 'selected' : ''}>Próxima</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">ID:</label>
          <input type="text" id="edit-rodada-id" value="${rodada.id}" disabled
                 class="w-full p-2 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-600">
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick="salvarEdicaoRodada(${rodadaId})" 
                class="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Salvar
        </button>
        <button onclick="fecharModal()" 
                class="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

window.salvarEdicaoRodada = async function(rodadaId) {
  const nome = document.getElementById('edit-rodada-nome').value;
  const status = document.getElementById('edit-rodada-status').value;
  
  try {
    mostrarStatusAdmin('⏳ Salvando alterações...', 'info');
    
    // Atualizar rodada
    const { error } = await supabase
      .from('rodadas')
      .update({
        nome: nome,
        status: status
      })
      .eq('id', rodadaId);
    
    if (error) {
      console.error('Erro ao atualizar rodada:', error);
      mostrarStatusAdmin(`❌ Erro ao salvar alterações: ${error.message}`, 'error');
      return;
    }
    
    mostrarStatusAdmin('✅ Rodada atualizada com sucesso!', 'success');
    fecharModal();
    
    // Recarregar lista de rodadas
    setTimeout(() => {
      listarRodadas();
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao salvar rodada:', error);
    mostrarStatusAdmin('❌ Erro ao salvar alterações', 'error');
  }
};

window.deletarRodada = async function(rodadaId) {
  const confirmacao = confirm('⚠️ Tem certeza que deseja DELETAR esta rodada?\n\nIsso vai apagar:\n- Todos os pratos da rodada\n- Todas as avaliações\n- A rodada completa\n\nEsta ação NÃO PODE ser desfeita!');
  
  if (!confirmacao) return;
  
  try {
    console.log('🗑️ Tentando deletar rodada:', rodadaId);
    mostrarStatusAdmin('⏳ Deletando rodada...', 'info');
    
    const { data, error } = await supabase.rpc('deletar_rodada_completa', {
      p_rodada_id: rodadaId
    });
    
    console.log('Resposta da função:', { data, error });
    
    if (error) {
      console.error('Erro detalhado ao deletar rodada:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);
      console.error('Detalhes do erro:', error.details);
      console.error('Hint do erro:', error.hint);
      
      mostrarStatusAdmin(`❌ Erro ao deletar rodada: ${error.message || error.details || 'Erro desconhecido'}`, 'error');
      return;
    }
    
    console.log('✅ Rodada deletada com sucesso!');
    mostrarStatusAdmin('✅ Rodada deletada com sucesso!', 'success');
    
    // Recarregar lista de rodadas e dashboard
    setTimeout(() => {
      listarRodadas();
      carregarDashboardAdmin();
    }, 2000);
    
  } catch (error) {
    console.error('Erro inesperado ao deletar rodada:', error);
    mostrarStatusAdmin(`❌ Erro inesperado: ${error.message}`, 'error');
  }
};

window.verPrato = function(urlImagem) {
  console.log('Ver prato:', urlImagem);
  
  // Criar modal de imagem
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="relative max-w-4xl max-h-full p-4">
      <button onclick="fecharModalImagem()" 
              class="absolute top-2 right-2 text-white text-4xl hover:text-gray-300 z-10">
        <span class="material-symbols-outlined">close</span>
      </button>
      <img src="${urlImagem}" alt="Prato" class="max-w-full max-h-full object-contain rounded-lg">
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Fechar com ESC
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      fecharModalImagem();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
};

window.fecharModalImagem = function() {
  const modal = document.querySelector('.fixed.inset-0.bg-black\\/90');
  if (modal) {
    modal.remove();
  }
};

window.deletarPrato = async function(pratoId) {
  const confirmacao = confirm('⚠️ Tem certeza que deseja DELETAR este prato?\n\nIsso vai apagar:\n- Todas as avaliações do prato\n- O prato completo\n\nEsta ação NÃO PODE ser desfeita!');
  
  if (!confirmacao) return;
  
  try {
    mostrarStatusAdmin('⏳ Deletando prato...', 'info');
    
    const { error } = await supabase.rpc('deletar_prato_completo', {
      prato_id: pratoId
    });
    
    if (error) {
      console.error('Erro ao deletar prato:', error);
      mostrarStatusAdmin('❌ Erro ao deletar prato', 'error');
      return;
    }
    
    mostrarStatusAdmin('✅ Prato deletado com sucesso!', 'success');
    
    // Recarregar lista de pratos
    setTimeout(() => {
      listarPratos();
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao deletar prato:', error);
    mostrarStatusAdmin('❌ Erro ao deletar prato', 'error');
  }
};

// Funções auxiliares para modais
window.salvarEdicaoUsuario = async function(userId) {
  const nome = document.getElementById('edit-nome').value;
  const email = document.getElementById('edit-email').value;
  const pontos = parseFloat(document.getElementById('edit-pontos').value);
  const status = document.getElementById('edit-status').value;
  
  try {
    mostrarStatusAdmin('⏳ Salvando alterações...', 'info');
    
    // Atualizar perfil
    const { error: errorPerfil } = await supabase
      .from('perfis')
      .update({
        nome_completo: nome,
        email: email,
        pontos_totais: pontos,
        status_conta: status
      })
      .eq('id', userId);
    
    if (errorPerfil) {
      console.error('Erro ao atualizar perfil:', errorPerfil);
      mostrarStatusAdmin('❌ Erro ao salvar alterações', 'error');
      return;
    }
    
    mostrarStatusAdmin('✅ Usuário atualizado com sucesso!', 'success');
    fecharModal();
    
    // Recarregar lista de usuários
    setTimeout(() => {
      listarUsuarios();
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
    mostrarStatusAdmin('❌ Erro ao salvar alterações', 'error');
  }
};

window.fecharModal = function() {
  const modal = document.querySelector('.fixed.inset-0.bg-black\\/50');
  if (modal) {
    modal.remove();
  }
};

// Função global para gerar PDF (chamada pelos botões onclick)
window.gerarPDFRodada = gerarPDFRodada;

// ========================================================================
// 10. EXPORTAR FUNÇÕES PRINCIPAIS
// ========================================================================

export {
  verificarPermissoesAdmin,
  inicializarPainelAdmin,
  carregarDashboardAdmin
};
