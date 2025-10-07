import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sollux-light-gray dark:bg-gray-900 p-4"> {/* Usando nova cor de fundo */}
      <Card className="w-full max-w-md bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border"> {/* Usando nova cor de fundo e borda */}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to SOLLUX</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#E53935', // SOLLUX Red
                    brandAccent: '#FB8C00', // SOLLUX Orange
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
  );
};

export default Login;