import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-sollux-card-border"> {/* Usando nova cor de fundo e borda */}
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-[#212121]">Welcome to SOLLUX</CardTitle>
          <CardDescription className="text-xl text-gray-600">
            Start building your amazing project here!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mt-4">
            This is your central hub for all SOLLUX applications. Use the sidebar to navigate.
          </p>
        </CardContent>
      </Card>
      <div className="mt-12">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;