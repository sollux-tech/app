import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Importar Input
import { Search } from "lucide-react"; // Importar Search icon

const Index = () => {
  return (
    <div className="space-y-6">
      {/* Header - Mantido para contexto, mas o título principal agora está na Topbar */}
      {/* <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bem-vindo ao SOLLUX Business Platform</p>
      </div> */}

      {/* Campos de entrada inspirados na imagem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl p-4 flex items-center">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input placeholder="Buscar..." className="flex-1 border-none bg-transparent focus-visible:ring-0 text-foreground" />
        </Card>
        <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl p-4 flex items-center col-span-2">
          <Input placeholder="Outro campo de entrada..." className="flex-1 border-none bg-transparent focus-visible:ring-0 text-foreground" />
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Ajustado para 3 colunas */}
        <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground uppercase">Indicador X</CardTitle>
            <span className="text-muted-foreground text-lg">...</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Valor 1</div>
            <p className="text-xs text-muted-foreground">Descrição do indicador</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground uppercase">Indicador Y</CardTitle>
            <span className="text-muted-foreground text-lg">...</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Valor 2</div>
            <p className="text-xs text-muted-foreground">Descrição do indicador</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground uppercase">Indicador Z</CardTitle>
            <span className="text-muted-foreground text-lg">...</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Valor 3</div>
            <p className="text-xs text-muted-foreground">Descrição do indicador</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Painel X */}
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Painel X</CardTitle>
          <span className="text-muted-foreground text-lg">...</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Este é um painel de exemplo. Você pode adicionar gráficos, tabelas ou outros componentes aqui.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Informação</h3>
              <p className="text-blue-800 text-sm">
                Personalize este painel com os dados mais relevantes para sua operação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;