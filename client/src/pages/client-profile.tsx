import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Target, 
  Weight, 
  Ruler,
  Activity,
  Save,
  Edit2,
  X,
  Camera
} from "lucide-react";

export default function ClientProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: clientProfile, isLoading: profileLoading, error } = useQuery({
    queryKey: ["/api/client/profile"],
    enabled: !!user && user.role === 'client',
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return await apiRequest('PUT', '/api/client/profile', profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const profileData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      dateOfBirth: formData.get('dateOfBirth'),
      goals: formData.get('goals'),
      currentWeight: parseFloat(formData.get('currentWeight') as string) || 0,
      targetWeight: parseFloat(formData.get('targetWeight') as string) || 0,
      height: parseFloat(formData.get('height') as string) || 0,
      activityLevel: formData.get('activityLevel'),
      medicalConditions: formData.get('medicalConditions'),
      dietaryRestrictions: formData.get('dietaryRestrictions'),
      referralSource: formData.get('referralSource'),
    };
    updateProfileMutation.mutate(profileData);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Profile</h2>
          <p className="text-muted-foreground mb-4">Failed to load your profile information.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-muted-foreground">Your profile information could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and fitness goals</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={clientProfile.firstName || ''}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={clientProfile.lastName || ''}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={clientProfile.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={clientProfile.phone || ''}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={clientProfile.dateOfBirth ? new Date(clientProfile.dateOfBirth).toISOString().split('T')[0] : ''}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="referralSource">Referral Source</Label>
                <Input
                  id="referralSource"
                  name="referralSource"
                  placeholder="How did you hear about me?"
                  defaultValue={clientProfile.referralSource || ''}
                  disabled={!isEditing}
                />
                <p className="text-xs text-muted-foreground mt-1">How did you hear about your trainer?</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fitness Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Fitness Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="goals">Fitness Goals</Label>
              <Textarea
                id="goals"
                name="goals"
                placeholder="Describe your fitness goals and what you want to achieve..."
                defaultValue={clientProfile.goals || ''}
                disabled={!isEditing}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currentWeight" className="flex items-center gap-1">
                  <Weight className="h-4 w-4" />
                  Current Weight (kg)
                </Label>
                <Input
                  id="currentWeight"
                  name="currentWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={clientProfile.currentWeight || ''}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="targetWeight" className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Target Weight (kg)
                </Label>
                <Input
                  id="targetWeight"
                  name="targetWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={clientProfile.targetWeight || ''}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="height" className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  Height (cm)
                </Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  min="0"
                  defaultValue={clientProfile.height || ''}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="activityLevel" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Activity Level
              </Label>
              <Select name="activityLevel" defaultValue={clientProfile.activityLevel || 'moderate'} disabled={!isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                  <SelectItem value="light">Light (light exercise 1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderate (moderate exercise 3-5 days/week)</SelectItem>
                  <SelectItem value="active">Active (hard exercise 6-7 days/week)</SelectItem>
                  <SelectItem value="very_active">Very Active (very hard exercise/sports & physical job)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Health Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Health Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="medicalConditions">Medical Conditions</Label>
              <Textarea
                id="medicalConditions"
                name="medicalConditions"
                placeholder="Any medical conditions, injuries, or health concerns your trainer should know about..."
                defaultValue={clientProfile.medicalConditions || ''}
                disabled={!isEditing}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
              <Textarea
                id="dietaryRestrictions"
                name="dietaryRestrictions"
                placeholder="Any dietary restrictions, allergies, or preferences..."
                defaultValue={clientProfile.dietaryRestrictions || ''}
                disabled={!isEditing}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Trainer Information */}
        <Card>
          <CardHeader>
            <CardTitle>My Trainer</CardTitle>
          </CardHeader>
          <CardContent>
            {clientProfile.trainer ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {clientProfile.trainer.firstName} {clientProfile.trainer.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{clientProfile.trainer.email}</p>
                  <Badge variant="outline" className="mt-1">Personal Trainer</Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No trainer assigned yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Member since:</span>
              <span>{clientProfile.createdAt ? new Date(clientProfile.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last updated:</span>
              <span>{clientProfile.updatedAt ? new Date(clientProfile.updatedAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Account status:</span>
              <Badge variant="outline">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}