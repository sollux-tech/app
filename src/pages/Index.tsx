import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center p-4"> {/* Removido min-h-[calc(100vh-64px)] */}
      <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 text-center">
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
      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;