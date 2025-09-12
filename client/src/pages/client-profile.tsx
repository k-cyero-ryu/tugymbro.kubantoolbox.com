import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Camera,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Award,
  Star,
  Info
} from "lucide-react";

export default function ClientProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [trainerDialogOpen, setTrainerDialogOpen] = useState(false);

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
          <h1 className="text-3xl font-bold">{t('profile.myProfile')}</h1>
          <p className="text-muted-foreground">{t('profile.managePersonal')}</p>
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
                <Label htmlFor="firstName">{t('profile.firstName')}</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={clientProfile.firstName || ''}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">{t('profile.lastName')}</Label>
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
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input
                  id="email"
                  value={clientProfile.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('profile.emailCannotBeChanged')}</p>
              </div>
              <div>
                <Label htmlFor="phone">{t('profile.phoneNumber')}</Label>
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
              <Label htmlFor="goals">{t('profile.fitnessGoals')}</Label>
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
                  {t('profile.currentWeight')} (kg)
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
                  {t('profile.targetWeight')} (kg)
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
                  {t('profile.height')} (cm)
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
                {t('profile.activityLevel')}
              </Label>
              <Select name="activityLevel" defaultValue={clientProfile.activityLevel || 'moderate'} disabled={!isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder={t('profile.selectActivityLevel')} />
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
              <Label htmlFor="medicalConditions">{t('profile.medicalConditions')}</Label>
              <Textarea
                id="medicalConditions"
                name="medicalConditions"
                placeholder={t('profile.medicalConditionsPlaceholder')}
                defaultValue={clientProfile.medicalConditions || ''}
                disabled={!isEditing}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="dietaryRestrictions">{t('profile.dietaryRestrictions')}</Label>
              <Textarea
                id="dietaryRestrictions"
                name="dietaryRestrictions"
                placeholder={t('profile.dietaryRestrictionsPlaceholder')}
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
              <Dialog open={trainerDialogOpen} onOpenChange={setTrainerDialogOpen}>
                <DialogTrigger asChild>
                  <div 
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                    data-testid="trainer-info-trigger"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {clientProfile.trainer.firstName} {clientProfile.trainer.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{clientProfile.trainer.email}</p>
                      <Badge variant="outline" className="mt-1">Personal Trainer</Badge>
                    </div>
                    <Info className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="trainer-details-dialog">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Trainer Details
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Trainer Header */}
                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold" data-testid="trainer-name">
                          {clientProfile.trainer.firstName} {clientProfile.trainer.lastName}
                        </h2>
                        <p className="text-muted-foreground flex items-center gap-1" data-testid="trainer-email">
                          <Mail className="h-4 w-4" />
                          {clientProfile.trainer.email}
                        </p>
                        <Badge variant="default" className="mt-2">Certified Personal Trainer</Badge>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Professional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clientProfile.trainer.expertise && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Expertise</p>
                            <p className="font-medium" data-testid="trainer-expertise">{clientProfile.trainer.expertise}</p>
                          </div>
                        )}
                        {clientProfile.trainer.experience && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Experience</p>
                            <p className="font-medium" data-testid="trainer-experience">{clientProfile.trainer.experience}</p>
                          </div>
                        )}
                      </div>
                      {clientProfile.trainer.bio && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Bio</p>
                          <p className="text-gray-900" data-testid="trainer-bio">{clientProfile.trainer.bio}</p>
                        </div>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Contact Information</h3>
                      <div className="space-y-3">
                        {clientProfile.trainer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="trainer-phone">{clientProfile.trainer.phone}</span>
                          </div>
                        )}
                        {clientProfile.trainer.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="trainer-location">{clientProfile.trainer.location}</span>
                          </div>
                        )}
                        {clientProfile.trainer.address && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Address</p>
                            <p data-testid="trainer-address">{clientProfile.trainer.address}</p>
                          </div>
                        )}
                        {clientProfile.trainer.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={clientProfile.trainer.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              data-testid="trainer-website"
                            >
                              {clientProfile.trainer.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Certifications */}
                    {clientProfile.trainer.certifications && clientProfile.trainer.certifications.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Certifications
                        </h3>
                        <div className="space-y-2">
                          {clientProfile.trainer.certifications.map((cert: any, index: number) => (
                            <div key={index} className="p-3 bg-muted/30 rounded-lg" data-testid={`certification-${index}`}>
                              <p className="font-medium">{cert.name}</p>
                              {cert.issuer && <p className="text-sm text-muted-foreground">{cert.issuer}</p>}
                              {cert.year && <p className="text-xs text-muted-foreground">{cert.year}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specializations */}
                    {clientProfile.trainer.specializations && clientProfile.trainer.specializations.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Star className="h-5 w-5" />
                          Specializations
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {clientProfile.trainer.specializations.map((spec: string, index: number) => (
                            <Badge key={index} variant="secondary" data-testid={`specialization-${index}`}>
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Social Media */}
                    {clientProfile.trainer.socialMedia && Object.keys(clientProfile.trainer.socialMedia).length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Social Media</h3>
                        <div className="space-y-2">
                          {clientProfile.trainer.socialMedia.instagram && (
                            <a 
                              href={`https://instagram.com/${clientProfile.trainer.socialMedia.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-pink-500 hover:underline"
                              data-testid="trainer-instagram"
                            >
                              <Instagram className="h-4 w-4" />
                              @{clientProfile.trainer.socialMedia.instagram}
                            </a>
                          )}
                          {clientProfile.trainer.socialMedia.facebook && (
                            <a 
                              href={clientProfile.trainer.socialMedia.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline"
                              data-testid="trainer-facebook"
                            >
                              <Facebook className="h-4 w-4" />
                              Facebook
                            </a>
                          )}
                          {clientProfile.trainer.socialMedia.twitter && (
                            <a 
                              href={`https://twitter.com/${clientProfile.trainer.socialMedia.twitter}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-400 hover:underline"
                              data-testid="trainer-twitter"
                            >
                              <Twitter className="h-4 w-4" />
                              @{clientProfile.trainer.socialMedia.twitter}
                            </a>
                          )}
                          {clientProfile.trainer.socialMedia.linkedin && (
                            <a 
                              href={clientProfile.trainer.socialMedia.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-700 hover:underline"
                              data-testid="trainer-linkedin"
                            >
                              <Linkedin className="h-4 w-4" />
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
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
                  {t('profile.updateProfile')}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}