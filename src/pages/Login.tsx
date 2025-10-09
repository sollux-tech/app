import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SolluxLogo from '@/components/SolluxLogo';

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
    button_label: 'Enviar link mágico',
    loading_button_label: 'Enviando link mágico...',
    link_text: 'Enviar um link mágico por e-mail',
    confirmation_text: 'Verifique seu e-mail para o link mágico',
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
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sollux-light-gray p-4 bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="w-full max-w-md">
        <SolluxLogo />
        <Card className="bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-sollux-black">Acesse a Plataforma</CardTitle>
            <CardDescription>Entre com suas credenciais ou crie uma nova conta.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      inputText: '#212121', // SOLLUX Black for text
                    },
                    radii: {
                      inputBorderRadius: '0.75rem', // rounded-lg
                      buttonBorderRadius: '0.75rem',
                    },
                  },
                },
              }}
              theme="light"
              redirectTo={window.location.origin}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;