import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Edit, Trash2, Play, Upload, Dumbbell, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Exercises() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [editCategory, setEditCategory] = useState<string>("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('exercises.unauthorized'),
        description: t('exercises.loggedOutRetry'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: exercises = [] } = useQuery({
    queryKey: ["/api/exercises"],
    enabled: !!user && user.role === 'trainer',
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/exercises", data);
    },
    onSuccess: () => {
      toast({
        title: t('exercises.success'),
        description: t('exercises.exerciseCreated'),
      });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('exercises.unauthorized'),
          description: t('exercises.loggedOutRetry'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('exercises.error'),
        description: t('exercises.failedToCreateExercise'),
        variant: "destructive",
      });
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      await apiRequest("PUT", `/api/exercises/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: t('exercises.success'),
        description: t('exercises.exerciseUpdated'),
      });
      setEditingExercise(null);
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('exercises.unauthorized'),
          description: t('exercises.loggedOutRetry'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('exercises.error'),
        description: t('exercises.failedToUpdateExercise'),
        variant: "destructive",
      });
    },
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async ({ exerciseId, mediaURL, mediaType }: { exerciseId: string; mediaURL: string; mediaType: string }) => {
      await apiRequest("PUT", `/api/exercises/${exerciseId}/media`, { mediaURL, mediaType });
    },
    onSuccess: () => {
      toast({
        title: t('exercises.success'),
        description: t('exercises.exerciseMediaUploaded'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
    },
    onError: (error) => {
      toast({
        title: t('exercises.error'),
        description: t('exercises.failedToUploadMedia'),
        variant: "destructive",
      });
    },
  });

  const handleCreateExercise = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
    };

    createExerciseMutation.mutate(data);
  };

  const handleUpdateExercise = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      id: editingExercise.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category: editCategory,
    };

    updateExerciseMutation.mutate(data);
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (exerciseId: string, mediaType: string) => (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      uploadMediaMutation.mutate({ exerciseId, mediaURL: uploadURL, mediaType });
    }
  };

  const filteredExercises = exercises?.filter((exercise: any) => 
    selectedCategory === "all" || exercise.category === selectedCategory
  );

  const categories = ["all", "strength", "cardio", "flexibility", "sports"];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'trainer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('exercises.accessDenied')}</h1>
          <p className="text-gray-600">{t('exercises.onlyTrainersAccess')}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('exercises.library')}</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('exercises.addExercise')}
        </Button>
      </div>

      {/* Category Filter */}
      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {t(`exercises.categories.${category}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('exercises.addNewExercise')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateExercise} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{t('exercises.exerciseName')}</Label>
                  <Input id="name" name="name" placeholder={t('exercises.exercisePlaceholder')} required />
                </div>
                <div>
                  <Label htmlFor="category">{t('exercises.category')}</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder={t('exercises.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">{t('exercises.categories.strength')}</SelectItem>
                      <SelectItem value="cardio">{t('exercises.categories.cardio')}</SelectItem>
                      <SelectItem value="flexibility">{t('exercises.categories.flexibility')}</SelectItem>
                      <SelectItem value="sports">{t('exercises.categories.sports')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">{t('exercises.description')}</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder={t('exercises.descriptionPlaceholder')} 
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createExerciseMutation.isPending}
                >
                  {createExerciseMutation.isPending ? t('exercises.creating') : t('exercises.addExercise')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Exercise Form */}
      {editingExercise && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Edit Exercise</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingExercise(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateExercise} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t('exercises.exerciseName')}</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingExercise.name}
                  placeholder={t('exercises.exercisePlaceholder')} 
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-category">{t('exercises.category')}</Label>
                <Select value={editCategory} onValueChange={setEditCategory} required>
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue placeholder={t('exercises.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">{t('exercises.categories.strength')}</SelectItem>
                    <SelectItem value="cardio">{t('exercises.categories.cardio')}</SelectItem>
                    <SelectItem value="flexibility">{t('exercises.categories.flexibility')}</SelectItem>
                    <SelectItem value="sports">{t('exercises.categories.sports')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-description">{t('exercises.description')}</Label>
                <Textarea 
                  id="edit-description" 
                  name="description" 
                  defaultValue={editingExercise.description}
                  placeholder={t('exercises.descriptionPlaceholder')} 
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingExercise(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateExerciseMutation.isPending}
                >
                  {updateExerciseMutation.isPending ? 'Updating...' : 'Update Exercise'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises && filteredExercises.length > 0 ? (
          filteredExercises.map((exercise: any) => (
            <Card key={exercise.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {t(`exercises.categories.${exercise.category}`)}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" data-testid="button-edit-exercise" onClick={() => {
                      setEditingExercise(exercise);
                      setEditCategory(exercise.category);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {exercise.mediaUrl ? (
                  <div className="mb-4">
                    {exercise.mediaType === 'video' ? (
                      <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center">
                        <Play className="h-8 w-8 text-gray-500" />
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center">
                        <img 
                          src={exercise.mediaUrl} 
                          alt={exercise.name}
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete(exercise.id, 'image')}
                      buttonClassName="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center"
                    >
                      <div className="text-center">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <span className="text-sm text-gray-500">{t('exercises.uploadMedia')}</span>
                      </div>
                    </ObjectUploader>
                  </div>
                )}

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{exercise.description}</p>

                <div className="flex justify-between items-center">
                  <Button variant="outline" size="sm">
                    {t('exercises.addToPlan')}
                  </Button>
                  {exercise.mediaUrl && (
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      {t('exercises.view')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedCategory === "all" ? t('exercises.noExercises') : t('exercises.noCategoryExercises', { category: t(`exercises.categories.${selectedCategory}`) })}
            </h3>
            <p className="text-gray-500 mb-4">
              {selectedCategory === "all" 
                ? t('exercises.startBuildingLibrary')
                : t('exercises.addSomeExercises', { category: t(`exercises.categories.${selectedCategory}`) })
              }
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('exercises.addYourFirstExercise')}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
