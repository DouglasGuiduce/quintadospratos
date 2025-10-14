// Arquivo: src/admin.js

import { supabase } from './supabaseClient.js';

// Seleciona os elementos da página que vamos manipular
const statusRodadaAbertaEl = document.getElementById('status-rodada-aberta');
const statusProximaRodadaEl = document.getElementById('status-proxima-rodada');
const btnIniciar = document.getElementById('btn-iniciar');
const btnFinalizar = document.getElementById('btn-finalizar');
const btnFinalizarVotacao = document.getElementById('btn-finalizar-votacao');
const mensagensEl = document.getElementById('mensagens');

let rodadaAberta = null;
let proximaRodada = null;

// Função principal que é executada quando a página carrega
async function carregarStatusDasRodadas() {
  // Guarda de segurança: verifica se o usuário está logado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Acesso negado. Você precisa de estar logado.");
    window.location.href = '/login.html';
    return;
  }

  // Busca as rodadas que estão abertas OU que são as próximas
  const { data: rodadas, error } = await supabase
    .from('rodadas')
    .select('*')
    .in('status', ['votacao_aberta', 'proxima']);

  if (error) {
    console.error("Erro ao buscar rodadas:", error);
    mensagensEl.textContent = "Erro ao carregar dados das rodadas.";
    return;
  }

  // Separa os resultados
  rodadaAberta = rodadas.find(r => r.status === 'votacao_aberta');
  proximaRodada = rodadas.find(r => r.status === 'proxima');

  atualizarInterface();
}

// Função para atualizar a página com base nos dados que buscámos
function atualizarInterface() {
  // Atualiza os textos de status
  statusRodadaAbertaEl.textContent = rodadaAberta ? rodadaAberta.nome : 'Nenhuma';
  statusProximaRodadaEl.textContent = proximaRodada ? proximaRodada.nome : 'Nenhuma';

  // Desativa todos os botões por padrão
  btnIniciar.disabled = true;
  btnFinalizar.disabled = true;
  btnFinalizarVotacao.disabled = true;

  // Verifica as nossas regras de negócio para ativar os botões

  // Regra do Botão "Iniciar": Só pode iniciar se for Quinta-feira, se houver uma próxima rodada
  // e se NÃO houver já uma rodada em votação.
  const hoje = new Date();
  const diaDaSemana = hoje.getDay(); // Domingo = 0, Segunda = 1, ..., Quinta = 4

  if (diaDaSemana === 4 && proximaRodada && !rodadaAberta) {
    btnIniciar.disabled = false;
    btnIniciar.title = "Hoje é quinta! Pode iniciar a próxima rodada.";
  }

  // Regra dos Botões "Finalizar": Só podem ser usados se houver uma rodada em votação.
  if (rodadaAberta) {
    btnFinalizar.disabled = false;
    btnFinalizarVotacao.disabled = false;
  }
}

// Inicia a aplicação da página
carregarStatusDasRodadas();