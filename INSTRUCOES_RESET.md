# 🔄 Como Resetar o Sistema Completamente

## O que será resetado?

✅ **MANTÉM:**

- Todos os usuários cadastrados
- E-mails e senhas de autenticação
- Dados de perfil (nome, foto)

❌ **DELETA:**

- Todas as rodadas
- Todos os pratos
- Todas as avaliações
- Todos os comentários
- Todas as curtidas de comentários
- Todos os votos de finalização

🔄 **RESETA:**

- Pontos totais de todos os usuários → 0
- Jogos participados → 0
- Vitórias → 0
- Média geral → 0
- IDs de todas as tabelas → começam do 1

---

## 📋 Passo a Passo

### 1️⃣ Executar a Função SQL no Supabase

1. Acesse o **Supabase Dashboard**: https://app.supabase.com
2. Selecione seu projeto: **jhqbkwczzhrgkvxbomst**
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **+ New Query**
5. Cole o conteúdo do arquivo `supabase_reset_function.sql`
6. Clique em **Run** (ou pressione `Ctrl+Enter`)
7. Aguarde a mensagem de sucesso

### 2️⃣ Executar o Reset pelo Painel Admin

**Opção A: Pelo Painel Admin (Interface Web)**

1. Acesse a aplicação e faça login como **administrador**
2. Vá na aba **Admin** (só visível para admins)
3. Na seção **Ferramentas de Manutenção**, clique em **Limpar Todos os Dados**
4. Confirme as duas mensagens de aviso
5. Aguarde o processo concluir (pode demorar alguns segundos)
6. A página será recarregada automaticamente

**Opção B: Executar Manualmente no SQL Editor**

Se preferir executar diretamente no Supabase:

1. Vá em **SQL Editor**
2. Clique em **+ New Query**
3. Cole o seguinte comando:

```sql
SELECT resetar_sistema_completo();
```

4. Clique em **Run**
5. Aguarde a mensagem de sucesso

---

## ⚠️ AVISOS IMPORTANTES

### 🚨 Esta ação NÃO PODE ser desfeita!

- Todos os dados deletados serão **permanentemente perdidos**
- Não há backup automático
- Certifique-se de fazer um backup antes se necessário

### 📸 Como fazer backup antes (opcional)

1. Vá em **Database** → **Backups** no Supabase
2. Clique em **Create backup**
3. Aguarde o backup concluir
4. Depois pode executar o reset

### ✅ Após o Reset

1. Todos os usuários continuarão podendo fazer login normalmente
2. A próxima rodada criada terá ID = 1
3. O primeiro prato enviado terá ID = 1
4. Todas as estatísticas estarão zeradas
5. O sistema estará "limpo" para começar do zero

---

## 🔧 Troubleshooting

### Erro: "function resetar_sistema_completo() does not exist"

**Solução:** Execute primeiro o arquivo `supabase_reset_function.sql` no SQL Editor para criar a função.

### Erro: "permission denied"

**Solução:** Verifique se você está logado como administrador. A função só pode ser executada por admins.

### Reset manual (se a função não funcionar)

Se a função automática não funcionar, você pode executar os comandos manualmente:

```sql
-- 1. Deletar dados (na ordem correta para evitar erros de FK)
DELETE FROM curtidas_comentarios;
DELETE FROM comentarios;
DELETE FROM avaliacoes;
DELETE FROM finalizacoes_rodada;
DELETE FROM pratos;
DELETE FROM rodadas;

-- 2. Zerar estatísticas dos usuários
UPDATE perfis
SET pontos_totais = 0,
    jogos_participados = 0,
    vitorias = 0,
    media_geral = 0;

-- 3. Resetar IDs
ALTER SEQUENCE rodadas_id_seq RESTART WITH 1;
ALTER SEQUENCE pratos_id_seq RESTART WITH 1;
ALTER SEQUENCE avaliacoes_id_seq RESTART WITH 1;
ALTER SEQUENCE comentarios_id_seq RESTART WITH 1;
ALTER SEQUENCE curtidas_comentarios_id_seq RESTART WITH 1;
ALTER SEQUENCE finalizacoes_rodada_id_seq RESTART WITH 1;
```

---

## 📊 Verificar se o Reset funcionou

Execute estas queries para verificar:

```sql
-- Contar registros (devem estar todos em 0)
SELECT
  (SELECT COUNT(*) FROM rodadas) as rodadas,
  (SELECT COUNT(*) FROM pratos) as pratos,
  (SELECT COUNT(*) FROM avaliacoes) as avaliacoes,
  (SELECT COUNT(*) FROM comentarios) as comentarios,
  (SELECT COUNT(*) FROM curtidas_comentarios) as curtidas;

-- Verificar estatísticas dos usuários (devem estar em 0)
SELECT
  id,
  nome_completo,
  pontos_totais,
  jogos_participados,
  vitorias,
  media_geral
FROM perfis;

-- Verificar próximos IDs (devem ser 1)
SELECT
  nextval('rodadas_id_seq') as proximo_id_rodada,
  nextval('pratos_id_seq') as proximo_id_prato,
  nextval('avaliacoes_id_seq') as proximo_id_avaliacao;
```

---

## 🆘 Suporte

Se tiver problemas, verifique:

- Console do navegador (F12) para ver erros JavaScript
- Logs do Supabase em **Logs** → **Postgres Logs**
- Se você tem permissões de admin no sistema
