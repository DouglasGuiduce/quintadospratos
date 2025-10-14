// Arquivo: src/main.js - VERSÃO COMPLETA E FINAL

import './style.css';
import { supabase } from './supabaseClient.js';
import { verificarPermissoesAdmin, inicializarPainelAdmin, carregarDashboardAdmin } from './adminPanel.js';

// --- VARIÁVEIS GLOBAIS ---
let USUARIO_LOGADO = null; // Guarda os dados do usuário logado
let RODADA_ABERTA = null; // Guarda os dados da rodada em votação

// --- CONSTANTES ---
const estrelaVazia = '☆';
const estrelaCheia = '★';

// ========================================================================
// 1. INICIALIZAÇÃO E NAVEGAÇÃO
// ========================================================================

// Função principal que inicia a aplicação
async function inicializar() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login.html'; // Se não há usuário, vai para o login
    } else {
      USUARIO_LOGADO = user; // Guarda o objeto do usuário logado
      console.log(`✅ Usuário logado: ${USUARIO_LOGADO.email}`);
      
      // Verificar se é admin
      await verificarPermissoesAdmin();
      
      configurarNavegacao();
      navigateTo('page-feed'); // Começa na página de feed
      
      // Esconder tela de loading após tudo carregado
      setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
          loadingScreen.classList.add('hidden');
        }
      }, 500); // Pequeno delay para garantir que tudo renderizou
    }
  } catch (error) {
    console.error('Erro na inicialização:', error);
    // Esconder loading mesmo com erro
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }
}

// Configura o roteador da nossa SPA
function configurarNavegacao() {
  const botoes = document.querySelectorAll('.nav-button');
  botoes.forEach(botao => {
    botao.addEventListener('click', () => {
      const alvo = botao.dataset.target;
      navigateTo(alvo);
    });
  });
  
  // Liga os botões da página de gestão às suas funções
  document.getElementById('btn-criar-rodada').addEventListener('click', criarNovaRodada);
  document.getElementById('btn-finalizar-rodada').addEventListener('click', votarParaFinalizar);
  
  // Liga os botões de upload de prato
  document.getElementById('btn-selecionar-imagem').addEventListener('click', () => {
    document.getElementById('input-imagem-prato').click();
  });
  
  document.getElementById('input-imagem-prato').addEventListener('change', (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      document.getElementById('texto-imagem-selecionada').textContent = arquivo.name;
    }
  });
  
  document.getElementById('btn-enviar-prato').addEventListener('click', enviarPrato);
  
  // Configurar modal de imagem
  document.getElementById('fechar-modal').addEventListener('click', fecharModalImagem);
  document.getElementById('modal-imagem').addEventListener('click', (e) => {
    if (e.target.id === 'modal-imagem') {
      fecharModalImagem();
    }
  });
}

function abrirModalImagem(urlImagem) {
  const modal = document.getElementById('modal-imagem');
  const imagemModal = document.getElementById('modal-imagem-src');
  imagemModal.src = urlImagem;
  modal.classList.remove('hidden');
  
  // Fechar com ESC
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      fecharModalImagem();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

function fecharModalImagem() {
  const modal = document.getElementById('modal-imagem');
  modal.classList.add('hidden');
}

// Função que controla a visibilidade das "páginas" (seções)
function navigateTo(pageId) {
  document.querySelectorAll('.page-section').forEach(section => section.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');

  document.querySelectorAll('.nav-button').forEach(button => {
    button.classList.toggle('text-primary', button.dataset.target === pageId);
    button.classList.toggle('text-black/60', button.dataset.target !== pageId);
    button.classList.toggle('dark:text-white/60', button.dataset.target !== pageId);
  });
  
  // Carrega os dados da página que se tornou ativa
  if (pageId === 'page-feed') carregarFeed();
  if (pageId === 'page-gestao') carregarGestao();
  if (pageId === 'page-perfil') carregarPerfil();
  if (pageId === 'page-tabela') {
    carregarTabela();
    carregarDashboardDinamico();
  }
  if (pageId === 'page-admin') {
    inicializarPainelAdmin();
  }
}

function exibirMensagem(mensagem, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (container) {
    container.innerHTML = `<p class="text-center text-xl p-8 text-black/60 dark:text-white/60 w-full">${mensagem}</p>`;
  }
}

// ========================================================================
// 2. LÓGICA DA PÁGINA DE GESTÃO
// ========================================================================

async function carregarGestao() {
  const btnCriar = document.getElementById('btn-criar-rodada');
  const btnFinalizar = document.getElementById('btn-finalizar-rodada');
  const statusFinalizacaoEl = document.getElementById('finalizacao-status');
  
  btnCriar.disabled = true;
  btnFinalizar.disabled = true;

  const { data: rodadas, error } = await supabase.from('rodadas').select('*');
  if (error) { console.error("Erro ao buscar rodadas:", error); return; }

  RODADA_ABERTA = rodadas.find(r => r.status === 'votacao_aberta');

  if (RODADA_ABERTA) {
    btnCriar.disabled = true;
    btnCriar.title = "Já existe uma rodada em andamento.";
    btnFinalizar.disabled = false;
    
    // Buscar votos de finalização (sem join, para evitar problemas de RLS)
    const { data: finalizadores, error: errorFin } = await supabase
        .from('finalizacoes_rodada')
        .select('usuario_id')
        .eq('rodada_id', RODADA_ABERTA.id);
    
    if (errorFin) {
        console.error("Erro ao buscar finalizadores:", errorFin);
        statusFinalizacaoEl.textContent = "Erro ao carregar votos de finalização.";
    } else if (finalizadores && finalizadores.length > 0) {
        // Verificar se o usuário atual já votou
        const jaVotei = finalizadores.some(f => f.usuario_id === USUARIO_LOGADO.id);
        if (jaVotei) {
            btnFinalizar.disabled = true;
            btnFinalizar.title = "Você já votou para finalizar esta rodada.";
        }
        statusFinalizacaoEl.textContent = `${finalizadores.length}/5 pessoas votaram para finalizar.`;
  } else {
        statusFinalizacaoEl.textContent = "Ninguém votou para finalizar ainda.";
    }
  } else {
    btnCriar.disabled = false;
    btnCriar.title = "Crie uma nova rodada para a competição começar!";
    btnFinalizar.disabled = true;
    statusFinalizacaoEl.textContent = "Nenhuma rodada em andamento para finalizar.";
  }
}

async function criarNovaRodada() {
    const btnCriar = document.getElementById('btn-criar-rodada');
    btnCriar.disabled = true;
    btnCriar.textContent = "A criar...";

    const { count, error: countError } = await supabase.from('rodadas').select('*', { count: 'exact', head: true });
    if (countError) { 
        console.error(countError); 
        btnCriar.disabled = false;
        btnCriar.textContent = "Criar Nova Rodada";
        alert("Erro ao verificar rodadas!");
    return;
  }

    const novoNome = `Rodada ${count + 1}`;
    const { error: insertError } = await supabase.from('rodadas').insert({ nome: novoNome, status: 'votacao_aberta' });

    if (insertError) {
        alert("Erro ao criar a rodada!");
        btnCriar.disabled = false;
        btnCriar.textContent = "Criar Nova Rodada";
  } else {
        alert(`🎉 "${novoNome}" foi criada!\n\nAgora você pode adicionar seu prato à rodada.`);
        // Recarregar gestão e feed para refletir a nova rodada
        await carregarGestao();
        await carregarFeed();
        btnCriar.textContent = "Criar Nova Rodada";
    }
}

async function votarParaFinalizar() {
    if (!RODADA_ABERTA) { alert("Não há rodada aberta para finalizar."); return; }
    if (!USUARIO_LOGADO) { alert("Usuário não logado."); return; }

    const btnFinalizar = document.getElementById('btn-finalizar-rodada');
    const statusEl = document.getElementById('finalizacao-status');
    btnFinalizar.disabled = true;
    statusEl.textContent = "Registando o seu voto...";

    // Inserir o voto para finalizar
    const { error } = await supabase.from('finalizacoes_rodada').insert({ 
        rodada_id: RODADA_ABERTA.id, 
        usuario_id: USUARIO_LOGADO.id 
    });

    if (error) {
        console.error("Erro ao votar para finalizar:", error);
        
        // Erro 23505 (PostgreSQL) ou mensagem de duplicate key
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
            statusEl.textContent = "⚠️ Você já votou para finalizar esta rodada.";
            statusEl.classList.add('text-yellow-600', 'font-bold');
        } else {
            statusEl.textContent = "❌ Erro ao registar o seu voto.";
            statusEl.classList.add('text-red-600', 'font-bold');
        }
        
        setTimeout(() => carregarGestao(), 2000);
        return;
    }

    statusEl.textContent = "✅ Voto registado com sucesso!";
    statusEl.classList.add('text-green-600', 'font-bold');

    // Verificar se deve finalizar a rodada
    await verificarEFinalizarRodada();
    
    setTimeout(() => carregarGestao(), 1500);
}

async function verificarEFinalizarRodada() {
    if (!RODADA_ABERTA) return;

    console.log(`\n🔍 ===== VERIFICAÇÃO DE FINALIZAÇÃO INICIADA =====`);

    // PASSO 1: Buscar TODOS os usuários cadastrados no sistema
    const { data: todosUsuarios, error: errorUsuarios } = await supabase
        .from('perfis')
        .select('id');

    if (errorUsuarios) {
        console.error('❌ Erro ao buscar usuários:', errorUsuarios);
        return;
    }

    const totalUsuariosCadastrados = todosUsuarios?.length || 0;
    console.log(`👥 Total de usuários cadastrados no sistema: ${totalUsuariosCadastrados}`);

    if (totalUsuariosCadastrados === 0) {
        console.log('⚠️ Nenhum usuário cadastrado no sistema');
        return;
    }

    // PASSO 2: Buscar todos os pratos da rodada
    const { data: pratos, error: errorPratos } = await supabase
        .from('pratos')
        .select('id, id_usuario')
        .eq('rodada_id', RODADA_ABERTA.id);

    if (errorPratos || !pratos || pratos.length === 0) {
        console.log('⚠️ Nenhum prato encontrado na rodada');
        console.log('❌ Aguardando pratos para iniciar votação');
        console.log(`===== FIM DA VERIFICAÇÃO =====\n`);
        return;
    }

    console.log(`📊 Total de pratos na rodada: ${pratos.length}`);

    // PASSO 3: Verificar quantos usuários JÁ VOTARAM (avaliaram pelo menos 1 prato)
    const pratoIds = pratos.map(p => p.id);
    
    const { data: avaliacoes, error: errorAvaliacoes } = await supabase
        .from('avaliacoes')
        .select('id_votante')
        .in('id_prato', pratoIds);

    if (errorAvaliacoes) {
        console.error('❌ Erro ao buscar avaliações:', errorAvaliacoes);
        return;
    }

    // Usuários únicos que já votaram (avaliaram pelo menos 1 prato)
    const usuariosQueVotaram = [...new Set(avaliacoes?.map(a => a.id_votante) || [])];
    const totalUsuariosQueVotaram = usuariosQueVotaram.length;

    console.log(`✅ Usuários que já votaram: ${totalUsuariosQueVotaram}`);
    console.log(`📊 Faltam votar: ${totalUsuariosCadastrados - totalUsuariosQueVotaram} usuários`);

    // PASSO 4: Verificar se cada usuário que votou avaliou TODOS os pratos (exceto o próprio se tiver)
    let todosCompletaramVotacao = true;

    for (const usuarioId of usuariosQueVotaram) {
        // Verificar se este usuário tem prato na rodada
        const pratoDoUsuario = pratos.find(p => p.id_usuario === usuarioId);
        
        // Pratos que este usuário DEVE avaliar
        const pratosParaAvaliar = pratoDoUsuario 
            ? pratos.filter(p => p.id_usuario !== usuarioId) // Se tem prato, avaliar todos menos o próprio
            : pratos; // Se não tem prato, avaliar todos

        // Verificar quantos pratos este usuário avaliou
        const { data: avaliacoesDoUsuario } = await supabase
            .from('avaliacoes')
            .select('id_prato')
            .eq('id_votante', usuarioId)
            .in('id_prato', pratoIds);

        const totalAvaliadoPorUsuario = avaliacoesDoUsuario?.length || 0;

        console.log(`\n👤 Usuário ${usuarioId}:`);
        console.log(`  - Tem prato? ${pratoDoUsuario ? 'Sim' : 'Não'}`);
        console.log(`  - Deve avaliar: ${pratosParaAvaliar.length} pratos`);
        console.log(`  - Já avaliou: ${totalAvaliadoPorUsuario} pratos`);

        if (totalAvaliadoPorUsuario < pratosParaAvaliar.length) {
            todosCompletaramVotacao = false;
            console.log(`  ❌ Falta avaliar ${pratosParaAvaliar.length - totalAvaliadoPorUsuario} pratos`);
        } else {
            console.log(`  ✅ Completou todas as avaliações`);
        }
    }

    // REGRA PRINCIPAL: Finalizar quando TODOS os usuários cadastrados votaram
    if (totalUsuariosQueVotaram >= totalUsuariosCadastrados && todosCompletaramVotacao) {
        console.log(`\n🎉 TODOS OS ${totalUsuariosCadastrados} USUÁRIOS VOTARAM!`);
        console.log(`✅ FINALIZANDO RODADA AUTOMATICAMENTE!`);
        await finalizarRodada(`Todos os ${totalUsuariosCadastrados} usuários cadastrados votaram!`);
        return;
    }

    // Se nem todos votaram ainda
    if (totalUsuariosQueVotaram < totalUsuariosCadastrados) {
        console.log(`\n⚠️ Ainda faltam ${totalUsuariosCadastrados - totalUsuariosQueVotaram} usuários votarem`);
    } else if (!todosCompletaramVotacao) {
        console.log(`\n⚠️ Alguns usuários não completaram todas as avaliações`);
    }

    // REGRA ALTERNATIVA: Verificar votos de finalização manual
    const { data: votosFinalizacao, error: errorVotos } = await supabase
        .from('finalizacoes_rodada')
        .select('usuario_id')
        .eq('rodada_id', RODADA_ABERTA.id);

    if (errorVotos) {
        console.error("Erro ao buscar votos de finalização:", errorVotos);
        return;
    }

    const totalVotosFinalizacao = votosFinalizacao?.length || 0;
    console.log(`\n📊 Votos manuais de finalização: ${totalVotosFinalizacao}`);

    // Se 5 ou mais pessoas votaram manualmente para finalizar
    if (totalVotosFinalizacao >= 5) {
        console.log(`✅ Finalizando por quórum (5+ votos manuais)`);
        await finalizarRodada(`5 pessoas votaram para finalizar!`);
        return;
    }

    console.log(`\n❌ Rodada continua - aguardando todos os usuários votarem`);
    console.log(`===== FIM DA VERIFICAÇÃO =====\n`);
}

async function finalizarRodada(motivo) {
    if (!RODADA_ABERTA) return;

    console.log(`🎉 Finalizando rodada ${RODADA_ABERTA.id} - ${motivo}`);

    const { error } = await supabase
      .from('rodadas')
      .update({ status: 'finalizada' })
      .eq('id', RODADA_ABERTA.id);

    if (error) {
      console.error("Erro ao finalizar rodada:", error);
      alert("Erro ao finalizar a rodada!");
    } else {
      console.log(`✅ Rodada ${RODADA_ABERTA.id} finalizada com sucesso!`);
      
      // Calcular médias e atualizar pontos APENAS quando finalizar
      await calcularResultadosDaRodada(RODADA_ABERTA.id);
      
      alert(`🎉 Rodada finalizada! ${motivo}\n\n✨ As notas foram reveladas!\n🏆 Pontos e rankings atualizados!`);
      RODADA_ABERTA = null;
      
      // Recarregar feed para mostrar nomes revelados e status finalizada
      await carregarFeed();
    }
}

async function calcularResultadosDaRodada(rodadaId) {
  console.log(`🔢 Calculando resultados da rodada ${rodadaId}`);
  
  try {
    // Buscar todos os pratos desta rodada
    const { data: pratos, error: errorPratos } = await supabase
      .from('pratos')
      .select('id, id_usuario')
      .eq('rodada_id', rodadaId);
    
    if (errorPratos) {
      console.error('❌ Erro ao buscar pratos:', errorPratos);
      return;
    }
    
    if (!pratos || pratos.length === 0) {
      console.error('❌ Nenhum prato encontrado na rodada');
      return;
    }
    
    console.log(`📊 Total de pratos na rodada: ${pratos.length}`);
    console.log(`📊 Pratos encontrados:`, pratos.map(p => ({ id: p.id, usuario: p.id_usuario })));
    
    let melhorMedia = 0;
    let vencedoresIds = []; // Array para múltiplos vencedores
    const resultadosPratos = [];
    
    // Calcular média de cada prato e atualizar perfis
    for (let i = 0; i < pratos.length; i++) {
      const prato = pratos[i];
      console.log(`\n🔄 Processando prato ${i + 1}/${pratos.length}: ID ${prato.id}, Usuário ${prato.id_usuario}`);
      
      try {
        // Buscar todas as avaliações deste prato
        const { data: avaliacoes, error: errorAvaliacoes } = await supabase
          .from('avaliacoes')
          .select('nota')
          .eq('id_prato', prato.id);
        
        if (errorAvaliacoes) {
          console.error(`❌ Erro ao buscar avaliações do prato ${prato.id}:`, errorAvaliacoes);
          continue; // Pula para o próximo prato
        }
        
        console.log(`📊 Prato ${prato.id}: ${avaliacoes?.length || 0} avaliações`);
        
        if (avaliacoes && avaliacoes.length > 0) {
          // Calcular média
          const somaNotas = avaliacoes.reduce((sum, av) => sum + av.nota, 0);
          const mediaPrato = somaNotas / avaliacoes.length;
          
          console.log(`📊 Prato ${prato.id} - Avaliações:`, avaliacoes.map(a => a.nota));
          console.log(`📊 Prato ${prato.id} - Soma: ${somaNotas}, Média: ${mediaPrato.toFixed(2)}`);
          
          resultadosPratos.push({
            usuario_id: prato.id_usuario,
            media: mediaPrato
          });
          
          // Verificar se é o melhor prato (ou empate)
          if (mediaPrato > melhorMedia) {
            melhorMedia = mediaPrato;
            vencedoresIds = [prato.id_usuario]; // Novo vencedor único
          } else if (mediaPrato === melhorMedia) {
            vencedoresIds.push(prato.id_usuario); // Empate - adicionar vencedor
          }
          
          // Atualizar pontos do usuário (média da rodada) - SEM ARREDONDAR
          const pontosGanhos = mediaPrato; // Média exata: 7.75 = 7.75 pontos
          
          console.log(`💰 Usuário ${prato.id_usuario} ganhou ${pontosGanhos.toFixed(2)} pontos (média: ${mediaPrato.toFixed(2)})`);
          
          // Buscar perfil atual
          console.log(`🔍 Buscando perfil atual do usuário ${prato.id_usuario}...`);
          const { data: perfilData, error: errorPerfil } = await supabase
            .from('perfis')
            .select('pontos_totais, jogos_participados')
            .eq('id', prato.id_usuario)
            .single();
          
          if (errorPerfil) {
            console.error(`❌ Erro ao buscar perfil do usuário ${prato.id_usuario}:`, errorPerfil);
            continue; // Pula para o próximo prato
          }
          
          const pontosAtuais = perfilData?.pontos_totais || 0;
          const jogosAtuais = perfilData?.jogos_participados || 0;
          
          console.log(`📊 Perfil atual - Pontos: ${pontosAtuais}, Jogos: ${jogosAtuais}`);
          console.log(`📊 Novo total - Pontos: ${pontosAtuais + pontosGanhos}, Jogos: ${jogosAtuais + 1}`);
          
          // Atualizar perfil
          console.log(`💾 Atualizando perfil do usuário ${prato.id_usuario}...`);
          const { error: updateError } = await supabase
            .from('perfis')
            .upsert({ 
              id: prato.id_usuario,
              pontos_totais: pontosAtuais + pontosGanhos,
              jogos_participados: jogosAtuais + 1
            }, {
              onConflict: 'id'
            });
          
          if (updateError) {
            console.error(`❌ Erro ao atualizar perfil de ${prato.id_usuario}:`, updateError);
            console.error(`❌ Detalhes do erro:`, JSON.stringify(updateError, null, 2));
          } else {
            console.log(`✅ Perfil atualizado com sucesso: ${prato.id_usuario} - Total: ${(pontosAtuais + pontosGanhos).toFixed(2)} pontos, ${jogosAtuais + 1} jogos`);
          }
        } else {
          // Mesmo sem avaliações, incrementar jogos participados
          console.log(`⚠️ Prato ${prato.id} sem avaliações, mas contabilizando jogo`);
          
          const { data: perfilData, error: errorPerfil } = await supabase
            .from('perfis')
            .select('jogos_participados')
            .eq('id', prato.id_usuario)
            .single();
          
          if (errorPerfil) {
            console.error(`❌ Erro ao buscar perfil do usuário ${prato.id_usuario}:`, errorPerfil);
            continue;
          }
          
          const jogosAtuais = perfilData?.jogos_participados || 0;
          
          console.log(`💾 Atualizando jogos participados do usuário ${prato.id_usuario}...`);
          const { error: updateError } = await supabase
            .from('perfis')
            .upsert({ 
              id: prato.id_usuario,
              jogos_participados: jogosAtuais + 1
            }, {
              onConflict: 'id'
            });
          
          if (updateError) {
            console.error(`❌ Erro ao atualizar jogos participados de ${prato.id_usuario}:`, updateError);
          } else {
            console.log(`✅ Jogos participados atualizado: ${jogosAtuais + 1}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar prato ${prato.id}:`, error);
        console.error(`❌ Stack trace:`, error.stack);
        continue; // Pula para o próximo prato
      }
    }
  
    // Atualizar vitórias dos vencedores (pode haver empate)
    if (vencedoresIds.length > 0) {
      console.log(`\n🏆 Vencedores identificados: ${vencedoresIds.length} usuário(s) com média ${melhorMedia.toFixed(2)}`);
      console.log(`🏆 IDs dos vencedores:`, vencedoresIds);
      
      // Dar vitória para todos os vencedores
      for (const vencedorId of vencedoresIds) {
        try {
          const { data: perfilVencedor, error: errorVencedor } = await supabase
            .from('perfis')
            .select('vitorias')
            .eq('id', vencedorId)
            .single();
          
          if (errorVencedor) {
            console.error(`❌ Erro ao buscar perfil do vencedor ${vencedorId}:`, errorVencedor);
          } else {
            const vitoriasAtuais = perfilVencedor?.vitorias || 0;
            
            const { error: vitoriaError } = await supabase
              .from('perfis')
              .upsert({ 
                id: vencedorId,
                vitorias: vitoriasAtuais + 1 
              }, {
                onConflict: 'id'
              });
            
            if (vitoriaError) {
              console.error(`❌ Erro ao atualizar vitória de ${vencedorId}:`, vitoriaError);
            } else {
              console.log(`✅ Vitória registrada para ${vencedorId}: ${vitoriasAtuais + 1} vitórias`);
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao processar vitória de ${vencedorId}:`, error);
        }
      }
      
      // Mostrar mensagem de empate se houver
      if (vencedoresIds.length > 1) {
        console.log(`🎉 EMPATE! ${vencedoresIds.length} usuários empataram com ${melhorMedia.toFixed(2)} pontos!`);
      }
    } else {
      console.log(`⚠️ Nenhum vencedor definido (sem avaliações)`);
    }
    
    // Atualizar média geral de todos os participantes (que enviaram pratos)
    console.log(`\n📊 Atualizando médias gerais...`);
    for (const prato of pratos) {
      try {
        await atualizarMediaGeral(prato.id_usuario);
      } catch (error) {
        console.error(`❌ Erro ao atualizar média geral do usuário ${prato.id_usuario}:`, error);
      }
    }
    
    // IMPORTANTE: Incrementar jogos_participados de TODOS que votaram (não só quem enviou prato)
    console.log(`\n📊 Atualizando jogos participados de todos os votantes...`);
    
    try {
      // Buscar todos os usuários que votaram nesta rodada
      const pratoIds = pratos.map(p => p.id);
      const { data: todasAvaliacoes, error: errorAvaliacoes } = await supabase
        .from('avaliacoes')
        .select('id_votante')
        .in('id_prato', pratoIds);
      
      if (errorAvaliacoes) {
        console.error(`❌ Erro ao buscar avaliações:`, errorAvaliacoes);
      } else {
        // Usuários únicos que votaram
        const usuariosQueVotaram = [...new Set(todasAvaliacoes?.map(a => a.id_votante) || [])];
        
        console.log(`📊 Total de usuários que votaram: ${usuariosQueVotaram.length}`);
        
        for (const usuarioId of usuariosQueVotaram) {
          try {
            // Verificar se este usuário JÁ foi contabilizado (se enviou prato)
            const jaContabilizado = pratos.some(p => p.id_usuario === usuarioId);
            
            if (!jaContabilizado) {
              // Usuário votou mas NÃO enviou prato - incrementar jogos_participados
              console.log(`👤 Usuário ${usuarioId}: Votou mas não enviou prato - incrementando participação`);
              
              const { data: perfilData, error: errorPerfil } = await supabase
                .from('perfis')
                .select('jogos_participados')
                .eq('id', usuarioId)
                .single();
              
              if (errorPerfil) {
                console.error(`❌ Erro ao buscar perfil do usuário ${usuarioId}:`, errorPerfil);
                continue;
              }
              
              const jogosAtuais = perfilData?.jogos_participados || 0;
              
              const { error: updateError } = await supabase
                .from('perfis')
                .upsert({ 
                  id: usuarioId,
                  jogos_participados: jogosAtuais + 1
                }, {
                  onConflict: 'id'
                });
              
              if (updateError) {
                console.error(`❌ Erro ao atualizar jogos participados do usuário ${usuarioId}:`, updateError);
              } else {
                console.log(`✅ Jogos participados atualizado: ${jogosAtuais + 1}`);
              }
            } else {
              console.log(`👤 Usuário ${usuarioId}: Enviou prato - já foi contabilizado`);
            }
          } catch (error) {
            console.error(`❌ Erro ao processar usuário ${usuarioId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao processar votantes:`, error);
    }
    
    console.log(`\n✅ Cálculo de resultados concluído!`);
    console.log(`📊 Resumo: ${resultadosPratos.length} pratos processados, ${pratos.length} pratos totais`);
    
  } catch (error) {
    console.error(`❌ Erro geral na função calcularResultadosDaRodada:`, error);
    console.error(`❌ Stack trace:`, error.stack);
  }
}

async function atualizarMediaGeral(usuarioId) {
  // Buscar todas as avaliações que este usuário recebeu
  const { data: todasAvaliacoes } = await supabase
    .from('avaliacoes')
    .select('nota, pratos!inner(id_usuario)')
    .eq('pratos.id_usuario', usuarioId);
  
  if (todasAvaliacoes && todasAvaliacoes.length > 0) {
    const somaTotal = todasAvaliacoes.reduce((sum, av) => sum + av.nota, 0);
    const mediaGeral = somaTotal / todasAvaliacoes.length;
    
    // Usar upsert para criar ou atualizar
    await supabase
      .from('perfis')
      .upsert({ 
        id: usuarioId,
        media_geral: parseFloat(mediaGeral.toFixed(2)) 
      });
  }
}

// ========================================================================
// 5. UPLOAD DE IMAGENS E CRIAÇÃO DE PRATOS
// ========================================================================

async function enviarPrato() {
  if (!RODADA_ABERTA) {
    alert("Não há rodada aberta! Crie uma rodada primeiro.");
    return;
  }

  if (!USUARIO_LOGADO) {
    alert("Você precisa estar logado!");
    return;
  }

  const nomePrato = document.getElementById('input-nome-prato').value.trim();
  const arquivoInput = document.getElementById('input-imagem-prato');
  const statusEl = document.getElementById('status-upload');
  const btnEnviar = document.getElementById('btn-enviar-prato');

  // ⚠️ VALIDAÇÃO: Verificar se o usuário já enviou um prato nesta rodada
  const { data: pratosExistentes, error: checkError } = await supabase
    .from('pratos')
    .select('id')
    .eq('rodada_id', RODADA_ABERTA.id)
    .eq('id_usuario', USUARIO_LOGADO.id);

  if (checkError) {
    console.error("Erro ao verificar pratos:", checkError);
    statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Erro ao verificar seus pratos!</p>';
    return;
  }

  if (pratosExistentes && pratosExistentes.length > 0) {
    statusEl.innerHTML = '<p class="text-orange-600 font-bold">⚠️ Você já enviou um prato nesta rodada!</p>';
    alert("⚠️ Você já enviou um prato nesta rodada!\nCada usuário pode enviar apenas 1 prato por rodada.");
    return;
  }

  // Validações
  if (!nomePrato) {
    statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Digite o nome do prato!</p>';
    return;
  }

  if (!arquivoInput.files || arquivoInput.files.length === 0) {
    statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Selecione uma imagem!</p>';
    return;
  }

  const arquivo = arquivoInput.files[0];

  // Validar tipo de arquivo
  if (!arquivo.type.startsWith('image/')) {
    statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Selecione uma imagem válida!</p>';
    return;
  }

  // Validar tamanho (máx 5MB)
  if (arquivo.size > 5 * 1024 * 1024) {
    statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Imagem muito grande! Máximo 5MB.</p>';
    return;
  }

  btnEnviar.disabled = true;
  statusEl.innerHTML = '<p class="text-blue-600">📤 Enviando imagem...</p>';

  // Criar nome único para o arquivo
  const extensao = arquivo.name.split('.').pop();
  const nomeArquivo = `${USUARIO_LOGADO.id}/${Date.now()}.${extensao}`;

  try {
    // 1. Fazer upload da imagem para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pratos-imagens')
      .upload(nomeArquivo, arquivo);

    if (uploadError) {
      console.error("Erro no upload:", uploadError);
      statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Erro ao enviar imagem!</p>';
      btnEnviar.disabled = false;
      return;
    }

    // 2. Obter URL pública da imagem
    const { data: urlData } = supabase.storage
      .from('pratos-imagens')
      .getPublicUrl(nomeArquivo);

    const urlImagem = urlData.publicUrl;

    statusEl.innerHTML = '<p class="text-blue-600">💾 Salvando prato no banco...</p>';

    // 3. Criar registro do prato no banco de dados
    const { data: pratoData, error: pratoError } = await supabase
      .from('pratos')
      .insert([{
        nome_prato: nomePrato,
        url_imagem: urlImagem,
        rodada_id: RODADA_ABERTA.id,
        id_usuario: USUARIO_LOGADO.id
      }])
      .select();

    if (pratoError) {
      console.error("Erro ao salvar prato:", pratoError);
      statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Erro ao salvar prato!</p>';
      btnEnviar.disabled = false;
      return;
    }

    // Sucesso!
    statusEl.innerHTML = '<p class="text-green-600 font-bold">✅ Prato enviado com sucesso!</p>';
    
    // Limpar formulário
    document.getElementById('input-nome-prato').value = '';
    arquivoInput.value = '';
    document.getElementById('texto-imagem-selecionada').textContent = 'Selecionar Foto';
    
    // Recarregar feed para mostrar o novo prato (sempre, independente da página)
    await carregarFeed();

    setTimeout(() => {
      statusEl.innerHTML = '<p class="text-blue-600">📱 Prato adicionado ao feed!</p>';
      btnEnviar.disabled = false;
    }, 2000);
    
    setTimeout(() => {
      statusEl.innerHTML = '';
    }, 5000);

  } catch (err) {
    console.error("Erro inesperado:", err);
    statusEl.innerHTML = '<p class="text-red-600 font-bold">❌ Erro inesperado!</p>';
    btnEnviar.disabled = false;
  }
}

// ========================================================================
// 3. LÓGICA DA PÁGINA FEED E VOTAÇÃO
// ========================================================================

async function carregarFeed() {
  // Buscar TODAS as rodadas (ordenadas da mais recente para a mais antiga)
  const { data: rodadas, error } = await supabase
    .from('rodadas')
    .select('*')
    .order('id', { ascending: false }); // Mais recente primeiro
  
  const container = document.getElementById('rodadas-container');
  
  if (error || !rodadas || rodadas.length === 0) {
    container.innerHTML = `
      <div class="w-full h-96 flex flex-col items-center justify-center text-center px-4">
        <span class="material-symbols-outlined text-8xl text-primary mb-4">restaurant</span>
        <h2 class="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
          Nenhuma Rodada Criada
        </h2>
        <p class="text-text-light/70 dark:text-text-dark/70 mb-6">
          Crie a primeira rodada para começar o jogo!
        </p>
        <button 
          onclick="document.querySelector('[data-target=page-gestao]').click()"
          class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span class="material-symbols-outlined">add_circle</span>
          Começar Jogo
        </button>
      </div>
    `;
    RODADA_ABERTA = null;
    return;
  }
  
  // Armazenar a rodada aberta (se houver)
  RODADA_ABERTA = rodadas.find(r => r.status === 'votacao_aberta') || null;
  
  // Limpar container
  container.innerHTML = '';
  
  // Criar um card para cada rodada
  for (const rodada of rodadas) {
    await criarCardRodada(rodada, container);
  }
}

async function criarCardRodada(rodada, container) {
  // Criar elemento da rodada
  const rodadaElement = document.createElement('div');
  rodadaElement.className = 'rodada-item mb-8';
  rodadaElement.dataset.rodadaId = rodada.id;
  
  // Cabeçalho da rodada
  const statusBadge = rodada.status === 'finalizada' 
    ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><span class="material-symbols-outlined text-sm">flag</span>Finalizada</span>'
    : rodada.status === 'votacao_aberta'
    ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><span class="material-symbols-outlined text-sm">how_to_vote</span>Votação Aberta</span>'
    : '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"><span class="material-symbols-outlined text-sm">schedule</span>Próxima</span>';
  
  const header = `
    <div class="px-4 mb-4">
      <div class="flex items-center justify-between">
        <h3 class="text-2xl font-bold text-text-light dark:text-text-dark">
          ${rodada.nome}
        </h3>
        ${statusBadge}
      </div>
    </div>
  `;
  
  // Buscar pratos desta rodada (com perfil do dono)
  const { data: pratos, error } = await supabase
    .from('pratos')
    .select('*, perfis(nome_completo)')
    .eq('rodada_id', rodada.id);
  
  if (error) {
    console.error(`Erro ao buscar pratos da rodada ${rodada.id}:`, error);
    return;
  }
  
  // Se não há pratos
  if (!pratos || pratos.length === 0) {
    rodadaElement.innerHTML = `
      ${header}
      <div class="w-full h-64 flex flex-col items-center justify-center text-center px-4 bg-background-light/50 dark:bg-background-dark/50 rounded-xl mx-4">
        <span class="material-symbols-outlined text-6xl text-primary mb-2">upload</span>
        <p class="text-text-light/70 dark:text-text-dark/70">
          Aguardando pratos nesta rodada...
        </p>
      </div>
    `;
    container.appendChild(rodadaElement);
    return;
  }

  // Container do carrossel
  const carouselId = `carousel-${rodada.id}`;
  const dotsId = `dots-${rodada.id}`;
  
  rodadaElement.innerHTML = `
    ${header}
    <div class="relative">
      <!-- Seta esquerda (apenas desktop) -->
      <button
        id="${carouselId}-prev"
        class="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto"
        aria-label="Imagem anterior"
      >
        <span class="material-symbols-outlined text-gray-600 dark:text-gray-300">chevron_left</span>
      </button>
      
      <!-- Seta direita (apenas desktop) -->
      <button
        id="${carouselId}-next"
        class="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto"
        aria-label="Próxima imagem"
      >
        <span class="material-symbols-outlined text-gray-600 dark:text-gray-300">chevron_right</span>
      </button>
      
      <div
        id="${carouselId}"
        class="w-full overflow-x-scroll snap-x snap-mandatory flex scrollbar-hide"
        style="scroll-padding: 0; scroll-behavior: smooth"
      ></div>
      <div
        id="${dotsId}"
        class="flex justify-center gap-2 mt-4 px-4"
      ></div>
    </div>
  `;
  
  container.appendChild(rodadaElement);
  
  // Renderizar pratos no carrossel
  exibirPratosNoCarrossel(pratos, rodada, carouselId, dotsId);
}

// ========================================================================
// 4. LÓGICA DE COMENTÁRIOS, CURTIDAS E RESPOSTAS
// ========================================================================

async function carregarComentarios(idPrato, containerComentarios) {
  const { data: comentarios, error } = await supabase
    .from('comentarios')
    .select('*, perfis(nome_completo, url_foto)')
    .eq('id_prato', idPrato)
    .is('id_comentario_pai', null) // Apenas comentários principais (não respostas)
    .order('data_envio', { ascending: true });

  if (error) {
    console.error("Erro ao carregar comentários:", error);
    containerComentarios.innerHTML = `<p class="text-xs text-red-500">Erro ao carregar comentários.</p>`;
    return;
  }

  if (!comentarios || comentarios.length === 0) {
    containerComentarios.innerHTML = `<p class="text-xs text-black/40 dark:text-white/40 italic">Nenhum comentário ainda. Seja o primeiro!</p>`;
    return;
  }

  containerComentarios.innerHTML = '';
  
  for (const comentario of comentarios) {
    const divComentario = await criarElementoComentario(comentario, idPrato);
    containerComentarios.appendChild(divComentario);
  }
}

async function criarElementoComentario(comentario, idPrato, isResposta = false) {
  const nomeUsuario = comentario.perfis?.nome_completo || 'Anónimo';
  const urlFoto = comentario.perfis?.url_foto;
  
  // Buscar curtidas deste comentário
  const { data: curtidas } = await supabase
    .from('curtidas_comentarios')
    .select('id_usuario')
    .eq('id_comentario', comentario.id);
  
  const totalCurtidas = curtidas?.length || 0;
  const euCurti = curtidas?.some(c => c.id_usuario === USUARIO_LOGADO?.id) || false;
  
  // Buscar respostas se for comentário principal
  let respostas = [];
  if (!isResposta) {
    const { data: respostasData } = await supabase
      .from('comentarios')
      .select('*, perfis(nome_completo, url_foto)')
      .eq('id_comentario_pai', comentario.id)
      .order('data_envio', { ascending: true });
    respostas = respostasData || [];
  }
  
  const divComentario = document.createElement('div');
  divComentario.className = `${isResposta ? 'ml-8 mt-2' : ''} bg-black/5 dark:bg-white/5 p-3 rounded-lg`;
  divComentario.dataset.comentarioId = comentario.id;
  
  // Criar elemento de foto do usuário
  const fotoElement = urlFoto 
    ? `<img src="${urlFoto}" alt="${nomeUsuario}" class="w-8 h-8 rounded-full object-cover" />`
    : `<div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">${nomeUsuario.charAt(0).toUpperCase()}</div>`;
  
  divComentario.innerHTML = `
    <div class="flex items-start gap-2">
      <div class="flex-shrink-0">
        ${fotoElement}
      </div>
      <div class="flex-grow">
        <p class="text-xs font-bold text-black/80 dark:text-white/80">${nomeUsuario}</p>
        <p class="text-sm text-black/80 dark:text-white/80 mt-1">${comentario.texto_comentario}</p>
        
        <div class="flex items-center gap-4 mt-2">
          <button class="btn-curtir flex items-center gap-1 text-xs ${euCurti ? 'text-red-500' : 'text-black/60 dark:text-white/60'} hover:text-red-500 transition-colors">
            <span class="material-symbols-outlined text-base">${euCurti ? 'favorite' : 'favorite_border'}</span>
            <span class="curtidas-count">${totalCurtidas > 0 ? totalCurtidas : ''}</span>
          </button>
          
          ${!isResposta ? `
            <button class="btn-responder text-xs text-black/60 dark:text-white/60 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-base">reply</span>
              Responder
            </button>
          ` : ''}
        </div>
        
        ${!isResposta && respostas.length > 0 ? `
          <div class="respostas-container mt-2"></div>
        ` : ''}
        
        ${!isResposta ? `
          <div class="form-resposta hidden mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Escrever resposta..."
              class="input-resposta flex-grow block w-full rounded-full border-gray-300 shadow-sm text-xs focus:border-primary focus:ring-primary/50 dark:bg-background-dark dark:border-gray-600"
            />
            <button class="btn-enviar-resposta p-1.5 rounded-full bg-primary text-white hover:bg-primary/90">
              <span class="material-symbols-outlined text-sm">send</span>
            </button>
            <button class="btn-cancelar-resposta p-1.5 rounded-full bg-gray-400 text-white hover:bg-gray-500">
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Configurar eventos de curtir
  const btnCurtir = divComentario.querySelector('.btn-curtir');
  btnCurtir.addEventListener('click', () => toggleCurtida(comentario.id, divComentario));
  
  // Configurar eventos de responder (apenas em comentários principais)
  if (!isResposta) {
    const btnResponder = divComentario.querySelector('.btn-responder');
    const formResposta = divComentario.querySelector('.form-resposta');
    const inputResposta = divComentario.querySelector('.input-resposta');
    const btnEnviarResposta = divComentario.querySelector('.btn-enviar-resposta');
    const btnCancelarResposta = divComentario.querySelector('.btn-cancelar-resposta');
    
    btnResponder.addEventListener('click', () => {
      formResposta.classList.toggle('hidden');
      if (!formResposta.classList.contains('hidden')) {
        inputResposta.focus();
      }
    });
    
    btnCancelarResposta.addEventListener('click', () => {
      formResposta.classList.add('hidden');
      inputResposta.value = '';
    });
    
    btnEnviarResposta.addEventListener('click', () => {
      adicionarResposta(comentario.id, idPrato, inputResposta.value, divComentario);
    });
    
    inputResposta.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        adicionarResposta(comentario.id, idPrato, inputResposta.value, divComentario);
      }
    });
    
    // Renderizar respostas existentes
    if (respostas.length > 0) {
      const respostasContainer = divComentario.querySelector('.respostas-container');
      for (const resposta of respostas) {
        const divResposta = await criarElementoComentario(resposta, idPrato, true);
        respostasContainer.appendChild(divResposta);
      }
    }
  }
  
  return divComentario;
}

async function toggleCurtida(idComentario, elementoComentario) {
  if (!USUARIO_LOGADO) {
    alert("Faça login para curtir!");
    return;
  }
  
  // Verificar se já curtiu
  const { data: curtidasExistentes } = await supabase
    .from('curtidas_comentarios')
    .select('id')
    .eq('id_comentario', idComentario)
    .eq('id_usuario', USUARIO_LOGADO.id);
  
  const btnCurtir = elementoComentario.querySelector('.btn-curtir');
  const iconeCurtir = btnCurtir.querySelector('.material-symbols-outlined');
  const contadorCurtidas = btnCurtir.querySelector('.curtidas-count');
  
  if (curtidasExistentes && curtidasExistentes.length > 0) {
    // Descurtir
    const { error } = await supabase
      .from('curtidas_comentarios')
      .delete()
      .eq('id', curtidasExistentes[0].id);
    
    if (!error) {
      iconeCurtir.textContent = 'favorite_border';
      btnCurtir.classList.remove('text-red-500');
      btnCurtir.classList.add('text-black/60', 'dark:text-white/60');
      
      // Atualizar contador
      const { data: curtidas } = await supabase
        .from('curtidas_comentarios')
        .select('id')
        .eq('id_comentario', idComentario);
      contadorCurtidas.textContent = curtidas?.length > 0 ? curtidas.length : '';
    }
  } else {
    // Curtir
    const { error } = await supabase
      .from('curtidas_comentarios')
      .insert({ id_comentario: idComentario, id_usuario: USUARIO_LOGADO.id });
    
    if (!error) {
      iconeCurtir.textContent = 'favorite';
      btnCurtir.classList.add('text-red-500');
      btnCurtir.classList.remove('text-black/60', 'dark:text-white/60');
      
      // Atualizar contador
      const { data: curtidas } = await supabase
        .from('curtidas_comentarios')
        .select('id')
        .eq('id_comentario', idComentario);
      contadorCurtidas.textContent = curtidas?.length || 1;
    }
  }
}

async function adicionarResposta(idComentarioPai, idPrato, textoResposta, elementoComentario) {
  if (!USUARIO_LOGADO) {
    alert("Faça login para responder!");
    return;
  }

  if (!textoResposta || textoResposta.trim() === '') {
    alert("Digite uma resposta!");
    return;
  }

  const { data: novaResposta, error } = await supabase
    .from('comentarios')
    .insert({
      id_prato: idPrato,
      id_usuario: USUARIO_LOGADO.id,
      texto_comentario: textoResposta.trim(),
      id_comentario_pai: idComentarioPai
    })
    .select('*, perfis(nome_completo, url_foto)')
    .single();
  
  if (error) {
    console.error("Erro ao adicionar resposta:", error);
    alert("Erro ao enviar resposta!");
    return;
  }

  // Limpar input e esconder form
  const inputResposta = elementoComentario.querySelector('.input-resposta');
  const formResposta = elementoComentario.querySelector('.form-resposta');
  inputResposta.value = '';
  formResposta.classList.add('hidden');
  
  // Adicionar resposta ao DOM
  let respostasContainer = elementoComentario.querySelector('.respostas-container');
  if (!respostasContainer) {
    respostasContainer = document.createElement('div');
    respostasContainer.className = 'respostas-container mt-2';
    elementoComentario.querySelector('.form-resposta').before(respostasContainer);
  }
  
  const divResposta = await criarElementoComentario(novaResposta, idPrato, true);
  respostasContainer.appendChild(divResposta);
}

async function adicionarComentario(idPrato, textoComentario, inputElement, containerComentarios) {
  if (!USUARIO_LOGADO) {
    alert("Você precisa estar logado para comentar!");
    return;
  }

  if (!textoComentario || textoComentario.trim() === '') {
    alert("Digite um comentário antes de enviar!");
    return;
  }

  const { error } = await supabase.from('comentarios').insert([{
    id_prato: idPrato,
    id_usuario: USUARIO_LOGADO.id,
    texto_comentario: textoComentario.trim()
  }]);

  if (error) {
    console.error("Erro ao adicionar comentário:", error);
    alert("Erro ao enviar comentário. Tente novamente.");
    return;
  }

  // Limpar input e recarregar comentários
  inputElement.value = '';
  carregarComentarios(idPrato, containerComentarios);
}


function exibirPratosNoCarrossel(pratos, rodada, carouselId, dotsId) {
  const container = document.getElementById(carouselId);
  const dotsContainer = document.getElementById(dotsId);
  const molde = document.querySelector('#molde-prato');
  
  if (!container || !dotsContainer || !molde) {
    console.error('Elementos do carrossel não encontrados');
    return;
  }

  container.innerHTML = '';
  dotsContainer.innerHTML = '';

  pratos.forEach((prato, index) => {
    const cartaoPrato = molde.cloneNode(true);
    cartaoPrato.classList.remove('hidden');
    cartaoPrato.removeAttribute('id');
    cartaoPrato.dataset.index = index;
    
    const imagemElement = cartaoPrato.querySelector('.prato-imagem');
    imagemElement.src = prato.url_imagem;
    imagemElement.addEventListener('click', () => abrirModalImagem(prato.url_imagem));
    
    cartaoPrato.querySelector('.prato-nome').textContent = prato.nome_prato;
    
    // Revelar nome do dono se a rodada estiver finalizada
    const nomeAutor = (rodada && rodada.status === 'finalizada') 
      ? (prato.perfis?.nome_completo || 'Autor Desconhecido')
      : 'Dono Misterioso';
    cartaoPrato.querySelector('.prato-autor').textContent = nomeAutor;
    
    // Mostrar status da rodada se estiver finalizada
    if (rodada && rodada.status === 'finalizada') {
      const statusRodada = document.createElement('div');
      statusRodada.className = 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3 text-center';
      statusRodada.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-green-600 dark:text-green-400">flag</span>
          <span class="text-sm font-bold text-green-700 dark:text-green-300">🏁 Rodada Finalizada</span>
        </div>
        <p class="text-xs text-green-600 dark:text-green-400 mt-1">Esta rodada já foi encerrada</p>
      `;
      
      // Inserir antes da seção de estrelas
      const secaoEstrelas = cartaoPrato.querySelector('.rating-stars');
      secaoEstrelas.parentNode.insertBefore(statusRodada, secaoEstrelas);
    }
    
    const secaoEstrelas = cartaoPrato.querySelector('.rating-stars');
    const todasEstrelas = secaoEstrelas.querySelectorAll('div[data-value]');
    
    // Verificar se é o próprio prato do usuário
    const ehMeuPrato = USUARIO_LOGADO && prato.id_usuario === USUARIO_LOGADO.id;
    
    if (ehMeuPrato) {
      // Bloquear votação no próprio prato
      secaoEstrelas.innerHTML = `
        <p class="text-sm text-primary font-bold text-center py-2">
          ⭐ Seu prato - Você não pode votar
        </p>
      `;
    } else {
      // Carregar voto existente do usuário
      carregarVotoExistente(prato.id, todasEstrelas, secaoEstrelas);
    }

    // Configurar comentários
    const containerComentarios = cartaoPrato.querySelector('.comentarios-lista');
    const inputComentario = cartaoPrato.querySelector('.comentario-input');
    const botaoEnviar = cartaoPrato.querySelector('.comentario-enviar');

    // Carregar comentários existentes
    carregarComentarios(prato.id, containerComentarios);

    // Configurar envio de comentário
    botaoEnviar.addEventListener('click', () => {
      adicionarComentario(prato.id, inputComentario.value, inputComentario, containerComentarios);
    });

    // Enviar comentário com Enter
    inputComentario.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        adicionarComentario(prato.id, inputComentario.value, inputComentario, containerComentarios);
      }
    });

    container.appendChild(cartaoPrato);
    
    // Criar bolinha indicadora
    const dot = document.createElement('button');
    dot.className = `w-2 h-2 rounded-full transition-all ${index === 0 ? 'bg-primary w-6' : 'bg-black/30 dark:bg-white/30'}`;
    dot.dataset.index = index;
    dot.addEventListener('click', () => {
      const pratoElement = container.querySelector(`[data-index="${index}"]`);
      pratoElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    });
    dotsContainer.appendChild(dot);
  });
  
  // Atualizar bolinhas ao fazer scroll
  let scrollTimeout;
  container.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      
      // Calcular o índice baseado na posição do scroll
      // Cada card ocupa 100% da largura do container
      const currentIndex = Math.round(scrollLeft / containerWidth);
      const safeIndex = Math.max(0, Math.min(currentIndex, pratos.length - 1));
      
      const dots = dotsContainer.querySelectorAll('button');
      dots.forEach((dot, idx) => {
        if (idx === safeIndex) {
          dot.className = 'w-6 h-2 rounded-full bg-primary transition-all';
        } else {
          dot.className = 'w-2 h-2 rounded-full bg-black/30 dark:bg-white/30 transition-all';
        }
      });
    }, 50);
  });

  // Configurar setas de navegação (apenas desktop)
  const setaAnterior = document.getElementById(`${carouselId}-prev`);
  const setaProxima = document.getElementById(`${carouselId}-next`);

  if (setaAnterior && setaProxima) {
    setaAnterior.addEventListener('click', () => {
      const currentIndex = Math.round(container.scrollLeft / container.offsetWidth);
      const previousIndex = Math.max(0, currentIndex - 1);
      const targetScroll = previousIndex * container.offsetWidth;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    });

    setaProxima.addEventListener('click', () => {
      const currentIndex = Math.round(container.scrollLeft / container.offsetWidth);
      const nextIndex = Math.min(pratos.length - 1, currentIndex + 1);
      const targetScroll = nextIndex * container.offsetWidth;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    });

    // Atualizar visibilidade das setas baseado na posição
    const updateArrows = () => {
      const currentIndex = Math.round(container.scrollLeft / container.offsetWidth);
      
      // Esconder seta anterior se estiver no primeiro item
      if (currentIndex === 0) {
        setaAnterior.style.opacity = '0.3';
        setaAnterior.style.pointerEvents = 'none';
      } else {
        setaAnterior.style.opacity = '1';
        setaAnterior.style.pointerEvents = 'auto';
      }
      
      // Esconder seta próxima se estiver no último item
      if (currentIndex >= pratos.length - 1) {
        setaProxima.style.opacity = '0.3';
        setaProxima.style.pointerEvents = 'none';
      } else {
        setaProxima.style.opacity = '1';
        setaProxima.style.pointerEvents = 'auto';
      }
    };

    // Atualizar setas no scroll
    container.addEventListener('scroll', updateArrows);
    
    // Atualizar setas inicialmente
    updateArrows();
  }
}

async function carregarVotoExistente(idPrato, todasEstrelas, secaoEstrelas) {
  if (!USUARIO_LOGADO) return;
  
  // Verificar se a rodada está finalizada
  const { data: rodadaData } = await supabase
    .from('pratos')
    .select('rodadas(status)')
    .eq('id', idPrato)
    .single();
  
  if (rodadaData && rodadaData.rodadas && rodadaData.rodadas.status === 'finalizada') {
    // Rodada finalizada - bloquear votação
    secaoEstrelas.innerHTML = `
      <div class="text-center py-4">
        <span class="material-symbols-outlined text-4xl text-gray-400 mb-2">lock</span>
        <p class="text-sm font-bold text-gray-600 dark:text-gray-400">
          🏁 Rodada Finalizada
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Esta rodada já foi encerrada
        </p>
      </div>
    `;
    return;
  }
  
  // Buscar voto existente do usuário neste prato
  const { data: votos } = await supabase
    .from('avaliacoes')
    .select('nota')
    .eq('id_prato', idPrato)
    .eq('id_votante', USUARIO_LOGADO.id)
    .limit(1);
  
  const votoExistente = votos && votos.length > 0 ? votos[0] : null;
  
  if (votoExistente) {
    // Usuário já votou - mostrar voto permanentemente
    const notaVotada = votoExistente.nota;
    todasEstrelas.forEach(estrela => {
      const valor = parseInt(estrela.dataset.value);
      estrela.innerHTML = valor <= notaVotada ? estrelaCheia : estrelaVazia;
      if (valor <= notaVotada) {
        estrela.classList.add('text-primary');
        estrela.style.color = '#F97316'; // Laranja (primary) inline
      }
      estrela.style.cursor = 'default';
      estrela.style.pointerEvents = 'none';
    });
    
    // Mostrar mensagem
    const mensagem = document.createElement('p');
    mensagem.className = 'text-xs text-green-600 font-bold text-center mt-1';
    mensagem.textContent = `✅ Você votou: ${notaVotada} estrelas`;
    secaoEstrelas.appendChild(mensagem);
  } else {
    // Usuário ainda não votou - configurar interação
    configurarVotacao(idPrato, todasEstrelas, secaoEstrelas);
  }
}

async function configurarVotacao(idPrato, todasEstrelas, secaoEstrelas) {
    let votoJaFeito = false;

    // Verificar novamente se a rodada está finalizada (dupla verificação)
    const { data: rodadaData } = await supabase
      .from('pratos')
      .select('rodadas(status)')
      .eq('id', idPrato)
      .single();
    
    if (rodadaData && rodadaData.rodadas && rodadaData.rodadas.status === 'finalizada') {
      // Rodada finalizada - bloquear completamente
      todasEstrelas.forEach(estrela => {
        estrela.style.cursor = 'not-allowed';
        estrela.style.pointerEvents = 'none';
        estrela.style.opacity = '0.5';
      });
      return;
    }

    const pintar = (valor) => {
      todasEstrelas.forEach(estrela => {
      const valorEstrela = parseInt(estrela.dataset.value);
      estrela.innerHTML = valorEstrela <= parseInt(valor) ? estrelaCheia : estrelaVazia;
      });
    };

  todasEstrelas.forEach(estrela => {
    estrela.addEventListener('mouseover', () => {
      if (!votoJaFeito) {
        pintar(estrela.dataset.value);
      }
    });
    
    estrela.addEventListener('click', async () => {
      if (votoJaFeito) return;
        votoJaFeito = true;
      const nota = parseInt(estrela.dataset.value);
      
      // Pintar permanentemente
        pintar(nota);
      todasEstrelas.forEach(e => {
        const val = parseInt(e.dataset.value);
        if (val <= nota) {
          e.classList.add('text-primary');
          e.style.color = '#F97316'; // Laranja (primary) inline para garantir persistência
        }
        e.style.cursor = 'default';
        e.style.pointerEvents = 'none';
      });
      
      // Salvar voto
      await salvarAvaliacao(idPrato, nota, secaoEstrelas);
    });
    });
    
    secaoEstrelas.addEventListener('mouseout', () => {
    if (!votoJaFeito) pintar(0);
  });
}

async function salvarAvaliacao(idDoPrato, nota, elementoEstrelas) {
  if (!USUARIO_LOGADO) { 
    window.location.href = '/login.html'; 
    return;
  }

  console.log(`💾 Tentando salvar avaliação: Prato ${idDoPrato}, Nota ${nota}`);

  // VERIFICAR SE JÁ VOTOU ANTES DE TENTAR INSERIR (evita erro 409)
  const { data: votoExistente, error: checkError } = await supabase
    .from('avaliacoes')
    .select('id')
    .eq('id_prato', idDoPrato)
    .eq('id_votante', USUARIO_LOGADO.id)
    .limit(1);

  if (checkError) {
    console.error("❌ Erro ao verificar voto existente:", checkError);
    const mensagem = document.createElement('p');
    mensagem.className = 'text-xs text-center mt-1 font-bold text-red-500';
    mensagem.textContent = '❌ Erro ao verificar voto.';
    elementoEstrelas.appendChild(mensagem);
    return;
  }

  if (votoExistente && votoExistente.length > 0) {
    console.log('⚠️ Usuário já votou neste prato - bloqueando voto duplicado');
    const mensagem = document.createElement('p');
    mensagem.className = 'text-xs text-center mt-1 font-bold text-yellow-600';
    mensagem.textContent = '⚠️ Você já votou neste prato!';
    elementoEstrelas.appendChild(mensagem);
    return;
  }

  // Inserir avaliação
  const { data, error } = await supabase
    .from('avaliacoes')
    .insert([{ 
      id_prato: idDoPrato, 
      nota: nota, 
      id_votante: USUARIO_LOGADO.id 
    }]);

  if (error) {
    console.error("❌ Erro ao salvar a avaliação:", error);
    
    const mensagem = document.createElement('p');
    mensagem.className = 'text-xs text-center mt-1 font-bold';
    
    // Tratar diferentes tipos de erro
    if (error.code === '23505' || error.code === '409' || error.message?.includes('duplicate')) {
      // Erro de duplicata
      mensagem.className += ' text-yellow-600';
      mensagem.textContent = '⚠️ Você já votou neste prato!';
    } else if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('RLS')) {
      // Erro 403 - Política RLS (rodada finalizada)
      mensagem.className += ' text-red-600';
      mensagem.textContent = '🏁 Esta rodada já foi finalizada!';
      console.error('🚨 Rodada finalizada: Voto bloqueado pela política RLS');
    } else {
      // Outros erros
      mensagem.className += ' text-red-500';
      mensagem.textContent = '❌ Erro ao salvar o voto.';
    }
    
    elementoEstrelas.appendChild(mensagem);
  } else {
    console.log(`✅ Avaliação salva com sucesso: ${nota} estrelas para prato ${idDoPrato}`);
    const mensagem = document.createElement('p');
    mensagem.className = 'text-xs text-green-600 font-bold text-center mt-1';
    mensagem.textContent = `✅ Você votou: ${nota} estrelas`;
    elementoEstrelas.appendChild(mensagem);
    
    // Verificar se deve finalizar a rodada após este voto
    if (RODADA_ABERTA) {
      console.log('🔄 Verificando se deve finalizar a rodada após o voto...');
      await verificarEFinalizarRodada();
    }
  }
}

// ========================================================================
// 7. LÓGICA DA PÁGINA DE PERFIL
// ========================================================================

async function carregarPerfil() {
  if (!USUARIO_LOGADO) return;
  
  // Buscar dados do perfil
  const { data: perfilData, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', USUARIO_LOGADO.id)
    .limit(1);
  
  if (error) {
    console.error('Erro ao carregar perfil:', error);
    return;
  }
  
  const perfil = perfilData && perfilData.length > 0 ? perfilData[0] : null;
  
  // Preencher dados do perfil
  const inputNome = document.getElementById('input-nome-perfil');
  const inputEmail = document.getElementById('input-email-perfil');
  const fotoElement = document.getElementById('perfil-foto');
  const iniciaisElement = document.getElementById('perfil-iniciais');
  
  inputNome.value = perfil?.nome_completo || '';
  inputEmail.value = USUARIO_LOGADO.email || '';
  
  // Exibir foto ou iniciais
  if (perfil?.url_foto) {
    fotoElement.src = perfil.url_foto;
    fotoElement.classList.remove('hidden');
    iniciaisElement.classList.add('hidden');
  } else {
    // Mostrar iniciais
    const iniciais = obterIniciais(perfil?.nome_completo || USUARIO_LOGADO.email);
    iniciaisElement.textContent = iniciais;
    fotoElement.classList.add('hidden');
    iniciaisElement.classList.remove('hidden');
  }
  
  // Carregar estatísticas
  await carregarEstatisticas();
}

function obterIniciais(nome) {
  if (!nome) return '?';
  const palavras = nome.trim().split(' ').filter(p => p.length > 0);
  if (palavras.length === 0) return '?';
  if (palavras.length === 1) return palavras[0][0].toUpperCase();
  return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
}

async function carregarEstatisticas() {
  if (!USUARIO_LOGADO) return;
  
  // Buscar dados do perfil
  const { data: perfilData } = await supabase
    .from('perfis')
    .select('pontos_totais, jogos_participados, vitorias, media_geral')
    .eq('id', USUARIO_LOGADO.id)
    .limit(1);
  
  const perfil = perfilData && perfilData.length > 0 ? perfilData[0] : null;
  
  // Contar pratos
  const { count: totalPratos } = await supabase
    .from('pratos')
    .select('*', { count: 'exact', head: true })
    .eq('id_usuario', USUARIO_LOGADO.id);
  
  // Buscar a última rodada finalizada do usuário
  const { data: ultimoPrato } = await supabase
    .from('pratos')
    .select(`
      id,
      rodada_id,
      rodadas!inner(status)
    `)
    .eq('id_usuario', USUARIO_LOGADO.id)
    .eq('rodadas.status', 'finalizada')
    .order('rodada_id', { ascending: false })
    .limit(1);
  
  let ultimaNota = '-';
  
  if (ultimoPrato && ultimoPrato.length > 0) {
    // Buscar avaliações do último prato
    const { data: avaliacoes } = await supabase
      .from('avaliacoes')
      .select('nota')
      .eq('id_prato', ultimoPrato[0].id);
    
    if (avaliacoes && avaliacoes.length > 0) {
      const somaNotas = avaliacoes.reduce((sum, av) => sum + av.nota, 0);
      const media = somaNotas / avaliacoes.length;
      ultimaNota = media.toFixed(2);
    }
  }
  
  // Atualizar UI
  document.getElementById('stat-pratos').textContent = totalPratos || 0;
  document.getElementById('stat-pontos').textContent = (perfil?.pontos_totais || 0).toFixed(2);
  document.getElementById('stat-ultima-nota').textContent = ultimaNota;
}

async function salvarNomePerfil() {
  const inputNome = document.getElementById('input-nome-perfil');
  const statusEl = document.getElementById('status-nome');
  const btnSalvar = document.getElementById('btn-salvar-nome');
  
  const novoNome = inputNome.value.trim();
  
  if (!novoNome) {
    statusEl.innerHTML = '<span class="text-red-600">Digite um nome!</span>';
    return;
  }
  
  btnSalvar.disabled = true;
  statusEl.innerHTML = '<span class="text-blue-600">Salvando...</span>';
  
  // Verificar se perfil existe
  const { data: perfilData } = await supabase
    .from('perfis')
    .select('id')
    .eq('id', USUARIO_LOGADO.id)
    .limit(1);
  
  const perfilExistente = perfilData && perfilData.length > 0 ? perfilData[0] : null;
  
  let error;
  
  if (perfilExistente) {
    // Atualizar
    ({ error } = await supabase
      .from('perfis')
      .update({ nome_completo: novoNome })
      .eq('id', USUARIO_LOGADO.id));
  } else {
    // Inserir
    ({ error } = await supabase
      .from('perfis')
      .insert([{ id: USUARIO_LOGADO.id, nome_completo: novoNome }]));
  }
  
  if (error) {
    console.error('Erro ao salvar nome:', error);
    statusEl.innerHTML = '<span class="text-red-600">Erro ao salvar!</span>';
  } else {
    statusEl.innerHTML = '<span class="text-green-600 font-bold">✅ Nome salvo!</span>';
    
    // Atualizar iniciais
    const iniciaisElement = document.getElementById('perfil-iniciais');
    iniciaisElement.textContent = obterIniciais(novoNome);
    
    setTimeout(() => {
      statusEl.innerHTML = '';
    }, 3000);
  }
  
  btnSalvar.disabled = false;
}

async function alterarFotoPerfil(arquivo) {
  const statusEl = document.getElementById('status-nome');
  
  // Validar arquivo
  if (!arquivo.type.startsWith('image/')) {
    statusEl.innerHTML = '<span class="text-red-600">Selecione uma imagem!</span>';
    return;
  }
  
  if (arquivo.size > 2 * 1024 * 1024) { // 2MB
    statusEl.innerHTML = '<span class="text-red-600">Imagem muito grande! Máximo 2MB.</span>';
    return;
  }
  
  statusEl.innerHTML = '<span class="text-blue-600">Fazendo upload...</span>';
  
  // Nome único para o arquivo
  const extensao = arquivo.name.split('.').pop();
  const nomeArquivo = `${USUARIO_LOGADO.id}/perfil.${extensao}`;
  
  // Upload para o bucket 'perfis'
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('perfis')
    .upload(nomeArquivo, arquivo, { upsert: true }); // upsert = substitui se já existe
  
  if (uploadError) {
    console.error('Erro no upload:', uploadError);
    statusEl.innerHTML = '<span class="text-red-600">Erro ao fazer upload!</span>';
    return;
  }
  
  // Obter URL pública
  const { data: urlData } = supabase.storage
    .from('perfis')
    .getPublicUrl(nomeArquivo);
  
  const urlFoto = urlData.publicUrl;
  
  // Salvar URL no perfil
  const { error: updateError } = await supabase
    .from('perfis')
    .upsert([{ id: USUARIO_LOGADO.id, url_foto: urlFoto }]);
  
  if (updateError) {
    console.error('Erro ao salvar URL:', updateError);
    statusEl.innerHTML = '<span class="text-red-600">Erro ao salvar foto!</span>';
    return;
  }
  
  // Atualizar UI
  const fotoElement = document.getElementById('perfil-foto');
  const iniciaisElement = document.getElementById('perfil-iniciais');
  
  fotoElement.src = urlFoto;
  fotoElement.classList.remove('hidden');
  iniciaisElement.classList.add('hidden');
  
  statusEl.innerHTML = '<span class="text-green-600 font-bold">✅ Foto atualizada!</span>';
  setTimeout(() => {
    statusEl.innerHTML = '';
  }, 3000);
}

// ========================================================================
// 8. LÓGICA DA TABELA DE CLASSIFICAÇÃO
// ========================================================================

async function carregarTabela() {
  const container = document.getElementById('tabela-container');
  
  // Buscar todos os perfis com estatísticas
  const { data: perfis, error } = await supabase
    .from('perfis')
    .select('*')
    .not('nome_completo', 'is', null)
    .order('pontos_totais', { ascending: false })
    .order('vitorias', { ascending: false })
    .order('media_geral', { ascending: false });
  
  if (error) {
    console.error('Erro ao carregar classificação:', error);
    container.innerHTML = '<p class="text-center p-8 text-red-600">Erro ao carregar classificação</p>';
    return;
  }
  
  if (!perfis || perfis.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center">
        <span class="material-symbols-outlined text-6xl text-text-light/30 dark:text-text-dark/30 mb-4">person_off</span>
        <p class="text-text-light/60 dark:text-text-dark/60">
          Nenhum jogador encontrado
        </p>
      </div>
    `;
    return;
  }
  
  // Usar estatísticas já salvas no banco (não recalcular)
  const perfisComStats = perfis.map((perfil) => {
    return {
      ...perfil,
      // Usar jogos_participados do banco (já calculado corretamente)
      jogos: perfil.jogos_participados || 0
    };
  });
  
  // Renderizar tabela
  container.innerHTML = '';
  
  perfisComStats.forEach((perfil, index) => {
    const posicao = index + 1;
    const iniciais = obterIniciais(perfil.nome_completo);
    
    // Definir cor da medalha para top 3
    let medalha = '';
    if (posicao === 1) medalha = '<span class="text-2xl">🥇</span>';
    else if (posicao === 2) medalha = '<span class="text-2xl">🥈</span>';
    else if (posicao === 3) medalha = '<span class="text-2xl">🥉</span>';
    
    // Destacar usuário atual
    const isUsuarioAtual = USUARIO_LOGADO && perfil.id === USUARIO_LOGADO.id;
    const bgClass = isUsuarioAtual 
      ? 'bg-primary/10 border-l-4 border-primary' 
      : 'hover:bg-black/5 dark:hover:bg-white/5';
    
    const linhaHTML = `
      <div class="grid grid-cols-12 gap-2 p-4 items-center ${bgClass} transition-colors">
        <!-- Posição -->
        <div class="col-span-1 text-center font-bold text-sm">
          ${medalha || posicao + 'º'}
        </div>
        
        <!-- Jogador (Foto + Nome) -->
        <div class="col-span-6 flex items-center gap-2">
          <div class="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            ${perfil.url_foto 
              ? `<img src="${perfil.url_foto}" alt="${perfil.nome_completo}" class="w-full h-full object-cover" />`
              : `<span>${iniciais}</span>`
            }
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-sm truncate ${isUsuarioAtual ? 'text-primary' : ''}">
              ${perfil.nome_completo}
              ${isUsuarioAtual ? '<span class="text-xs">(Você)</span>' : ''}
            </p>
          </div>
        </div>
        
        <!-- P - Pontos Totais -->
        <div class="col-span-2 text-center font-bold text-primary text-base">
          ${(perfil.pontos_totais || 0).toFixed(2)}
        </div>
        
        <!-- J - Jogos -->
        <div class="col-span-2 text-center text-sm">
          ${perfil.jogos}
        </div>
        
        <!-- V - Vitórias -->
        <div class="col-span-1 text-center text-sm font-semibold">
          ${perfil.vitorias || 0}
        </div>
      </div>
    `;
    
    container.innerHTML += linhaHTML;
  });
}

// ========================================================================
// 9. FUNÇÃO DE LOGOUT
// ========================================================================

async function fazerLogout() {
  const confirmacao = confirm('Tem certeza que deseja sair?');
  
  if (!confirmacao) return;
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Erro ao fazer logout:', error);
    alert('Erro ao sair. Tente novamente.');
  } else {
    // Limpar dados locais
    USUARIO_LOGADO = null;
    RODADA_ABERTA = null;
    
    // Redirecionar para página de login
    window.location.href = '/login.html';
  }
}

// ========================================================================
// CONFIGURAR EVENT LISTENERS
// ========================================================================

// Event listeners do perfil
document.getElementById('btn-salvar-nome')?.addEventListener('click', salvarNomePerfil);

document.getElementById('btn-editar-foto')?.addEventListener('click', () => {
  document.getElementById('input-foto-perfil').click();
});

document.getElementById('input-foto-perfil')?.addEventListener('change', (e) => {
  const arquivo = e.target.files[0];
  if (arquivo) {
    alterarFotoPerfil(arquivo);
  }
});

// Event listener do botão de logout
document.getElementById('botao-logout')?.addEventListener('click', fazerLogout);

// ========================================================================
// --- DASHBOARD DINÂMICO ---
// ========================================================================

async function carregarDashboardDinamico() {
  console.log('📊 Carregando dashboard dinâmico...');
  
  try {
    // Carregar matriz de votos
    await carregarMatrizVotos();
    
  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
  }
}


async function carregarMatrizVotos() {
  try {
    // Buscar última rodada finalizada
    const { data: ultimaRodada } = await supabase
      .from('rodadas')
      .select('id, nome')
      .eq('status', 'finalizada')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (!ultimaRodada) {
      document.getElementById('mensagem-matriz-votos').textContent = 'Nenhuma rodada finalizada ainda';
      document.getElementById('tabela-matriz-votos').classList.add('hidden');
      return;
    }

    // Buscar dados para matriz
    const { data: avaliacoes } = await supabase
      .from('avaliacoes')
      .select(`
        id_votante,
        nota,
        pratos!inner(
          id_usuario,
          perfis!inner(nome_completo)
        ),
        perfis!inner(nome_completo)
      `)
      .eq('pratos.rodada_id', ultimaRodada.id);

    if (!avaliacoes || avaliacoes.length === 0) {
      document.getElementById('mensagem-matriz-votos').textContent = 'Nenhum voto encontrado';
      document.getElementById('tabela-matriz-votos').classList.add('hidden');
      return;
    }

    // Criar matriz de votos (removendo duplicatas corretamente)
    const votantesMap = new Map();
    avaliacoes.forEach(a => {
      if (!votantesMap.has(a.id_votante)) {
        votantesMap.set(a.id_votante, { id: a.id_votante, nome: a.perfis.nome_completo });
      }
    });
    const votantes = Array.from(votantesMap.values());

    const pratosMap = new Map();
    avaliacoes.forEach(a => {
      if (!pratosMap.has(a.pratos.id_usuario)) {
        pratosMap.set(a.pratos.id_usuario, { id: a.pratos.id_usuario, nome: a.pratos.perfis.nome_completo });
      }
    });
    const pratos = Array.from(pratosMap.values());

    let html = '<div class="overflow-x-auto"><table class="w-full text-xs">';
    
    // Cabeçalho
    html += '<thead><tr><th class="p-2 text-left">Votante → Prato</th>';
    pratos.forEach(prato => {
      html += `<th class="p-2 text-center min-w-16">${prato.nome.split(' ')[0]}</th>`;
    });
    html += '</tr></thead>';

    // Corpo
    html += '<tbody>';
    votantes.forEach(votante => {
      html += `<tr><td class="p-2 font-medium">${votante.nome.split(' ')[0]}</td>`;
      
      pratos.forEach(prato => {
        const voto = avaliacoes.find(a => 
          a.id_votante === votante.id && a.pratos.id_usuario === prato.id
        );
        
        const nota = voto ? voto.nota : '-';
        const cor = voto ? (nota >= 7 ? 'text-green-600' : nota >= 5 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400';
        
        html += `<td class="p-2 text-center ${cor} font-bold">${nota}</td>`;
      });
      
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    document.getElementById('tabela-matriz-votos').innerHTML = html;
    document.getElementById('tabela-matriz-votos').classList.remove('hidden');
    document.getElementById('mensagem-matriz-votos').classList.add('hidden');
    
  } catch (error) {
    console.error('❌ Erro ao carregar matriz de votos:', error);
  }
}


// ========================================================================
// --- INICIALIZAÇÃO DA APLICAÇÃO ---
// ========================================================================
inicializar();