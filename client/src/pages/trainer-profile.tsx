import { useState } from "react";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Edit, Save, X, Plus, Trash2, MapPin, Phone, Mail, Globe, Instagram, Facebook, Twitter, Linkedin } from "lucide-react";

// Trainer profile update schema
const trainerProfileSchema = z.object({
  expertise: z.string().optional(),
  experience: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    year: z.string().optional(),
  })).optional(),
  specializations: z.array(z.string()).optional(),
  socialMedia: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
  }).optional(),
});

// User profile update schema
const userProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

type TrainerProfileData = z.infer<typeof trainerProfileSchema>;
type UserProfileData = z.infer<typeof userProfileSchema>;

export default function TrainerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [certificationDialog, setCertificationDialog] = useState(false);
  const [newCertification, setNewCertification] = useState({ name: "", issuer: "", year: "" });
  const [newSpecialization, setNewSpecialization] = useState("");

  // Fetch trainer profile data using the working clients endpoint
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["/api/trainers/clients"],
    enabled: !!user && user.role === 'trainer',
  });

  // Extract profile information from the API response
  const trainerProfile = clientsData || {};
  const referralCode = clientsData?.referralCode;

  // Form for trainer profile
  const trainerForm = useForm<TrainerProfileData>({
    resolver: zodResolver(trainerProfileSchema),
    defaultValues: {
      expertise: "",
      experience: "",
      bio: "",
      phone: "",
      location: "",
      address: "",
      website: "",
      certifications: [],
      specializations: [],
      socialMedia: {},
    },
  });

  // Reset form values when data loads or when entering edit mode
  React.useEffect(() => {
    if (clientsData && isEditing) {
      trainerForm.reset({
        expertise: (clientsData as any)?.expertise || "",
        experience: (clientsData as any)?.experience || "",
        bio: (clientsData as any)?.bio || "",
        phone: (clientsData as any)?.phone || "",
        location: (clientsData as any)?.location || "",
        address: (clientsData as any)?.address || "",
        website: (clientsData as any)?.website || "",
        certifications: (clientsData as any)?.certifications || [],
        specializations: (clientsData as any)?.specializations || [],
        socialMedia: (clientsData as any)?.socialMedia || {},
      });
    }
  }, [clientsData, isEditing, trainerForm]);

  // Form for user profile
  const userForm = useForm<UserProfileData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  // Reset user form when entering edit mode
  React.useEffect(() => {
    if (user && isEditing) {
      userForm.reset({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
      });
    }
  }, [user, isEditing, userForm]);

  // Update trainer profile mutation
  const updateTrainerMutation = useMutation({
    mutationFn: async (data: TrainerProfileData) => {
      return await apiRequest('PUT', '/api/trainers/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainers/clients"] });
      toast({
        title: "Profile Updated",
        description: "Your trainer profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user profile mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserProfileData) => {
      return await apiRequest('PUT', '/api/auth/user/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers/clients"] });
      toast({
        title: "Personal Info Updated",
        description: "Your personal information has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    Promise.all([
      trainerForm.handleSubmit((data) => updateTrainerMutation.mutate(data))(),
      userForm.handleSubmit((data) => updateUserMutation.mutate(data))(),
    ]);
  };

  const addCertification = () => {
    if (newCertification.name.trim()) {
      const currentCerts = trainerForm.getValues("certifications") || [];
      trainerForm.setValue("certifications", [...currentCerts, newCertification]);
      setNewCertification({ name: "", issuer: "", year: "" });
      setCertificationDialog(false);
    }
  };

  const removeCertification = (index: number) => {
    const currentCerts = trainerForm.getValues("certifications") || [];
    trainerForm.setValue("certifications", currentCerts.filter((_, i) => i !== index));
  };

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      const currentSpecs = trainerForm.getValues("specializations") || [];
      trainerForm.setValue("specializations", [...currentSpecs, newSpecialization]);
      setNewSpecialization("");
    }
  };

  const removeSpecialization = (index: number) => {
    const currentSpecs = trainerForm.getValues("specializations") || [];
    trainerForm.setValue("specializations", currentSpecs.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-profile-title">{t('profile.trainerProfile')}</h1>
          <p className="text-gray-600 mt-2">{t('profile.manageProfessional')}</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateTrainerMutation.isPending || updateUserMutation.isPending}
                data-testid="button-save-profile"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('profile.updateProfile')}
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-profile"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('profile.personalInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <Form {...userForm}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={userForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.firstName')}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.lastName')}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t('profile.email')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('profile.firstName')}</p>
                    <p className="font-medium" data-testid="text-first-name">{user?.firstName || t('profile.notSet')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('profile.lastName')}</p>
                    <p className="font-medium" data-testid="text-last-name">{user?.lastName || t('profile.notSet')}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">{t('profile.email')}</p>
                    <p className="font-medium flex items-center gap-2" data-testid="text-email">
                      <Mail className="h-4 w-4" />
                      {user?.email}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.professionalInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <Form {...trainerForm}>
                  <div className="space-y-4">
                    <FormField
                      control={trainerForm.control}
                      name="expertise"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.expertise')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Weight Loss, Muscle Building" data-testid="input-expertise" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.experience')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 5 years" data-testid="input-experience" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.bio')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Tell clients about your background, approach, and what makes you unique as a trainer..."
                              rows={4}
                              data-testid="input-bio"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('profile.expertise')}</p>
                    <p className="font-medium" data-testid="text-expertise">{(trainerProfile as any)?.expertise || t('profile.notSpecified')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('profile.experience')}</p>
                    <p className="font-medium" data-testid="text-experience">{(trainerProfile as any)?.experience || t('profile.notSpecified')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('profile.bio')}</p>
                    <p className="text-gray-900" data-testid="text-bio">{(trainerProfile as any)?.bio || t('profile.noBioProvided')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.contactInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <Form {...trainerForm}>
                  <div className="space-y-4">
                    <FormField
                      control={trainerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.phoneNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1 (555) 123-4567" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.location')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="New York, NY" data-testid="input-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.address')}</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Studio address or gym location" rows={2} data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.website')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://yourwebsite.com" data-testid="input-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">{t('profile.phone')}</p>
                    <p className="font-medium flex items-center gap-2" data-testid="text-phone">
                      <Phone className="h-4 w-4" />
                      {(trainerProfile as any)?.phone || t('profile.notProvided')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('profile.location')}</p>
                    <p className="font-medium flex items-center gap-2" data-testid="text-location">
                      <MapPin className="h-4 w-4" />
                      {(trainerProfile as any)?.location || t('profile.notSpecified')}
                    </p>
                  </div>
                  {(trainerProfile as any)?.address && (
                    <div>
                      <p className="text-sm text-gray-600">{t('profile.address')}</p>
                      <p className="font-medium" data-testid="text-address">{(trainerProfile as any)?.address}</p>
                    </div>
                  )}
                  {(trainerProfile as any)?.website && (
                    <div>
                      <p className="text-sm text-gray-600">{t('profile.website')}</p>
                      <a 
                        href={(trainerProfile as any)?.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-2"
                        data-testid="link-website"
                      >
                        <Globe className="h-4 w-4" />
                        {(trainerProfile as any)?.website}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Referral Code */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.yourReferralCode')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">{t('profile.shareThisCode')}</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-referral-code">{referralCode || 'Loading...'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t('profile.certifications')}
                {isEditing && (
                  <Dialog open={certificationDialog} onOpenChange={setCertificationDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="button-add-certification">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('profile.addCertification')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Certification Name"
                          value={newCertification.name}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                          data-testid="input-cert-name"
                        />
                        <Input
                          placeholder="Issuing Organization"
                          value={newCertification.issuer}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                          data-testid="input-cert-issuer"
                        />
                        <Input
                          placeholder="Year"
                          value={newCertification.year}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, year: e.target.value }))}
                          data-testid="input-cert-year"
                        />
                        <Button onClick={addCertification} className="w-full" data-testid="button-save-certification">
                          {t('profile.addCertification')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(trainerForm.watch("certifications") || []).map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded" data-testid={`cert-item-${index}`}>
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      {cert.issuer && <p className="text-sm text-gray-600">{cert.issuer}</p>}
                      {cert.year && <p className="text-xs text-gray-500">{cert.year}</p>}
                    </div>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCertification(index)}
                        data-testid={`button-remove-cert-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                {(!trainerForm.watch("certifications") || trainerForm.watch("certifications")?.length === 0) && (
                  <p className="text-gray-500 text-sm" data-testid="text-no-certifications">{t('profile.noCertifications')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Specializations */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.specializations')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add specialization"
                      value={newSpecialization}
                      onChange={(e) => setNewSpecialization(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSpecialization()}
                      data-testid="input-new-specialization"
                    />
                    <Button onClick={addSpecialization} size="sm" data-testid="button-add-specialization">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(trainerForm.watch("specializations") || []).map((spec, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1" data-testid={`specialization-${index}`}>
                      {spec}
                      {isEditing && (
                        <button
                          onClick={() => removeSpecialization(index)}
                          className="ml-1"
                          data-testid={`button-remove-spec-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {(!trainerForm.watch("specializations") || trainerForm.watch("specializations")?.length === 0) && (
                  <p className="text-gray-500 text-sm" data-testid="text-no-specializations">{t('profile.noSpecializations')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.socialMedia')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...trainerForm}>
                  <div className="space-y-3">
                    <FormField
                      control={trainerForm.control}
                      name="socialMedia.instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Instagram className="h-4 w-4 text-pink-500" />
                              <Input {...field} placeholder={t('profile.instagramPlaceholder')} data-testid="input-instagram" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="socialMedia.facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Facebook className="h-4 w-4 text-blue-600" />
                              <Input {...field} placeholder={t('profile.facebookPlaceholder')} data-testid="input-facebook" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="socialMedia.twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Twitter className="h-4 w-4 text-blue-400" />
                              <Input {...field} placeholder={t('profile.twitterPlaceholder')} data-testid="input-twitter" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={trainerForm.control}
                      name="socialMedia.linkedin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Linkedin className="h-4 w-4 text-blue-700" />
                              <Input {...field} placeholder={t('profile.linkedinPlaceholder')} data-testid="input-linkedin" />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              ) : (
                <div className="space-y-2">
                  {(trainerProfile as any)?.socialMedia?.instagram && (
                    <a 
                      href={`https://instagram.com/${(trainerProfile as any)?.socialMedia?.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-pink-500"
                      data-testid="link-instagram"
                    >
                      <Instagram className="h-4 w-4" />
                      @{(trainerProfile as any)?.socialMedia?.instagram}
                    </a>
                  )}
                  {(trainerProfile as any)?.socialMedia?.facebook && (
                    <a 
                      href={(trainerProfile as any)?.socialMedia?.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-blue-600"
                      data-testid="link-facebook"
                    >
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </a>
                  )}
                  {(trainerProfile as any)?.socialMedia?.twitter && (
                    <a 
                      href={`https://twitter.com/${(trainerProfile as any)?.socialMedia?.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-blue-400"
                      data-testid="link-twitter"
                    >
                      <Twitter className="h-4 w-4" />
                      @{(trainerProfile as any)?.socialMedia?.twitter}
                    </a>
                  )}
                  {(trainerProfile as any)?.socialMedia?.linkedin && (
                    <a 
                      href={(trainerProfile as any)?.socialMedia?.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-blue-700"
                      data-testid="link-linkedin"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {(!(trainerProfile as any)?.socialMedia || Object.keys((trainerProfile as any)?.socialMedia || {}).length === 0) && (
                    <p className="text-gray-500 text-sm" data-testid="text-no-social">No social media links added</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}