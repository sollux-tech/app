import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { showError } from '@/utils/toast';

const Login = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  if (isLoading || session) {
    return null; // Ou um spinner de carregamento
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Faça login na sua conta
        </h2>
        <Auth
          supabaseClient={supabase}
          providers={[]} // Removendo provedores de terceiros por padrão
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Seu e-mail',
                password_label: 'Sua senha',
                email_input_placeholder: 'email@exemplo.com',
                password_input_placeholder: '••••••••',
                button_label: 'Entrar',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Já tem uma conta? Entrar',
              },
              sign_up: {
                email_label: 'Seu e-mail',
                password_label: 'Crie uma senha',
                email_input_placeholder: 'email@exemplo.com',
                password_input_placeholder: '••••••••',
                button_label: 'Registrar',
                social_provider_text: 'Registrar com {{provider}}',
                link_text: 'Não tem uma conta? Registrar',
              },
              forgotten_password: {
                email_label: 'Seu e-mail',
                email_input_placeholder: 'email@exemplo.com',
                button_label: 'Enviar instruções de redefinição',
                link_text: 'Esqueceu sua senha?',
              },
              update_password: {
                password_label: 'Nova senha',
                password_input_placeholder: '••••••••',
                button_label: 'Atualizar senha',
              },
              magic_link: {
                email_input_placeholder: 'email@exemplo.com',
                button_label: 'Enviar link mágico',
                link_text: 'Enviar um link mágico por e-mail',
              },
              verify_otp: {
                email_input_placeholder: 'email@exemplo.com',
                phone_input_placeholder: 'Número de telefone',
                token_input_placeholder: 'Seu código OTP',
                button_label: 'Verificar OTP',
              },
            },
          }}
          magicLink
          // A lógica de onAuthStateChange é tratada globalmente pelo SessionContextProvider e pelo useEffect nesta página.
          // Removendo a prop onAuthStateChange diretamente do componente Auth.
        />
      </div>
    </div>
  );
};

export default Login;