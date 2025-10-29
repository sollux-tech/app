import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import React, { useEffect } from 'react'; // Importar useEffect

// Objeto de localização para traduzir a UI de autenticação para Português (Brasil)
const ptBR = {
  sign_up: {
    email_label: 'Endereço de e-mail',
    password_label: 'Crie uma senha',
    email_input_placeholder: 'Seu endereço de e-mail',
    password_input_placeholder: 'Sua senha',
    button_label: 'Cadastrar',
    loading_button_label: 'Cadastrando...',
    social_provider_text: 'Entrar com {{provider}}',
    link_text: 'Não tem uma conta? Cadastre-se',
    confirmation_text: 'Verifique seu e-mail para o link de confirmação',
    // Novos campos para localização
    first_name_label: 'Primeiro Nome',
    first_name_input_placeholder: 'Seu primeiro nome',
    last_name_label: 'Sobrenome',
    last_name_input_placeholder: 'Seu sobrenome',
  },
  sign_in: {
    email_label: 'Endereço de e-mail',
    password_label: 'Sua senha',
    email_input_placeholder: 'Seu endereço de e-mail',
    password_input_placeholder: 'Sua senha',
    button_label: 'Entrar',
    loading_button_label: 'Entrando...',
    social_provider_text: 'Entrar com {{provider}}',
    link_text: 'Já tem uma conta? Entre',
  },
  magic_link: {
    email_input_label: 'Endereço de e-mail',
    email_input_placeholder: 'Seu endereço de e-mail',
    phone_input_label: 'Número de telefone',
    phone_input_placeholder: 'Seu número de telefone',
    token_input_label: 'Token',
    token_input_placeholder: 'Seu token OTP',
    button_label: 'Verificar token',
    loading_button_label: 'Verificando...',
  },
  forgotten_password: {
    email_label: 'Endereço de e-mail',
    password_label: 'Sua nova senha',
    email_input_placeholder: 'Seu endereço de e-mail',
    button_label: 'Enviar instruções de redefinição',
    loading_button_label: 'Enviando instruções...',
    link_text: 'Esqueceu sua senha?',
    confirmation_text: 'Verifique seu e-mail para o link de redefinição',
  },
  update_password: {
    password_label: 'Nova senha',
    password_input_placeholder: 'Sua nova senha',
    button_label: 'Atualizar senha',
    loading_button_label: 'Atualizando senha...',
    confirmation_text: 'Sua senha foi atualizada',
  },
  verify_otp: {
    email_input_label: 'Endereço de e-mail',
    email_input_placeholder: 'Seu endereço de e-mail',
    phone_input_label: 'Número de telefone',
    phone_input_placeholder: 'Seu número de telefone',
    token_input_label: 'Token',
    token_input_placeholder: 'Seu token OTP',
    button_label: 'Verificar token',
    loading_button_label: 'Verificando...',
  },
};

const Login = () => {
  useEffect(() => {
    const htmlElement = document.documentElement;
    const originalClass = htmlElement.className;
    const originalDataTheme = htmlElement.getAttribute('data-theme');
    const originalColorScheme = htmlElement.style.colorScheme;

    // Força o tema claro
    htmlElement.classList.remove('dark');
    htmlElement.setAttribute('data-theme', 'light');
    htmlElement.style.colorScheme = 'light';

    return () => {
      // Restaura o tema original ao sair da página de login
      htmlElement.className = originalClass;
      if (originalDataTheme) {
        htmlElement.setAttribute('data-theme', originalDataTheme);
      } else {
        htmlElement.removeAttribute('data-theme');
      }
      htmlElement.style.colorScheme = originalColorScheme;
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl bg-card rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2">
        
        {/* Painel Esquerdo (Visual) */}
        <div className="relative hidden md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-sollux-red via-red-500 to-sollux-orange text-white text-center">
          <div className="absolute top-8 left-8 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight">Bem-vindo de volta!</h1>
          <p className="mt-4 text-lg max-w-xs">
            Acesse sua conta para gerenciar seus negócios com a SOLLUX.
          </p>
        </div>

        {/* Painel Direito (Formulário) */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-2">Login</h2>
            <p className="text-muted-foreground mb-8">
              Entre com suas credenciais ou crie uma nova conta.
            </p>
            <Auth
              supabaseClient={supabase}
              providers={[]}
              localization={{
                variables: ptBR,
              }}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#E53935', // SOLLUX Red
                      brandAccent: '#FB8C00', // SOLLUX Orange
                      inputText: 'hsl(var(--foreground))', // Usar variável CSS para texto
                    },
                    radii: {
                      inputBorderRadius: '0.75rem', // rounded-lg
                      buttonBorderRadius: '0.75rem',
                    },
                  },
                },
              }}
              theme="light" // O tema será controlado pelo next-themes, mas o Auth UI precisa de um default
              redirectTo={window.location.origin}
              // Adiciona campos de Primeiro Nome e Sobrenome ao formulário de cadastro
              // Usando um type assertion para contornar o erro de compilação do TypeScript,
              // mantendo a funcionalidade de campos extras.
              {...{
                form: {
                  sign_up: {
                    extra_fields: [
                      {
                        name: 'first_name',
                        label: ptBR.sign_up.first_name_label,
                        placeholder: ptBR.sign_up.first_name_input_placeholder,
                        type: 'text',
                        required: true,
                      },
                      {
                        name: 'last_name',
                        label: ptBR.sign_up.last_name_label,
                        placeholder: ptBR.sign_up.last_name_input_placeholder,
                        type: 'text',
                        required: true,
                      },
                    ],
                  },
                },
              } as any} // Usar 'any' como último recurso para o type assertion
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;