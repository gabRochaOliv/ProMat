/* ================================================================
   AUTH SCRIPT — Nova versão do layout
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab') || 'cadastro';
  trocarView(tab);
});

/**
 * Alterna entre as views de Cadastro e Login.
 */
window.trocarView = function (view) {
  const isLogin = view === 'login';

  const viewCadastro = document.getElementById('view-cadastro');
  const viewLogin = document.getElementById('view-login');

  if (isLogin) {
    viewCadastro.style.display = 'none';
    viewLogin.style.display = 'flex';
  } else {
    viewCadastro.style.display = 'flex';
    viewLogin.style.display = 'none';
  }

  // Limpa mensagens de erro
  document.getElementById('error-cadastro').textContent = '';
  document.getElementById('error-login').textContent = '';

  // Foco inicial
  setTimeout(() => {
    if (isLogin) {
      document.getElementById('log-email')?.focus();
    } else {
      document.getElementById('reg-name')?.focus();
    }
  }, 50);
};

/**
 * Traduz mensagens de erro do Supabase
 */
function traduzirErro(msg) {
  const map = {
    'Invalid login credentials':           'E-mail ou senha incorretos.',
    'Email not confirmed':                  'Confirme seu e-mail antes de entrar.',
    'User already registered':              'Este e-mail já está cadastrado. Faça login.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address':     'E-mail inválido.',
    'Signup requires a valid password':     'A senha deve ter pelo menos 6 caracteres.',
  };
  return map[msg] || msg;
}

function setMsg(view, msg, tipo) {
  const el = document.getElementById(`error-${view}`);
  if (!el) return;
  el.textContent = msg;
  el.style.color = tipo === 'sucesso' ? 'var(--success-color)' : 'var(--error-color)';
}

function toggleLoading(view, isLoading) {
  const btn = document.getElementById(`btn-submit-${view}`);
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');

  btn.disabled = isLoading;
  if (isLoading) {
    text.style.display = 'none';
    spinner.style.display = 'block';
  } else {
    text.style.display = 'block';
    spinner.style.display = 'none';
  }
}

/**
 * Submissão de Formulário
 */
window.submitAuth = async function (view) {
  let email, password, name, passwordConfirm;

  if (view === 'cadastro') {
    name = (document.getElementById('reg-name').value || '').trim();
    email = (document.getElementById('reg-email').value || '').trim();
    password = document.getElementById('reg-password').value || '';
    passwordConfirm = document.getElementById('reg-password-confirm').value || '';

    if (!name || !email || !password) {
      return setMsg(view, 'Preencha todos os campos.', 'erro');
    }
    if (password !== passwordConfirm) {
      return setMsg(view, 'As senhas não coincidem.', 'erro');
    }
  } else {
    email = (document.getElementById('log-email').value || '').trim();
    password = document.getElementById('log-password').value || '';

    if (!email || !password) {
      return setMsg(view, 'Preencha e-mail e senha.', 'erro');
    }
  }

  setMsg(view, '', '');
  toggleLoading(view, true);

  try {
    const sb = window._sbClient || (await window.initAuthSupabase?.());
    if (!sb) throw new Error('Serviço de autenticação indisponível.');

    if (view === 'cadastro') {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) throw new Error(traduzirErro(error.message));

      // Se não retornou sessão, é porque a confirmação de e-mail está ativada no Supabase.
      // No entanto, o usuário pediu para "tirar", então vamos apenas avisar do sucesso e redirecionar para login.
      const needsConfirm = !data?.session;
      if (needsConfirm) {
        toggleLoading(view, false);
        setMsg(view, '✅ Conta criada com sucesso! Faça login para entrar.', 'sucesso');
        setTimeout(() => trocarView('login'), 2000);
      } else {
        // Logado automaticamente
        window.location.href = '/?first_login=true';
      }
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(traduzirErro(error.message));

      // Redireciona para o app
      window.location.href = '/';
    }
  } catch (err) {
    setMsg(view, err.message || 'Erro desconhecido.', 'erro');
    toggleLoading(view, false);
  }
};

// Enter key submit
document.addEventListener('DOMContentLoaded', () => {
  ['reg-name', 'reg-email', 'reg-password', 'reg-password-confirm'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitAuth('cadastro');
    });
  });

  ['log-email', 'log-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitAuth('login');
    });
  });
});
