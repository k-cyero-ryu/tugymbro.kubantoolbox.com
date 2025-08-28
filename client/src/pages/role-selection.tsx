import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Users, Dumbbell, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RoleSelection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<'trainer' | 'client' | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [trainerData, setTrainerData] = useState({
    expertise: "",
    experience: "",
  });

  const roleMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/users/select-role", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role selected successfully! Redirecting...",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select role",
        variant: "destructive",
      });
    },
  });

  const handleRoleSubmit = () => {
    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    const data: any = { role: selectedRole };

    if (selectedRole === 'trainer') {
      if (!trainerData.expertise || !trainerData.experience) {
        toast({
          title: "Error",
          description: "Please fill in all trainer information",
          variant: "destructive",
        });
        return;
      }
      data.trainerData = trainerData;
    } else if (selectedRole === 'client') {
      if (referralCode) {
        data.referralCode = referralCode;
      }
    }

    roleMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to My Body Trainer Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please select your role to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Trainer Role */}
          <Card 
            className={`cursor-pointer transition-all ${
              selectedRole === 'trainer' 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedRole('trainer')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Personal Trainer</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Manage clients, create training plans, track progress, and grow your fitness business.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Create custom training plans</li>
                <li>• Track client progress</li>
                <li>• Manage your client base</li>
                <li>• Monitor earnings</li>
              </ul>
            </CardContent>
          </Card>

          {/* Client Role */}
          <Card 
            className={`cursor-pointer transition-all ${
              selectedRole === 'client' 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedRole('client')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Connect with a personal trainer, follow custom plans, and track your fitness journey.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Follow personalized training plans</li>
                <li>• Track your workouts and progress</li>
                <li>• Communicate with your trainer</li>
                <li>• Monitor your achievements</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information Forms */}
        {selectedRole === 'trainer' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Trainer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="expertise">Areas of Expertise</Label>
                <Textarea
                  id="expertise"
                  placeholder="e.g., Weight loss, Muscle building, Sports performance..."
                  value={trainerData.expertise}
                  onChange={(e) => setTrainerData(prev => ({ ...prev, expertise: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  placeholder="e.g., 5 years"
                  value={trainerData.experience}
                  onChange={(e) => setTrainerData(prev => ({ ...prev, experience: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedRole === 'client' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="referralCode">Trainer Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  placeholder="Enter your trainer's referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  If you have a trainer's referral code, enter it to be automatically assigned to them.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {selectedRole && (
          <div className="text-center">
            <Button 
              onClick={handleRoleSubmit}
              disabled={roleMutation.isPending}
              size="lg"
              className="px-8"
            >
              {roleMutation.isPending ? "Setting up..." : `Continue as ${selectedRole}`}
            </Button>
          </div>
        )}

        {/* Superadmin Note */}
        <div className="text-center mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">System Administrator</span>
          </div>
          <p className="text-sm text-blue-700">
            If you're a system administrator, contact the platform admin to assign superadmin privileges.
          </p>
        </div>
      </div>
    </div>
  );
}