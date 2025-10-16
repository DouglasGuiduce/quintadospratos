-- ========================================================================
-- RESET COMPLETO DO SISTEMA - EXECUÇÃO DIRETA
-- ========================================================================
-- Este arquivo contém os comandos SQL para resetar o sistema diretamente
-- sem criar uma função. Cole e execute no SQL Editor do Supabase.
-- 
-- ⚠️ ATENÇÃO: Esta ação NÃO PODE ser desfeita!
-- Faça backup antes se necessário.
-- ========================================================================

-- PASSO 1: Deletar curtidas de comentários
DELETE FROM curtidas_comentarios;

-- PASSO 2: Deletar comentários
DELETE FROM comentarios;

-- PASSO 3: Deletar avaliações
DELETE FROM avaliacoes;

-- PASSO 4: Deletar votos de finalização
DELETE FROM finalizacoes_rodada;

-- PASSO 5: Deletar pratos
DELETE FROM pratos;

-- PASSO 6: Deletar rodadas
DELETE FROM rodadas;

-- PASSO 7: Zerar estatísticas dos usuários (MANTÉM OS USUÁRIOS!)
UPDATE perfis
SET 
  pontos_totais = 0,
  jogos_participados = 0,
  vitorias = 0,
  media_geral = 0;

-- PASSO 8: Resetar IDs para começarem do 1
ALTER SEQUENCE rodadas_id_seq RESTART WITH 1;
ALTER SEQUENCE pratos_id_seq RESTART WITH 1;
ALTER SEQUENCE avaliacoes_id_seq RESTART WITH 1;
ALTER SEQUENCE comentarios_id_seq RESTART WITH 1;
ALTER SEQUENCE curtidas_comentarios_id_seq RESTART WITH 1;
ALTER SEQUENCE finalizacoes_rodada_id_seq RESTART WITH 1;

-- ========================================================================
-- VERIFICAÇÃO
-- ========================================================================
-- Execute estas queries para confirmar que o reset funcionou:

-- Contar registros (devem estar todos em 0)
SELECT 
  (SELECT COUNT(*) FROM rodadas) as total_rodadas,
  (SELECT COUNT(*) FROM pratos) as total_pratos,
  (SELECT COUNT(*) FROM avaliacoes) as total_avaliacoes,
  (SELECT COUNT(*) FROM comentarios) as total_comentarios,
  (SELECT COUNT(*) FROM curtidas_comentarios) as total_curtidas;

-- Verificar estatísticas dos usuários (devem estar em 0)
SELECT 
  id,
  nome_completo,
  pontos_totais,
  jogos_participados,
  vitorias,
  media_geral
FROM perfis
ORDER BY nome_completo;

-- Verificar que os IDs resetaram (próximos IDs devem ser 1, 2, 3)
-- ⚠️ Atenção: Executar esta query vai "gastar" os próximos IDs!
-- Só execute se quiser confirmar, depois rode o RESTART novamente.
-- SELECT 
--   currval('rodadas_id_seq') as ultimo_id_rodada,
--   currval('pratos_id_seq') as ultimo_id_prato,
--   currval('avaliacoes_id_seq') as ultimo_id_avaliacao;

-- ========================================================================
-- RESULTADO ESPERADO
-- ========================================================================
-- ✅ Todas as contagens devem ser 0 (exceto perfis)
-- ✅ Todos os pontos_totais, jogos_participados, vitorias e media_geral devem ser 0
-- ✅ Próxima rodada criada terá ID = 1
-- ✅ Próximo prato criado terá ID = 1
-- ✅ Próxima avaliação criada terá ID = 1
-- ========================================================================

