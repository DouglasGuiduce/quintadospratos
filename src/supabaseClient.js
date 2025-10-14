// Arquivo: src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase usando variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jhqbkwczzhrgkvxbomst.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocWJrd2N6emhyZ2t2eGJvbXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzkzMDYsImV4cCI6MjA3NTAxNTMwNn0.XYWdJAZEjJBCF7PkEeniINHpre3QxyzaI1TuzOdtQHA'

// Cria e exporta o cliente Supabase para ser usado em outros arquivos
export const supabase = createClient(supabaseUrl, supabaseKey)