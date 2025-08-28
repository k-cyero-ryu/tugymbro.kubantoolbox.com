import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  ArrowLeft, 
  Activity, 
  Clock, 
  Target, 
  Play,
  Calendar,
  User
} from "lucide-react";

export default function TrainingPlanDetail() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/training-plans/:planId");
  const planId = params?.planId;

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

  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: [`/api/training-plans/${planId}`],
    enabled: !!planId && !!user && user.role === 'trainer',
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

  const { data: exercises = [] } = useQuery({
    queryKey: ["/api/exercises"],
    enabled: !!user && user.role === 'trainer',
  });

  if (isLoading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'trainer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is only available to trainers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (planError && !planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Plan</h2>
            <p className="text-muted-foreground">Failed to load training plan details.</p>
            <Link href="/training-plans">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Training Plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Training Plan Not Found</h2>
            <p className="text-muted-foreground">The requested training plan could not be found.</p>
            <Link href="/training-plans">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Training Plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string | null | undefined) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getExerciseDetails = (exerciseId: string) => {
    return exercises.find((ex: any) => ex.id === exerciseId);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/training-plans">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Training Plans
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{plan.name}</h1>
            <p className="text-muted-foreground">{plan.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={plan.isActive ? "default" : "secondary"}>
            {plan.isActive ? "Active" : "Draft"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Plan Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Plan Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.duration === 0 ? 'Till goal is met' : `${plan.duration} weeks`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Week Cycle</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.weekCycle || 1} week{(plan.weekCycle || 1) > 1 ? 's' : ''} pattern
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Goal</p>
                  <p className="text-sm text-muted-foreground">{plan.goal || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Play className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Exercises</p>
                  <p className="text-sm text-muted-foreground">{plan.planExercises?.length || 0} exercises</p>
                </div>
              </div>
              {plan.createdAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Nutrition Information */}
              {(plan.dailyCalories || plan.protein || plan.carbs) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium">Nutrition Guidelines</h4>
                    {plan.dailyCalories && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">Daily Calories</p>
                          <p className="text-sm text-muted-foreground">{plan.dailyCalories} kcal</p>
                        </div>
                      </div>
                    )}
                    {plan.protein && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">Protein</p>
                          <p className="text-sm text-muted-foreground">{plan.protein}g</p>
                        </div>
                      </div>
                    )}
                    {plan.carbs && (
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">Carbohydrates</p>
                          <p className="text-sm text-muted-foreground">{plan.carbs}g</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exercise Details */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Exercise Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plan.planExercises && plan.planExercises.length > 0 ? (
                <div className="space-y-4">
                  {plan.planExercises.map((planExercise: any, index: number) => {
                    const exercise = getExerciseDetails(planExercise.exerciseId);
                    return (
                      <div key={planExercise.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {exercise?.name || `Exercise ${index + 1}`}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {exercise?.category || 'General'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {exercise?.description && (
                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground">{exercise.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {planExercise.sets && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Sets:</span>
                              <span className="text-sm">{planExercise.sets}</span>
                            </div>
                          )}
                          {planExercise.reps && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Reps:</span>
                              <span className="text-sm">{planExercise.reps}</span>
                            </div>
                          )}
                          {planExercise.duration && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Duration:</span>
                              <span className="text-sm">{planExercise.duration} min</span>
                            </div>
                          )}
                          {planExercise.weight && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Weight:</span>
                              <span className="text-sm">{planExercise.weight} kg</span>
                            </div>
                          )}
                          {planExercise.restTime && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Rest:</span>
                              <span className="text-sm">{planExercise.restTime} sec</span>
                            </div>
                          )}
                        </div>
                        
                        {planExercise.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <h4 className="text-sm font-medium mb-2">Notes:</h4>
                            <p className="text-sm text-muted-foreground">{planExercise.notes}</p>
                          </div>
                        )}

                        {exercise?.instructions && (
                          <div className="mt-3 pt-3 border-t">
                            <h4 className="text-sm font-medium mb-2">Instructions:</h4>
                            <p className="text-sm text-muted-foreground">{exercise.instructions}</p>
                          </div>
                        )}

                        {exercise?.equipment && exercise.equipment.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <h4 className="text-sm font-medium mb-2">Equipment needed:</h4>
                            <div className="flex flex-wrap gap-1">
                              {exercise.equipment.map((item: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {(exercise?.mediaUrl || exercise?.mediaURL) && (
                          <div className="mt-3 pt-3 border-t">
                            <h4 className="text-sm font-medium mb-2">Exercise Media:</h4>
                            {exercise.mediaType === 'video' ? (
                              <video 
                                src={exercise.mediaUrl || exercise.mediaURL} 
                                controls
                                className="w-full max-w-md h-48 rounded-lg"
                                poster=""
                              >
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <img 
                                src={exercise.mediaUrl || exercise.mediaURL} 
                                alt={exercise.name} 
                                className="w-full max-w-md h-48 object-cover rounded-lg"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No exercises added to this plan yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">Exercises can be added when creating or editing the training plan.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}