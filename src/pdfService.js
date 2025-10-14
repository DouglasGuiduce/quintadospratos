// Arquivo: src/pdfService.js - Serviço de Geração de PDF
import jsPDF from 'jspdf';
import { supabase } from './supabaseClient.js';

// ========================================================================
// SERVIÇO DE GERAÇÃO DE PDF PARA RODADAS
// ========================================================================

/**
 * Gera PDF completo de uma rodada finalizada
 * @param {number} rodadaId - ID da rodada
 * @returns {Promise<jsPDF>} - Documento PDF gerado
 */
export async function gerarPDFRodada(rodadaId) {
  try {
    console.log('📄 Iniciando geração de PDF para rodada:', rodadaId);
    
    // Buscar dados da rodada
    const dadosRodada = await buscarDadosRodada(rodadaId);
    if (!dadosRodada) {
      throw new Error('Rodada não encontrada ou não finalizada');
    }
    
    // Criar documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configurações de layout
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;
    
    // 1. CABEÇALHO PRINCIPAL
    yPosition = adicionarCabecalho(doc, dadosRodada, yPosition, contentWidth, margin);
    
    // 2. GRANDE VENCEDOR
    yPosition = await adicionarGrandeVencedor(doc, dadosRodada, yPosition, contentWidth, margin);
    
     // 3. PÓDIO (TOP 3)
     yPosition = await adicionarPodio(doc, dadosRodada, yPosition, contentWidth, margin);
     
     // 3.1. PÓDIO DOS PIORES (BOTTOM 3)
     yPosition = verificarNovaPagina(doc, yPosition, margin, 100);
     yPosition = await adicionarPodioPiores(doc, dadosRodada, yPosition, contentWidth, margin);
     
     // 4. CLASSIFICAÇÃO GERAL
     yPosition = verificarNovaPagina(doc, yPosition, margin, 200);
     yPosition = await adicionarClassificacaoGeral(doc, dadosRodada, yPosition, contentWidth, margin);
    
     // 5. CURIOSIDADES DA RODADA
     yPosition = verificarNovaPagina(doc, yPosition, margin, 80);
     yPosition = adicionarCuriosidades(doc, dadosRodada, yPosition, contentWidth, margin);
     
     // 6. TABELA DE QUEM VOTOU EM QUEM
     yPosition = verificarNovaPagina(doc, yPosition, margin, 150);
     yPosition = await adicionarTabelaVotos(doc, dadosRodada, yPosition, contentWidth, margin);
     
     // 7. RODAPÉ
     adicionarRodape(doc, pageHeight, margin);
    
    console.log('✅ PDF gerado com sucesso!');
    return doc;
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    throw error;
  }
}

/**
 * Busca todos os dados necessários para a rodada
 */
async function buscarDadosRodada(rodadaId) {
  try {
    console.log('🔍 Buscando dados da rodada:', rodadaId);
    
    // Buscar dados da rodada
    const { data: rodada, error: errorRodada } = await supabase
      .from('rodadas')
      .select('*')
      .eq('id', rodadaId)
      .eq('status', 'finalizada')
      .single();
    
    if (errorRodada) {
      console.error('❌ Erro ao buscar rodada:', errorRodada);
      throw new Error(`Erro ao buscar rodada: ${errorRodada.message}`);
    }
    
    if (!rodada) {
      throw new Error('Rodada não encontrada ou não finalizada');
    }
    
    console.log('✅ Rodada encontrada:', rodada.nome);
    
    // Buscar pratos da rodada
    const { data: pratos, error: errorPratos } = await supabase
      .from('pratos')
      .select(`
        *,
        perfis(nome_completo, email)
      `)
      .eq('rodada_id', rodadaId)
      .order('id', { ascending: false });
    
    if (errorPratos) {
      console.error('❌ Erro ao buscar pratos:', errorPratos);
      throw new Error(`Erro ao buscar pratos da rodada: ${errorPratos.message}`);
    }
    
    console.log(`✅ Encontrados ${pratos?.length || 0} pratos na rodada`);
    
    // Buscar avaliações para cada prato separadamente
    const pratosComAvaliacoes = [];
    
    for (const prato of pratos) {
      // Buscar avaliações deste prato
      const { data: avaliacoes, error: errorAvaliacoes } = await supabase
        .from('avaliacoes')
        .select('id, nota, id_votante')
        .eq('id_prato', prato.id);
      
      if (errorAvaliacoes) {
        console.warn(`Erro ao buscar avaliações do prato ${prato.id}:`, errorAvaliacoes);
        // Continuar mesmo com erro nas avaliações
      }
      
      // Calcular nota final baseada nas avaliações
      const notaFinal = avaliacoes && avaliacoes.length > 0 ? 
        avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length : 0;
      
      pratosComAvaliacoes.push({
        ...prato,
        avaliacoes: avaliacoes || [],
        totalVotos: avaliacoes?.length || 0,
        notas10: avaliacoes?.filter(a => a.nota === 10).length || 0,
        variacaoNotas: calcularVariacaoNotas(avaliacoes || []),
        nota_final: notaFinal
      });
    }
    
    // Ordenar pratos por nota final (maior para menor)
    pratosComAvaliacoes.sort((a, b) => b.nota_final - a.nota_final);
    
    // Processar dados
    const dadosProcessados = {
      rodada: rodada,
      pratos: pratosComAvaliacoes,
      estatisticas: calcularEstatisticas(pratosComAvaliacoes)
    };
    
    return dadosProcessados;
    
  } catch (error) {
    console.error('Erro ao buscar dados da rodada:', error);
    throw error;
  }
}

/**
 * Calcula a variação de notas (desvio padrão)
 */
function calcularVariacaoNotas(avaliacoes) {
  if (avaliacoes.length === 0) return 0;
  
  const notas = avaliacoes.map(a => a.nota);
  const media = notas.reduce((sum, nota) => sum + nota, 0) / notas.length;
  const variancia = notas.reduce((sum, nota) => sum + Math.pow(nota - media, 2), 0) / notas.length;
  
  return Math.sqrt(variancia);
}

/**
 * Calcula estatísticas gerais da rodada
 */
function calcularEstatisticas(pratos) {
  const totalVotos = pratos.reduce((sum, prato) => sum + (prato.avaliacoes?.length || 0), 0);
  
  // Prato com mais notas 10
  let queridinho = null;
  let maxNotas10 = 0;
  
  pratos.forEach(prato => {
    const notas10 = prato.avaliacoes?.filter(a => a.nota === 10).length || 0;
    if (notas10 > maxNotas10) {
      maxNotas10 = notas10;
      queridinho = { ...prato, notas10 };
    }
  });
  
  // Prato mais polêmico (maior variação)
  let polemico = null;
  let maxVariacao = 0;
  
  pratos.forEach(prato => {
    const variacao = calcularVariacaoNotas(prato.avaliacoes || []);
    if (variacao > maxVariacao) {
      maxVariacao = variacao;
      polemico = { ...prato, variacao };
    }
  });
  
  // Prato com mais votos
  let maisVotado = null;
  let maxVotos = 0;
  
  pratos.forEach(prato => {
    const totalVotosPrato = prato.avaliacoes?.length || 0;
    if (totalVotosPrato > maxVotos) {
      maxVotos = totalVotosPrato;
      maisVotado = { ...prato, totalVotos: totalVotosPrato };
    }
  });
  
  return {
    totalVotos,
    queridinho,
    polemico,
    maisVotado
  };
}

/**
 * Adiciona cabeçalho principal ao PDF
 */
function adicionarCabecalho(doc, dados, yPosition, contentWidth, margin) {
  const rodada = dados.rodada;
  
  // Logo/Título do Quinta dos Pratos
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Vermelho
  doc.text('Quinta dos Pratos', margin, yPosition);
  
  yPosition += 15;
  
  // Título da rodada
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(`Resumo da ${rodada.nome}`, margin, yPosition);
  
  yPosition += 10;
  
  // Data de finalização
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const dataFinalizacao = rodada.finalizada_em ? 
    new Date(rodada.finalizada_em).toLocaleDateString('pt-BR') : 
    new Date(rodada.created_at).toLocaleDateString('pt-BR');
  doc.text(`Finalizada em: ${dataFinalizacao}`, margin, yPosition);
  
  yPosition += 20;
  
  return yPosition;
}

/**
 * Adiciona seção do grande vencedor
 */
async function adicionarGrandeVencedor(doc, dados, yPosition, contentWidth, margin) {
  const vencedor = dados.pratos[0]; // Primeiro da lista (maior nota)
  
  if (!vencedor) return yPosition;
  
  // Título da seção
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('O Grande Vencedor', margin, yPosition);
  
  yPosition += 15;
  
  // Adicionar foto do prato vencedor
  if (vencedor.url_imagem) {
    try {
      // Carregar imagem
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = vencedor.url_imagem;
      });
      
       // Adicionar imagem ao PDF (tamanho 80x80mm)
       const imgWidth = 80;
       const imgHeight = 80;
      doc.addImage(vencedor.url_imagem, 'JPEG', margin, yPosition, imgWidth, imgHeight);
      
      yPosition += imgHeight + 10;
    } catch (error) {
      console.warn('Erro ao carregar imagem do vencedor:', error);
      // Continuar sem a imagem
    }
  }
  
  // Nome do chef e prato
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${vencedor.perfis?.nome_completo || 'Chef Anônimo'}`, margin, yPosition);
  
  yPosition += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`com o prato "${vencedor.nome_prato}"`, margin, yPosition);
  
  yPosition += 10;
  
  // Nota média
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94); // Verde
  doc.text(`Média: ${vencedor.nota_final?.toFixed(1) || '0.0'}`, margin, yPosition);
  
  yPosition += 20;
  
  return yPosition;
}

/**
 * Adiciona seção do pódio (top 3)
 */
async function adicionarPodio(doc, dados, yPosition, contentWidth, margin) {
  const top3 = dados.pratos.slice(0, 3);
  
  if (top3.length === 0) return yPosition;
  
  // Título da seção
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Podio da Rodada', margin, yPosition);
  
  yPosition += 12;
  
  // Posições do pódio
  const posicoes = ['2o', '3o'];
  
  for (let index = 1; index < top3.length; index++) {
    const prato = top3[index];
    const posicao = posicoes[index - 1];
    const nome = prato.perfis?.nome_completo || 'Chef Anônimo';
    const nota = prato.nota_final?.toFixed(1) || '0.0';
    
     // Adicionar foto do prato (50x50mm)
     if (prato.url_imagem) {
       try {
         const img = new Image();
         img.crossOrigin = 'anonymous';
         
         await new Promise((resolve, reject) => {
           img.onload = resolve;
           img.onerror = reject;
           img.src = prato.url_imagem;
         });
         
         const imgSize = 50;
         doc.addImage(prato.url_imagem, 'JPEG', margin, yPosition, imgSize, imgSize);
         
         // Texto ao lado da imagem
         doc.setFontSize(11);
         doc.setFont('helvetica', 'normal');
         doc.text(`${posicao} ${nome} - "${prato.nome_prato}" (${nota})`, margin + imgSize + 5, yPosition + 25);
         
         yPosition += imgSize + 5;
      } catch (error) {
        console.warn(`Erro ao carregar imagem do prato ${prato.id}:`, error);
        // Continuar sem a imagem
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${posicao} ${nome} - "${prato.nome_prato}" (${nota})`, margin, yPosition);
        yPosition += 8;
      }
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`${posicao} ${nome} - "${prato.nome_prato}" (${nota})`, margin, yPosition);
      yPosition += 8;
    }
  }
  
  yPosition += 10;
  
  return yPosition;
}

/**
 * Adiciona seção do pódio dos piores (bottom 3)
 */
async function adicionarPodioPiores(doc, dados, yPosition, contentWidth, margin) {
  const totalPratos = dados.pratos.length;
  
  if (totalPratos < 4) {
    // Se há menos de 4 pratos, não faz sentido ter pódio dos piores
    return yPosition;
  }
  
  // Pegar os 3 piores (últimos da lista ordenada)
  const piores3 = dados.pratos.slice(-3).reverse(); // Reverter para mostrar do menos pior para o pior
  
  // Título da seção
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Podio dos Piores', margin, yPosition);
  
  yPosition += 12;
  
  // Posições do pódio dos piores
  const posicoes = ['3o pior', '2o pior', 'Pior'];
  
  for (let index = 0; index < piores3.length; index++) {
    const prato = piores3[index];
    const posicao = posicoes[index];
    const nome = prato.perfis?.nome_completo || 'Chef Anonimo';
    const nota = prato.nota_final?.toFixed(1) || '0.0';
    
    // Adicionar foto do prato (50x50mm)
    if (prato.url_imagem) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = prato.url_imagem;
        });
        
        const imgSize = 50;
        doc.addImage(prato.url_imagem, 'JPEG', margin, yPosition, imgSize, imgSize);
        
        // Texto ao lado da imagem
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 0, 0); // Vermelho escuro para os piores
        doc.text(`${posicao} ${nome} - "${prato.nome_prato}" (${nota})`, margin + imgSize + 5, yPosition + 25);
        
        yPosition += imgSize + 5;
      } catch (error) {
        console.warn(`Erro ao carregar imagem do prato ${prato.id}:`, error);
        // Continuar sem a imagem
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 0, 0);
        doc.text(`${posicao} ${nome} - "${prato.nome_prato}" (${nota})`, margin, yPosition);
        yPosition += 8;
      }
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 0, 0);
      doc.text(`${posicao} ${nome} - "${prato.nome_prato}" (${nota})`, margin, yPosition);
      yPosition += 8;
    }
  }
  
  yPosition += 10;
  
  return yPosition;
}

/**
 * Adiciona classificação geral da rodada
 */
async function adicionarClassificacaoGeral(doc, dados, yPosition, contentWidth, margin) {
  // Título da seção
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Classificacao Geral da Rodada', margin, yPosition);
  
  yPosition += 12;
  
  // Cabeçalho da tabela
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('#', margin, yPosition);
  doc.text('Foto', margin + 15, yPosition);
  doc.text('Chef', margin + 50, yPosition);
  doc.text('Prato', margin + 100, yPosition);
  doc.text('Media', margin + 150, yPosition);
  
  yPosition += 8;
  
  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, margin + contentWidth, yPosition);
  yPosition += 5;
  
  // Dados da tabela
  doc.setFont('helvetica', 'normal');
  
  for (let index = 0; index < dados.pratos.length; index++) {
    // Verificar se precisa de nova página a cada 8 pratos
    if (index > 0 && index % 8 === 0) {
      yPosition = verificarNovaPagina(doc, yPosition, margin, 50);
      
      // Redesenhar cabeçalho da tabela na nova página
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('#', margin, yPosition);
      doc.text('Foto', margin + 15, yPosition);
      doc.text('Chef', margin + 50, yPosition);
      doc.text('Prato', margin + 100, yPosition);
      doc.text('Media', margin + 150, yPosition);
      
      yPosition += 8;
      
      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 5;
    }
    
    const prato = dados.pratos[index];
    const posicao = index + 1;
    const nome = prato.perfis?.nome_completo || 'Chef Anonimo';
    const nomePrato = prato.nome_prato && prato.nome_prato.length > 12 ? 
      prato.nome_prato.substring(0, 9) + '...' : 
      (prato.nome_prato || 'Sem nome');
    const nota = prato.nota_final?.toFixed(1) || '0.0';
    
    // Posição
    doc.text(posicao.toString(), margin, yPosition + 15);
    
    // Foto do prato (30x30mm)
    if (prato.url_imagem) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = prato.url_imagem;
        });
        
        const imgSize = 30;
        doc.addImage(prato.url_imagem, 'JPEG', margin + 15, yPosition, imgSize, imgSize);
      } catch (error) {
        console.warn(`Erro ao carregar imagem do prato ${prato.id}:`, error);
        // Continuar sem a imagem
      }
    }
    
    // Nome do chef
    doc.text(nome, margin + 50, yPosition + 15);
    
    // Nome do prato
    doc.text(nomePrato, margin + 100, yPosition + 15);
    
    // Nota
    doc.text(nota, margin + 150, yPosition + 15);
    
    yPosition += 32; // Espaço otimizado para acomodar a foto
  }
  
  yPosition += 10;
  
  return yPosition;
}

/**
 * Adiciona curiosidades da rodada
 */
function adicionarCuriosidades(doc, dados, yPosition, contentWidth, margin) {
  const stats = dados.estatisticas;
  
  // Título da seção
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Curiosidades da Rodada', margin, yPosition);
  
  yPosition += 12;
  
  // Calcular altura da caixa baseada no conteúdo
  let boxHeight = 20; // Altura mínima
  let lineCount = 0;
  
  // Contar linhas necessárias
  if (stats.queridinho && stats.queridinho.notas10 > 0) lineCount++;
  if (stats.polemico && stats.polemico.variacao > 0) lineCount++;
  if (stats.maisVotado && stats.maisVotado.totalVotos > 0) lineCount++;
  lineCount++; // Total de votos
  
  boxHeight = Math.max(boxHeight, lineCount * 6 + 16);
  
  const boxY = yPosition;
  
  // Desenhar caixa
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, boxY, contentWidth, boxHeight);
  
  // Conteúdo da caixa
  let textY = boxY + 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Queridinho da galera
  if (stats.queridinho && stats.queridinho.notas10 > 0) {
    const nomeQueridinho = stats.queridinho.perfis?.nome_completo || 'Chef Anonimo';
    doc.text(`O Queridinho da Galera: ${nomeQueridinho} (${stats.queridinho.notas10} notas 10)`, margin + 5, textY);
    textY += 6;
  }
  
  // Prato mais votado
  if (stats.maisVotado && stats.maisVotado.totalVotos > 0) {
    const nomeMaisVotado = stats.maisVotado.perfis?.nome_completo || 'Chef Anonimo';
    doc.text(`O Mais Votado: ${nomeMaisVotado} (${stats.maisVotado.totalVotos} votos)`, margin + 5, textY);
    textY += 6;
  }
  
  // Prato polêmico
  if (stats.polemico && stats.polemico.variacao > 0) {
    const nomePolemico = stats.polemico.perfis?.nome_completo || 'Chef Anonimo';
    doc.text(`O Prato Polemico: ${nomePolemico} (maior variacao de notas)`, margin + 5, textY);
    textY += 6;
  }
  
  // Total de votos
  doc.text(`Total de Votos: ${stats.totalVotos} avaliacoes registradas`, margin + 5, textY);
  
  yPosition += boxHeight + 10;
  
  return yPosition;
}

/**
 * Adiciona tabela de quem votou em quem
 */
async function adicionarTabelaVotos(doc, dados, yPosition, contentWidth, margin) {
  // Título da seção
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Quem Votou em Quem', margin, yPosition);
  
  yPosition += 12;
  
  // Buscar todos os votantes únicos
  const votantesIds = new Set();
  const pratos = new Map();
  
  dados.pratos.forEach(prato => {
    pratos.set(prato.id, {
      nome: prato.perfis?.nome_completo || 'Chef Anonimo',
      prato: prato.nome_prato || 'Sem nome'
    });
    
    prato.avaliacoes.forEach(avaliacao => {
      votantesIds.add(avaliacao.id_votante);
    });
  });
  
  // Buscar nomes dos votantes
  const votantes = new Map();
  if (votantesIds.size > 0) {
    const { data: perfisVotantes, error } = await supabase
      .from('perfis')
      .select('id, nome_completo')
      .in('id', Array.from(votantesIds));
    
    if (perfisVotantes) {
      perfisVotantes.forEach(perfil => {
        votantes.set(perfil.id, perfil.nome_completo || 'Votante Anonimo');
      });
    }
  }
  
  if (votantes.size === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhum voto registrado nesta rodada.', margin, yPosition);
    yPosition += 15;
    return yPosition;
  }
  
  // Criar matriz de votos
  const votantesArray = Array.from(votantes.entries());
  const pratosArray = Array.from(pratos.entries());
  
  // Cabeçalho da tabela
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  // Cabeçalho: Votante
  doc.text('Votante', margin, yPosition);
  
  // Cabeçalhos dos pratos
  pratosArray.forEach(([pratoId, pratoInfo], index) => {
    const x = margin + 40 + (index * 25);
    const nomeCurto = pratoInfo.nome.length > 8 ? 
      pratoInfo.nome.substring(0, 5) + '...' : 
      pratoInfo.nome;
    doc.text(nomeCurto, x, yPosition);
  });
  
  yPosition += 8;
  
  // Linha separadora
  doc.setLineWidth(0.3);
  doc.line(margin, yPosition, margin + 40 + (pratosArray.length * 25), yPosition);
  yPosition += 5;
  
  // Dados da tabela
  doc.setFont('helvetica', 'normal');
  
  votantesArray.forEach(([votanteId, nomeVotante]) => {
    // Nome do votante
    const nomeCurto = nomeVotante.length > 12 ? 
      nomeVotante.substring(0, 9) + '...' : 
      nomeVotante;
    doc.text(nomeCurto, margin, yPosition);
    
    // Votos do votante
    pratosArray.forEach(([pratoId, pratoInfo], index) => {
      const x = margin + 40 + (index * 25);
      
      // Buscar voto deste votante para este prato
      const prato = dados.pratos.find(p => p.id === pratoId);
      const voto = prato?.avaliacoes.find(a => a.id_votante === votanteId);
      
      if (voto) {
        doc.text(voto.nota.toString(), x, yPosition);
      } else {
        doc.text('-', x, yPosition);
      }
    });
    
    yPosition += 5;
  });
  
  yPosition += 10;
  
  return yPosition;
}

/**
 * Verifica se precisa de nova página
 */
function verificarNovaPagina(doc, yPosition, margin, alturaNecessaria = 50) {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (yPosition + alturaNecessaria > pageHeight - margin) {
    doc.addPage();
    return margin; // Retorna nova posição Y
  }
  
  return yPosition;
}

/**
 * Adiciona rodapé ao PDF
 */
function adicionarRodape(doc, pageHeight, margin) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  
  const texto = 'Gerado automaticamente pelo sistema Quinta dos Pratos';
  const textoWidth = doc.getTextWidth(texto);
  const x = (pageWidth - textoWidth) / 2;
  
  doc.text(texto, x, pageHeight - 15);
  
  const data = new Date().toLocaleDateString('pt-BR');
  const dataWidth = doc.getTextWidth(data);
  const dataX = (pageWidth - dataWidth) / 2;
  
  doc.text(data, dataX, pageHeight - 10);
}

/**
 * Salva o PDF com nome personalizado
 */
export function salvarPDF(doc, nomeArquivo) {
  try {
    doc.save(nomeArquivo);
    console.log('✅ PDF salvo:', nomeArquivo);
  } catch (error) {
    console.error('❌ Erro ao salvar PDF:', error);
    throw error;
  }
}

/**
 * Função principal para gerar e baixar PDF da rodada
 */
export async function gerarEDownloadPDFRodada(rodadaId) {
  try {
    console.log('🚀 Iniciando geração e download de PDF...');
    
    // Gerar PDF
    const doc = await gerarPDFRodada(rodadaId);
    
    // Nome do arquivo
    const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `Quinta_dos_Pratos_Rodada_${rodadaId}_${data}.pdf`;
    
    // Salvar PDF
    salvarPDF(doc, nomeArquivo);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro na geração de PDF:', error);
    throw error;
  }
}
