import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarCheck, Weight, Target, Flame, Dumbbell, Play, CreditCard, Calendar, Clock, Ruler } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ClientDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  // Remove showEvaluationForm state - no longer needed
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  // Redirect to login if not authenticated
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

  const { data: evaluations = [] } = useQuery({
    queryKey: ["/api/evaluations"],
    enabled: !!user && user.role === 'client',
  });

  // Fetch client's assigned training plans
  const { data: assignedPlans = [] } = useQuery({
    queryKey: ["/api/client/assigned-plans"],
    enabled: !!user && user.role === 'client',
  });

  // Fetch client's payment plan
  const { data: paymentPlan } = useQuery({
    queryKey: ["/api/client/payment-plan"],
    enabled: !!user && user.role === 'client',
  });

  // Fetch today's workout
  const { data: todayWorkout } = useQuery({
    queryKey: ["/api/client/today-workout"],
    enabled: !!user && user.role === 'client',
  });

  // Fetch today's workout logs to check what's already completed
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: todaysLogs = [] } = useQuery({
    queryKey: ["/api/client/workout-logs", "today", todayDate],
    queryFn: () => fetch(`/api/client/workout-logs?date=${todayDate}`).then(res => {
      if (!res.ok) {
        return [];
      }
      return res.json();
    }),
    enabled: !!user && user.role === 'client',
  });

  // Fetch training plans list
  const { data: trainingPlans = [] } = useQuery({
    queryKey: ["/api/training-plans"],
    enabled: !!user && user.role === 'client',
  });

  // Fetch client profile for real weight data
  const { data: clientProfile } = useQuery({
    queryKey: ["/api/client/profile"],
    enabled: !!user && user.role === 'client',
  });

  // Fetch weekly workout stats
  const { data: weeklyStats } = useQuery({
    queryKey: ["/api/client/weekly-stats"],
    enabled: !!user && user.role === 'client',
  });

  // Fetch workout streak
  const { data: streakData } = useQuery({
    queryKey: ["/api/client/workout-streak"],
    enabled: !!user && user.role === 'client',
  });

  const evaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/evaluations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Monthly evaluation submitted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
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
        title: "Error",
        description: "Failed to submit evaluation",
        variant: "destructive",
      });
    },
  });

  // Exercise completion mutation - now uses set-based completion
  const completeExerciseMutation = useMutation({
    mutationFn: async ({ planExerciseId, totalSets, actualWeight, actualReps, actualDuration }: {
      planExerciseId: string;
      totalSets: number;
      actualWeight?: number;
      actualReps?: number;
      actualDuration?: number;
    }) => {
      await apiRequest("POST", "/api/client/complete-exercise-all-sets", {
        planExerciseId,
        totalSets,
        actualWeight,
        actualReps,
        actualDuration
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/today-workout"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/workout-logs"] });
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
        title: "Error",
        description: "Failed to log exercise completion. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Exercise completion handlers
  const handleExerciseCompletion = (exerciseId: string, checked: boolean | string) => {
    const isChecked = checked === true;
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(exerciseId);
      } else {
        newSet.delete(exerciseId);
      }
      return newSet;
    });
  };

  const handleCompleteWorkout = async () => {
    if (!todayWorkout?.workout?.exercises || completedExercises.size === 0) {
      toast({
        title: "No Exercises Selected",
        description: "Please complete at least one exercise before finishing the workout.",
        variant: "destructive",
      });
      return;
    }

    // Check which exercises are already fully completed today based on sets
    const alreadyCompletedIds = new Set();
    (todaysLogs || []).forEach((log: any) => {
      if (log.planExerciseId) {
        // Get the exercise to check total sets
        const exercise = todayWorkout.workout.exercises.find((ex: any) => ex.id === log.planExerciseId);
        if (exercise) {
          // Get all logs for this exercise today
          const exerciseLogs = (todaysLogs || []).filter((l: any) => l.planExerciseId === log.planExerciseId);
          // Count unique valid set numbers
          const validSetNumbers = exerciseLogs
            .filter((l: any) => l.setNumber != null && l.setNumber !== '' && l.setNumber > 0)
            .map((l: any) => l.setNumber);
          const uniqueCompletedSets = new Set(validSetNumbers);
          const totalSets = exercise.sets || 1;
          
          // If all sets are completed, mark exercise as completed
          if (uniqueCompletedSets.size >= totalSets) {
            alreadyCompletedIds.add(log.planExerciseId);
          }
        }
      }
    });
    
    const completedExercisesList = todayWorkout.workout.exercises.filter((ex: any) => 
      completedExercises.has(ex.id) && !alreadyCompletedIds.has(ex.id)
    );

    if (completedExercisesList.length === 0) {
      toast({
        title: "No New Exercises to Complete",
        description: "All selected exercises have already been completed today.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Log completion for each selected exercise that hasn't been completed today
      await Promise.all(
        completedExercisesList.map((exercise: any) =>
          completeExerciseMutation.mutateAsync({
            planExerciseId: exercise.id,
            totalSets: exercise.sets || 1,
            actualReps: exercise.reps,
            actualWeight: exercise.weight,
            actualDuration: exercise.duration
          })
        )
      );

      toast({
        title: "Workout Completed!",
        description: `Great job! You completed ${completedExercisesList.length} new exercises today.`,
      });

      // Reset completed exercises
      setCompletedExercises(new Set());
    } catch (error) {
      // Error handling is done in the mutation onError
      console.error("Failed to complete workout:", error);
    }
  };

  const startExercise = (exerciseId: string) => {
    toast({
      title: "Exercise Started",
      description: "Timer functionality coming soon!",
    });
  };

  const handleEvaluationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      weekNumber: parseInt(formData.get('weekNumber') as string),
      weight: parseFloat(formData.get('weight') as string),
      bodyFatPercentage: parseFloat(formData.get('bodyFat') as string),
      waistMeasurement: parseFloat(formData.get('waist') as string),
      chestMeasurement: parseFloat(formData.get('chest') as string),
      bicepsMeasurement: parseFloat(formData.get('biceps') as string),
      abdomenMeasurement: parseFloat(formData.get('abdomen') as string),
      hipsMeasurement: parseFloat(formData.get('hips') as string),
      thighMeasurement: parseFloat(formData.get('thigh') as string),
      calfMeasurement: parseFloat(formData.get('calf') as string),
      trainingAdherence: parseInt(formData.get('trainingAdherence') as string),
      mealAdherence: parseInt(formData.get('mealAdherence') as string),
      selfEvaluation: parseInt(formData.get('selfEvaluation') as string),
    };

    evaluationMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate client stats from real data
  const latestEvaluation = evaluations?.[0];
  
  // Use client profile data for weights, fallback to evaluation
  const currentWeight = clientProfile?.currentWeight || latestEvaluation?.weight || 0;
  const targetWeight = clientProfile?.targetWeight || 0;
  const startingWeight = clientProfile?.weight || currentWeight; // Use legacy weight field as starting weight
  
  // Calculate goal progress: simple percentage from current to target
  let goalProgress = 0;
  if (targetWeight && currentWeight) {
    const weightDifference = Math.abs(currentWeight - targetWeight);
    const maxWeight = Math.max(currentWeight, targetWeight);
    goalProgress = Math.max(0, Math.round((1 - (weightDifference / maxWeight)) * 100));
  }
  
  const activeAssignedPlan = assignedPlans.find((p: any) => p.isActive);
  
  // Calculate workout completion stats from real data
  const totalWorkoutsThisWeek = weeklyStats?.totalWorkouts || 0;
  const completedWorkoutsThisWeek = weeklyStats?.completedWorkouts || 0;
  const currentStreak = streakData?.streak || 0;
  
  const clientStats = {
    workoutsThisWeek: completedWorkoutsThisWeek,
    totalWorkouts: totalWorkoutsThisWeek,
    currentWeight: currentWeight,
    goalProgress: goalProgress,
    streak: currentStreak,
  };

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your fitness journey and progress</p>
      </div>



      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/10">
                <CalendarCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Workouts This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientStats.workoutsThisWeek}/{clientStats.totalWorkouts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Weight className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Weight</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.currentWeight} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Goal Progress</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.goalProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Streak</p>
                <p className="text-2xl font-bold text-gray-900">{clientStats.streak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Today's Workout */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Workout
              </CardTitle>
              {todayWorkout?.workout && (
                <p className="text-sm text-gray-500">
                  {todayWorkout.planDetails.name} - Day {todayWorkout.workout.dayOfWeek}, Week {todayWorkout.workout.week}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {todayWorkout?.workout?.exercises && todayWorkout.workout.exercises.length > 0 ? (
                <div className="space-y-4">
                  {todayWorkout.workout.exercises.map((exercise: any) => {
                    // Check if exercise is fully completed based on set completion
                    let isAlreadyCompleted = false;
                    if (Array.isArray(todaysLogs)) {
                      const exerciseLogs = todaysLogs.filter((log: any) => log.planExerciseId === exercise.id);
                      if (exerciseLogs.length > 0) {
                        // Count unique valid set numbers
                        const validSetNumbers = exerciseLogs
                          .filter((log: any) => log.setNumber != null && log.setNumber !== '' && log.setNumber > 0)
                          .map((log: any) => log.setNumber);
                        const uniqueCompletedSets = new Set(validSetNumbers);
                        const totalSets = exercise.sets || 1;
                        isAlreadyCompleted = uniqueCompletedSets.size >= totalSets;
                      }
                    }
                    return (
                      <div key={exercise.id} className={`flex items-center justify-between p-4 border rounded-lg ${
                        isAlreadyCompleted ? 'bg-green-50 border-green-200' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center space-x-4">
                          {!isAlreadyCompleted ? (
                            <Checkbox 
                              id={`exercise-${exercise.id}`}
                              checked={completedExercises.has(exercise.id)}
                              onCheckedChange={(checked) => handleExerciseCompletion(exercise.id, checked)}
                            />
                          ) : (
                            <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Dumbbell className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <h4 className={`font-medium ${isAlreadyCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                              {exercise.exercise?.name || exercise.exerciseName}
                              {isAlreadyCompleted && <span className="ml-2 text-sm text-green-600">(Completed)</span>}
                            </h4>
                            <div className="text-sm text-gray-500 space-y-1">
                              {exercise.sets && <span>Sets: {exercise.sets}</span>}
                              {exercise.reps && <span> • Reps: {exercise.reps}</span>}
                              {exercise.duration && <span> • Duration: {exercise.duration} min</span>}
                              {exercise.weight && <span> • Weight: {exercise.weight} kg</span>}
                            </div>
                            {exercise.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link href="/daily-workout">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                          {!isAlreadyCompleted && (
                            <Button variant="ghost" size="sm" onClick={() => startExercise(exercise.id)}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-6 flex justify-center">
                    {(() => {
                      // Count exercises that are fully completed (all sets done)
                      let alreadyCompletedToday = 0;
                      if (Array.isArray(todaysLogs)) {
                        todayWorkout.workout.exercises.forEach((exercise: any) => {
                          const exerciseLogs = todaysLogs.filter((log: any) => log.planExerciseId === exercise.id);
                          if (exerciseLogs.length > 0) {
                            const validSetNumbers = exerciseLogs
                              .filter((log: any) => log.setNumber != null && log.setNumber !== '' && log.setNumber > 0)
                              .map((log: any) => log.setNumber);
                            const uniqueCompletedSets = new Set(validSetNumbers);
                            const totalSets = exercise.sets || 1;
                            if (uniqueCompletedSets.size >= totalSets) {
                              alreadyCompletedToday++;
                            }
                          }
                        });
                      }
                      const totalExercises = todayWorkout.workout.exercises.length;
                      const remainingExercises = totalExercises - alreadyCompletedToday;
                      
                      if (remainingExercises === 0) {
                        return (
                          <Button 
                            className="px-6 py-3 bg-green-600 hover:bg-green-700" 
                            disabled={true}
                          >
                            All Exercises Completed Today! ✓
                          </Button>
                        );
                      }
                      
                      return (
                        <Button 
                          className="px-6 py-3" 
                          onClick={handleCompleteWorkout}
                          disabled={completedExercises.size === 0}
                        >
                          Complete Workout ({completedExercises.size} selected, {remainingExercises} remaining)
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {todayWorkout?.message || "No workout scheduled for today"}
                  </p>
                  {todayWorkout?.message === "No active training plan assigned" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Your trainer will assign a training plan soon
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Calculate weight goal progress if we have evaluations
                  let weightGoalProgress = 0;
                  console.log('Evaluations for weight calc:', evaluations);
                  
                  if (Array.isArray(evaluations) && evaluations.length >= 2) {
                    const firstEvaluation = evaluations[evaluations.length - 1]; // Oldest
                    const latestEvaluation = evaluations[0]; // Latest
                    const startWeight = firstEvaluation?.weight || 0;
                    const currentWeight = latestEvaluation?.weight || 0;
                    const weightChange = startWeight - currentWeight;
                    
                    console.log('Weight calculation:', { startWeight, currentWeight, weightChange });
                    
                    // Assume a reasonable goal (10% weight loss from start)
                    const targetWeightLoss = startWeight * 0.1;
                    if (targetWeightLoss > 0) {
                      weightGoalProgress = Math.min(100, Math.max(0, (weightChange / targetWeightLoss) * 100));
                    }
                  } else if (Array.isArray(evaluations) && evaluations.length === 1) {
                    // If only one evaluation, show 50% as baseline progress
                    weightGoalProgress = 50;
                  }

                  return (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Weight Goal Progress</span>
                        <span>{weightGoalProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={weightGoalProgress} className="h-2" />
                    </div>
                  );
                })()}
                
                {(() => {
                  // Calculate training adherence from latest evaluation
                  let trainingAdherence = 0;
                  if (Array.isArray(evaluations) && evaluations.length > 0) {
                    trainingAdherence = (evaluations[0]?.trainingAdherence || 0) * 10; // Convert from /10 to percentage
                  }

                  return (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Training Adherence</span>
                        <span>{trainingAdherence}%</span>
                      </div>
                      <Progress value={trainingAdherence} className="h-2" />
                    </div>
                  );
                })()}
                
                {(() => {
                  // Calculate nutrition adherence from latest evaluation
                  let nutritionAdherence = 0;
                  if (Array.isArray(evaluations) && evaluations.length > 0) {
                    nutritionAdherence = (evaluations[0]?.mealAdherence || 0) * 10; // Convert from /10 to percentage
                  }

                  return (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Nutrition Adherence</span>
                        <span>{nutritionAdherence}%</span>
                      </div>
                      <Progress value={nutritionAdherence} className="h-2" />
                    </div>
                  );
                })()}
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">This Month's Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Workouts:</span>
                    <span className="font-medium">
                      {weeklyStats ? `${weeklyStats.completedWorkouts}/${weeklyStats.totalWorkouts}` : "0/0"}
                    </span>
                  </div>
                  {(() => {
                    // Calculate weight change from evaluations
                    let weightChange = 0;
                    let weightChangeColor = "text-gray-600";
                    
                    if (Array.isArray(evaluations) && evaluations.length >= 2) {
                      const firstEvaluation = evaluations[evaluations.length - 1]; // Oldest
                      const latestEvaluation = evaluations[0]; // Latest
                      weightChange = (latestEvaluation?.weight || 0) - (firstEvaluation?.weight || 0);
                      weightChangeColor = weightChange < 0 ? "text-green-600" : weightChange > 0 ? "text-red-600" : "text-gray-600";
                    }

                    return (
                      <div className="flex justify-between">
                        <span>Weight Change:</span>
                        <span className={`font-medium ${weightChangeColor}`}>
                          {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                        </span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between">
                    <span>Best Streak:</span>
                    <span className="font-medium">
                      {streakData ? `${streakData.streak} days` : "0 days"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>



      {/* Latest Evaluation Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Latest Monthly Evaluation
            </span>
            <Link href="/monthly-evaluation">
              <Button variant="outline" size="sm">
                View All / Add New
              </Button>
            </Link>
          </CardTitle>
          <p className="text-sm text-gray-500">Your most recent progress evaluation</p>
        </CardHeader>
        <CardContent>
          {evaluations && evaluations.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const latestEvaluation = evaluations[0];
                return (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge>Week {latestEvaluation.weekNumber}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(latestEvaluation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Latest
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Physical Stats */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-1">
                          <Weight className="h-4 w-4" />
                          Physical Stats
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Weight:</span>
                            <span className="font-medium">{latestEvaluation.weight} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Body Fat:</span>
                            <span className="font-medium">{latestEvaluation.bodyFatPercentage}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Body Measurements */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-1">
                          <Ruler className="h-4 w-4" />
                          Measurements (cm)
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Waist:</span>
                            <span className="font-medium">{latestEvaluation.waistMeasurement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Chest:</span>
                            <span className="font-medium">{latestEvaluation.chestMeasurement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Hips:</span>
                            <span className="font-medium">{latestEvaluation.hipsMeasurement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Biceps:</span>
                            <span className="font-medium">{latestEvaluation.bicepsMeasurement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Thigh:</span>
                            <span className="font-medium">{latestEvaluation.thighMeasurement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Abdomen:</span>
                            <span className="font-medium">{latestEvaluation.abdomenMeasurement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Calf:</span>
                            <span className="font-medium">{latestEvaluation.calfMeasurement}</span>
                          </div>
                        </div>
                      </div>

                      {/* Self-Assessment */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Self-Assessment</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Training:</span>
                            <span className="font-medium">{latestEvaluation.trainingAdherence}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Nutrition:</span>
                            <span className="font-medium">{latestEvaluation.mealAdherence}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overall:</span>
                            <span className="font-medium">{latestEvaluation.selfEvaluation}/10</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No evaluations submitted yet</p>
              <Link href="/monthly-evaluation">
                <Button>
                  Submit Your First Evaluation
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Payment Plan and Training Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Current Payment Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Payment Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentPlan ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Plan:</span>
                  <span className="text-sm">{paymentPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Price:</span>
                  <span className="text-sm font-bold">${paymentPlan.amount}/{paymentPlan.type}</span>
                </div>

                {paymentPlan.features && paymentPlan.features.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {paymentPlan.features.map((feature: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No payment plan assigned yet</p>
                <p className="text-xs text-muted-foreground mt-1">Contact your trainer to set up a plan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Training Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Current Training Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedPlans.length > 0 ? (
              <div className="space-y-3">
                {assignedPlans.map((plan: any) => (
                  <div key={plan.planId} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{plan.name}</h4>
                        <p className="text-sm text-muted-foreground">{plan.goal}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Status:</div>
                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <div className="font-medium">
                          {plan.duration === 0 ? 'Till goal is met' : `${plan.duration} weeks`}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Week cycle:</span>
                        <div className="font-medium">{plan.weekCycle || 1} week{(plan.weekCycle || 1) > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                      <div>
                        <span className="text-muted-foreground">Sessions/week:</span>
                        <div className="font-medium">{plan.sessionsPerWeek || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <div className="font-medium">{plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex justify-center pt-3 border-t mt-3">
                      <Link href={`/my-training-plan/${plan.planId}`}>
                        <Button variant="ghost" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No training plan assigned yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your trainer will assign a plan soon</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
