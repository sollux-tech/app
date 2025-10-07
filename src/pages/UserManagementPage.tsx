import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { UserProfile } from '@/types/profile';
import UserProfileFormDialog from '@/components/UserProfileFormDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const UserManagementPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useQuery<UserProfile, Error>({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated.");
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isSessionLoading,
  });

  const isLoading = isSessionLoading || isProfileLoading;

  if (profileError) {
    return (
      <div className="text-center text-sollux-red">
        Erro ao carregar perfil: {profileError.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Meu Perfil</CardTitle>
          <Button onClick={() => setIsEditDialogOpen(true)} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Edit className="mr-2 h-4 w-4" /> Editar Perfil
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.first_name || "User"} />
                <AvatarFallback className="bg-sollux-red text-white text-3xl">
                  {userProfile?.first_name ? userProfile.first_name[0] : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-sollux-black">
                  {userProfile?.first_name} {userProfile?.last_name}
                </h2>
                <p className="text-gray-600">Email: {user?.email}</p>
                {userProfile?.birthdate && <p className="text-gray-600">Nascimento: {userProfile.birthdate}</p>}
                {userProfile?.city && userProfile?.state && (
                  <p className="text-gray-600">Localização: {userProfile.city}, {userProfile.state}</p>
                )}
                {userProfile?.updated_at && (
                  <p className="text-sm text-gray-500 mt-2">Última atualização: {new Date(userProfile.updated_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserProfileFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        userProfile={userProfile}
      />
    </div>
  );
};

export default UserManagementPage;