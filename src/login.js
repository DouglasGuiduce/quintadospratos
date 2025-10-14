// Arquivo: src/login.js

import './style.css';
import { supabase } from './supabaseClient.js';

// Função para mostrar mensagens
function showMessage(text, type = 'info') {
  const messagesDiv = document.getElementById('mensagens');
  messagesDiv.textContent = text;
  messagesDiv.className = `messages ${type}`;
  
  // Remove a mensagem após 5 segundos
  setTimeout(() => {
    messagesDiv.textContent = '';
    messagesDiv.className = 'messages';
  }, 5000);
}

// Função para buscar perfil do usuário
async function buscarPerfilUsuario(userId) {
  try {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('Erro ao buscar perfil:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.log('Erro ao buscar perfil:', error);
    return null;
  }
}

// Função para login
async function loginUsuario(email, password) {
  showMessage('A tentar entrar...', 'info');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showMessage(`Erro no login: ${error.message}`, 'error');
    } else {
      // Debug completo dos dados do usuário
      console.log('=== DADOS COMPLETOS DO USUÁRIO ===');
      console.log('User object:', data.user);
      console.log('User metadata:', data.user.user_metadata);
      console.log('Raw user metadata:', data.user.raw_user_meta_data);
      
      // Buscar perfil do usuário para verificar se tem nome completo
      const perfil = await buscarPerfilUsuario(data.user.id);
      console.log('Perfil encontrado:', perfil);
      
      // Determinar o nome completo
      let nomeCompleto = null;
      
      if (perfil && perfil.nome_completo) {
        nomeCompleto = perfil.nome_completo;
        console.log('✅ Nome encontrado na tabela perfis:', nomeCompleto);
      } else if (data.user.user_metadata?.nome_completo) {
        nomeCompleto = data.user.user_metadata.nome_completo;
        console.log('✅ Nome encontrado nos metadados:', nomeCompleto);
      } else if (data.user.raw_user_meta_data?.nome_completo) {
        nomeCompleto = data.user.raw_user_meta_data.nome_completo;
        console.log('✅ Nome encontrado nos raw_metadata:', nomeCompleto);
      } else {
        console.log('❌ Nome não encontrado em nenhum lugar');
      }
      
      console.log('=== RESULTADO FINAL ===');
      console.log('Usuário logado:', {
        id: data.user.id,
        email: data.user.email,
        nome_completo: nomeCompleto || 'Não informado'
      });

      showMessage('Login bem-sucedido! A redirecionar...', 'success');
      setTimeout(() => {
        window.location.href = '/'; // Redireciona para index.html
      }, 1500);
    }
  } catch (error) {
    showMessage('Erro inesperado ao fazer login', 'error');
    console.error('Erro no login:', error);
  }
}

// Função para reset de senha
async function resetarSenha(email) {
  showMessage('A enviar email de recuperação...', 'info');

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html?reset=true`
    });

    if (error) {
      showMessage(`Erro ao enviar email: ${error.message}`, 'error');
    } else {
      showMessage('Email de recuperação enviado! Verifique sua caixa de entrada.', 'success');
    }
  } catch (error) {
    showMessage('Erro inesperado ao enviar email de recuperação', 'error');
    console.error('Erro no reset de senha:', error);
  }
}

// Função para cadastro
async function cadastrarUsuario(nome, email, password) {
  showMessage('A processar cadastro...', 'info');

  try {
    console.log('=== INICIANDO CADASTRO ===');
    console.log('Dados para cadastro:', { nome, email, password: '***' });

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nome_completo: nome,
          display_name: nome,
          full_name: nome
        }
      }
    });

    console.log('=== RESULTADO DO CADASTRO ===');
    console.log('Data:', data);
    console.log('Error:', error);

    if (error) {
      showMessage(`Erro no cadastro: ${error.message}`, 'error');
    } else {
      console.log('✅ Usuário criado com sucesso!');
      console.log('User ID:', data.user?.id);
      console.log('User metadata:', data.user?.user_metadata);
      
      // Se o usuário foi criado com sucesso, criar o perfil na tabela perfis
      if (data.user) {
        try {
          console.log('Tentando criar perfil na tabela perfis...');
          const { error: profileError } = await supabase
            .from('perfis')
            .insert([
              {
                id: data.user.id,
                nome_completo: nome,
                email: email,
                created_at: new Date().toISOString()
              }
            ]);

          if (profileError) {
            console.log('❌ Erro ao criar perfil:', profileError);
            console.log('Isso é normal se a tabela perfis não existir ainda');
          } else {
            console.log('✅ Perfil criado com sucesso na tabela perfis!');
          }
        } catch (profileError) {
          console.log('❌ Erro ao criar perfil:', profileError);
        }
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        showMessage('Cadastro efetuado! Por favor, verifique o seu e-mail para confirmar a conta antes de fazer o login.', 'success');
      } else {
        showMessage('Cadastro efetuado! Verifique o seu e-mail para confirmar a conta.', 'success');
      }
      
      // Limpa o formulário após sucesso
      document.getElementById('cadastroForm').reset();
    }
  } catch (error) {
    showMessage('Erro inesperado ao cadastrar', 'error');
    console.error('Erro no cadastro:', error);
  }
}

// Event listeners para os eventos customizados
document.addEventListener('login', (event) => {
  const { email, password } = event.detail;
  loginUsuario(email, password);
});

document.addEventListener('register', (event) => {
  const { nome, email, password } = event.detail;
  cadastrarUsuario(nome, email, password);
});

document.addEventListener('resetPassword', (event) => {
  const { email } = event.detail;
  resetarSenha(email);
});

// Adiciona event listeners aos formulários quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = event.target.username.value;
      const password = event.target.password.value;
      loginUsuario(email, password);
    });
  }

  // Cadastro form
  const cadastroForm = document.getElementById('cadastroForm');
  if (cadastroForm) {
    cadastroForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const nome = event.target.newUsername.value;
      const email = event.target.email.value;
      const password = event.target.newPassword.value;
      cadastrarUsuario(nome, email, password);
    });
  }
});