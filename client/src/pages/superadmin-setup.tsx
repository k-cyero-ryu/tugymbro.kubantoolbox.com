import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function SuperAdminSetup() {
  const { toast } = useToast();
  const [setupData, setSetupData] = useState({
    email: "",
    setupKey: "",
  });

  const setupMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/setup-superadmin", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SuperAdmin account created successfully! Please log in.",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create superadmin account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!setupData.email || !setupData.setupKey) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setupMutation.mutate(setupData);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            SuperAdmin Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Initialize the first superadmin account for the platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              Account Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={setupData.email}
                  onChange={(e) => setSetupData(prev => ({ ...prev, email: e.target.value }))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  This user will be promoted to superadmin
                </p>
              </div>
              
              <div>
                <Label htmlFor="setupKey">Setup Key</Label>
                <Input
                  id="setupKey"
                  type="password"
                  required
                  placeholder="Enter setup key"
                  value={setupData.setupKey}
                  onChange={(e) => setSetupData(prev => ({ ...prev, setupKey: e.target.value }))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Contact your system administrator for the setup key
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? "Creating..." : "Create SuperAdmin"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/api/login" className="text-primary hover:text-primary-dark">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}