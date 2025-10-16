-- ========================================================================
-- FUNÇÃO PARA RESETAR COMPLETAMENTE O SISTEMA
-- ========================================================================
-- Esta função deleta todos os dados do sistema, mantendo apenas os usuários
-- e reseta todos os IDs para começarem do 1 novamente

CREATE OR REPLACE FUNCTION resetar_sistema_completo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log de início
  RAISE NOTICE '🗑️ Iniciando reset completo do sistema...';
  
  -- PASSO 1: Deletar curtidas de comentários
  RAISE NOTICE '1️⃣ Deletando curtidas de comentários...';
  DELETE FROM curtidas_comentarios;
  
  -- PASSO 2: Deletar comentários (as respostas também serão deletadas por cascade)
  RAISE NOTICE '2️⃣ Deletando comentários...';
  DELETE FROM comentarios;
  
  -- PASSO 3: Deletar avaliações
  RAISE NOTICE '3️⃣ Deletando avaliações...';
  DELETE FROM avaliacoes;
  
  -- PASSO 4: Deletar votos de finalização
  RAISE NOTICE '4️⃣ Deletando votos de finalização...';
  DELETE FROM finalizacoes_rodada;
  
  -- PASSO 5: Deletar pratos
  RAISE NOTICE '5️⃣ Deletando pratos...';
  DELETE FROM pratos;
  
  -- PASSO 6: Deletar rodadas
  RAISE NOTICE '6️⃣ Deletando rodadas...';
  DELETE FROM rodadas;
  
  -- PASSO 7: Zerar estatísticas dos usuários (mantém os usuários!)
  RAISE NOTICE '7️⃣ Zerando estatísticas dos usuários...';
  UPDATE perfis
  SET 
    pontos_totais = 0,
    jogos_participados = 0,
    vitorias = 0,
    media_geral = 0;
  
  -- PASSO 8: Resetar as sequences (IDs) para começarem do 1
  RAISE NOTICE '8️⃣ Resetando IDs das tabelas...';
  
  -- Resetar sequence de rodadas
  ALTER SEQUENCE IF EXISTS rodadas_id_seq RESTART WITH 1;
  
  -- Resetar sequence de pratos
  ALTER SEQUENCE IF EXISTS pratos_id_seq RESTART WITH 1;
  
  -- Resetar sequence de avaliações
  ALTER SEQUENCE IF EXISTS avaliacoes_id_seq RESTART WITH 1;
  
  -- Resetar sequence de comentários
  ALTER SEQUENCE IF EXISTS comentarios_id_seq RESTART WITH 1;
  
  -- Resetar sequence de curtidas de comentários
  ALTER SEQUENCE IF EXISTS curtidas_comentarios_id_seq RESTART WITH 1;
  
  -- Resetar sequence de finalizações de rodada
  ALTER SEQUENCE IF EXISTS finalizacoes_rodada_id_seq RESTART WITH 1;
  
  RAISE NOTICE '✅ Reset completo concluído com sucesso!';
  RAISE NOTICE '👥 Usuários mantidos: %', (SELECT COUNT(*) FROM perfis);
  
END;
$$;

-- ========================================================================
-- PERMISSÕES
-- ========================================================================
-- Permitir apenas administradores executarem esta função
COMMENT ON FUNCTION resetar_sistema_completo() IS 
'Reseta completamente o sistema: deleta todos os pratos, rodadas, avaliações e comentários, 
zera estatísticas dos usuários e reseta todos os IDs. Os usuários são mantidos.';

-- ========================================================================
-- EXEMPLO DE USO
-- ========================================================================
-- Para executar a função, basta chamar:
-- SELECT resetar_sistema_completo();

