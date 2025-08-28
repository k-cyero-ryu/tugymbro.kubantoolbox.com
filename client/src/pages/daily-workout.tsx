import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CalendarDays, 
  Dumbbell, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Timer,
  Weight,
  Target,
  Clock,
  FileText
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function DailyWorkout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Force UTC date to match server timezone
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [exerciseTimers, setExerciseTimers] = useState<Record<string, number>>({});
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, Set<number>>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

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

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setExerciseTimers(prev => ({
          ...prev,
          [activeTimer]: (prev[activeTimer] || 0) + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Fetch workout for selected date
  const { data: workoutData, isLoading: workoutLoading } = useQuery({
    queryKey: ["/api/client/workout-by-date", selectedDate],
    queryFn: () => fetch(`/api/client/workout-by-date?date=${selectedDate}`).then(res => res.json()),
    enabled: !!user && user.role === 'client' && !!selectedDate,
  });

  // Force refresh counter to invalidate cache
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Fetch workout logs for selected date
  const { data: workoutLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["/api/client/workout-logs", selectedDate, refreshCounter],
    queryFn: async () => {
      const response = await fetch(`/api/client/workout-logs?date=${selectedDate}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workout logs');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'client' && !!selectedDate,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data (replaces cacheTime in v5)
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Complete set mutation
  const completeSetMutation = useMutation({
    mutationFn: async ({ planExerciseId, setNumber, actualReps, actualWeight, notes }: {
      planExerciseId: string;
      setNumber: number;
      actualReps?: number;
      actualWeight?: number;
      notes?: string;
    }) => {
      await apiRequest("POST", "/api/client/complete-set", {
        planExerciseId,
        setNumber,
        actualReps,
        actualWeight,
        notes,
        date: selectedDate  // Pass the selected date from date picker
      });
    },
    onSuccess: async () => {
      // Force clear all related cache and refetch immediately
      await queryClient.cancelQueries({ queryKey: ["/api/client/workout-logs"] });
      queryClient.removeQueries({ queryKey: ["/api/client/workout-logs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/client/workout-logs"] });
      // Force refetch current date's logs with a slight delay to ensure DB consistency
      setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
        refetchLogs();
      }, 100);
      toast({
        title: "Set Completed!",
        description: "Great work! Keep it up.",
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
        title: "Error",
        description: "Failed to complete set. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Uncheck set mutation
  const uncheckSetMutation = useMutation({
    mutationFn: async ({ planExerciseId, setNumber, date }: {
      planExerciseId: string;
      setNumber: number;
      date: string;
    }) => {
      await apiRequest("DELETE", "/api/client/uncheck-set", {
        planExerciseId,
        setNumber,
        date
      });
    },
    onSuccess: async () => {
      // Force clear all related cache and refetch immediately
      await queryClient.cancelQueries({ queryKey: ["/api/client/workout-logs"] });
      queryClient.removeQueries({ queryKey: ["/api/client/workout-logs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/client/workout-logs"] });
      // Force refetch current date's logs with a slight delay to ensure DB consistency
      setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
        refetchLogs();
      }, 100);
      toast({
        title: "Set Unchecked",
        description: "Set has been unchecked successfully.",
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
        title: "Error",
        description: "Failed to uncheck set. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete entire exercise mutation
  const completeExerciseMutation = useMutation({
    mutationFn: async ({ planExerciseId, exerciseData, totalSets }: { 
      planExerciseId: string; 
      exerciseData: any; 
      totalSets: number;
    }) => {
      await apiRequest("POST", "/api/client/complete-exercise-all-sets", {
        planExerciseId,
        totalSets,
        actualWeight: exerciseData.weight,
        actualReps: exerciseData.reps,
        actualDuration: exerciseData.duration,
        notes: exerciseData.notes,
        date: selectedDate  // Pass the selected date from date picker
      });
    },
    onSuccess: async () => {
      // Force clear all related cache and refetch immediately
      await queryClient.cancelQueries({ queryKey: ["/api/client/workout-logs"] });
      queryClient.removeQueries({ queryKey: ["/api/client/workout-logs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/client/workout-logs"] });
      // Force refetch current date's logs with a slight delay to ensure DB consistency
      setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
        refetchLogs();
      }, 100);
      toast({
        title: "Exercise Completed!",
        description: "All sets have been marked as complete. Great work!",
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
        title: "Error",
        description: "Failed to complete exercise. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompleteExercise = (exerciseId: string, exerciseData: any, totalSets: number) => {
    const notes = exerciseNotes[exerciseId] || '';
    completeExerciseMutation.mutate({
      planExerciseId: exerciseId,
      exerciseData: { ...exerciseData, notes },
      totalSets
    });
  };

  const handleSetCompletion = (exerciseId: string, setNumber: number) => {
    setCompletedSets(prev => {
      const exerciseSets = prev[exerciseId] || new Set();
      const newSets = new Set(exerciseSets);
      
      if (newSets.has(setNumber)) {
        newSets.delete(setNumber);
      } else {
        newSets.add(setNumber);
        // Log the set completion
        const exercise = workoutData?.workout?.exercises?.find((ex: any) => ex.id === exerciseId);
        if (exercise) {
          const currentNotes = exerciseNotes[exerciseId] || '';
          completeSetMutation.mutate({
            planExerciseId: exerciseId,
            setNumber,
            actualReps: exercise.reps,
            actualWeight: exercise.weight,
            notes: currentNotes,
            date: selectedDate
          });
        }
      }
      
      return {
        ...prev,
        [exerciseId]: newSets
      };
    });
  };

  const handleSetUncheck = (exerciseId: string, setNumber: number) => {
    uncheckSetMutation.mutate({
      planExerciseId: exerciseId,
      setNumber,
      date: selectedDate
    });
  };

  // Save notes independently mutation
  const saveNotesMutation = useMutation({
    mutationFn: async ({ planExerciseId, notes, date }: { 
      planExerciseId: string; 
      notes: string;
      date: string;
    }) => {
      await apiRequest("POST", "/api/client/save-exercise-notes", {
        planExerciseId,
        notes,
        date
      });
    },
    onSuccess: async () => {
      // Force clear all related cache and refetch immediately
      await queryClient.cancelQueries({ queryKey: ["/api/client/workout-logs"] });
      queryClient.removeQueries({ queryKey: ["/api/client/workout-logs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/client/workout-logs"] });
      // Force refetch current date's logs with a slight delay to ensure DB consistency
      setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
        refetchLogs();
      }, 100);
      toast({
        title: "Notes Saved",
        description: "Your workout notes have been saved successfully.",
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
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveNotes = (exerciseId: string) => {
    const notes = exerciseNotes[exerciseId] || '';
    if (!notes.trim()) {
      toast({
        title: "No Notes",
        description: "Please add some notes before saving.",
        variant: "destructive",
      });
      return;
    }
    
    setSavingNotes(prev => ({ ...prev, [exerciseId]: true }));
    saveNotesMutation.mutate({
      planExerciseId: exerciseId,
      notes: notes.trim(),
      date: selectedDate
    });
    
    // Reset saving state after a delay
    setTimeout(() => {
      setSavingNotes(prev => ({ ...prev, [exerciseId]: false }));
    }, 1000);
  };

  const startTimer = (exerciseId: string) => {
    if (activeTimer === exerciseId) {
      setActiveTimer(null);
    } else {
      setActiveTimer(exerciseId);
      setExerciseTimers(prev => ({
        ...prev,
        [exerciseId]: prev[exerciseId] || 0
      }));
    }
  };

  const resetTimer = (exerciseId: string) => {
    setExerciseTimers(prev => ({
      ...prev,
      [exerciseId]: 0
    }));
    setActiveTimer(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate.toISOString().split('T')[0]);
    setCompletedSets({});
    setExerciseTimers({});
    setActiveTimer(null);
  };

  if (isLoading || workoutLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  
  // Debug logging to see what dates we're working with
  console.log('[DEBUG] Selected date:', selectedDate);
  console.log('[DEBUG] Today date:', new Date().toISOString().split('T')[0]);
  console.log('[DEBUG] isToday:', isToday);
  const selectedDateObj = new Date(selectedDate);
  const dateString = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header with Date Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Workout</h1>
            <p className="text-gray-600 mt-2">{dateString}</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Day
          </Button>
          
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
          >
            Next Day
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {!isToday && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Workout Content */}
      {workoutData?.workout?.exercises && workoutData.workout.exercises.length > 0 ? (
        <div className="space-y-6">
          {/* Workout Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {workoutData.planDetails.name}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Day {workoutData.workout.dayOfWeek}</span>
                <span>•</span>
                <span>Week {workoutData.workout.week}</span>
                <span>•</span>
                <span>{workoutData.workout.exercises.length} Exercises</span>
              </div>
            </CardHeader>
          </Card>

          {/* Exercises */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workoutData.workout.exercises.map((exercise: any, index: number) => {
              const exerciseLogs = workoutLogs.filter((log: any) => log.planExerciseId === exercise.id);
              // Filter out records with null/empty set numbers and count unique completed sets
              const validSetNumbers = exerciseLogs
                .filter((log: any) => log.setNumber != null && log.setNumber !== '' && log.setNumber > 0)
                .map((log: any) => log.setNumber);
              const uniqueCompletedSets = new Set(validSetNumbers);
              const completedSetsCount = uniqueCompletedSets.size;
              const totalSets = exercise.sets || 1;

              const exerciseTimer = exerciseTimers[exercise.id] || 0;
              const isTimerActive = activeTimer === exercise.id;

              return (
                <Card key={exercise.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {exercise.exercise?.name || `Exercise ${index + 1}`}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            Sets: {completedSetsCount}/{totalSets}
                          </Badge>
                          {exercise.reps && (
                            <Badge variant="outline">
                              {exercise.reps} reps
                            </Badge>
                          )}
                          {exercise.weight && (
                            <Badge variant="outline">
                              {exercise.weight} kg
                            </Badge>
                          )}
                          {exercise.duration && (
                            <Badge variant="outline">
                              {exercise.duration} min
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Exercise Actions */}
                      <div className="flex items-center gap-2">
                        {completedSetsCount < totalSets && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleCompleteExercise(exercise.id, exercise, totalSets)}
                            disabled={completeExerciseMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {completeExerciseMutation.isPending ? "Completing..." : "Complete Exercise"}
                          </Button>
                        )}
                        {completedSetsCount === totalSets && (
                          <Badge variant="default" className="bg-green-600 text-white">
                            Exercise Complete!
                          </Badge>
                        )}
                      </div>
                      
                      {/* Timer */}
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-primary">
                          {formatTime(exerciseTimer)}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant={isTimerActive ? "default" : "outline"}
                            onClick={() => startTimer(exercise.id)}
                          >
                            {isTimerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetTimer(exercise.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {exercise.notes && (
                      <p className="text-sm text-gray-600 mb-4">{exercise.notes}</p>
                    )}

                    {/* Notes for Exercise Completion */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          <FileText className="h-4 w-4 inline mr-1" />
                          Workout Notes (optional)
                        </label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveNotes(exercise.id)}
                          disabled={savingNotes[exercise.id] || !exerciseNotes[exercise.id]?.trim()}
                          className="text-xs px-2 py-1 h-7"
                        >
                          {savingNotes[exercise.id] ? "Saving..." : "Save"}
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Add notes about this workout (e.g., how it felt, adjustments made, etc.)"
                        value={exerciseNotes[exercise.id] || ''}
                        onChange={(e) => setExerciseNotes(prev => ({
                          ...prev,
                          [exercise.id]: e.target.value
                        }))}
                        className="resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Display existing notes from completed sets */}
                    {exerciseLogs.length > 0 && (
                      <div className="mb-4">
                        {exerciseLogs
                          .filter(log => log.notes && log.notes.trim() !== '')
                          .map((log, index) => (
                            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm text-blue-800">{log.notes}</p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    Set {log.setNumber} - {new Date(log.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                    
                    {/* Sets */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Sets</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {Array.from({ length: totalSets }, (_, setIndex) => {
                          const setNumber = setIndex + 1;
                          const isCompleted = exerciseLogs.some(log => log.setNumber === setNumber);
                          const completedLog = exerciseLogs.find(log => log.setNumber === setNumber);
                          
                          return (
                            <div
                              key={setNumber}
                              className={`flex items-center justify-between p-3 border rounded-lg ${
                                isCompleted ? 'bg-green-50 border-green-200' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                ) : (
                                  <Checkbox
                                    checked={completedSets[exercise.id]?.has(setNumber) || false}
                                    onCheckedChange={() => handleSetCompletion(exercise.id, setNumber)}
                                  />
                                )}
                                
                                <div className="flex items-center gap-4">
                                  <span className="font-medium">Set {setNumber}</span>
                                  
                                  {exercise.reps && (
                                    <div className="flex items-center gap-1">
                                      <Target className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm">
                                        {isCompleted && completedLog?.actualReps ? 
                                          `${completedLog.actualReps} reps` : 
                                          `${exercise.reps} reps`
                                        }
                                      </span>
                                    </div>
                                  )}
                                  
                                  {exercise.weight && (
                                    <div className="flex items-center gap-1">
                                      <Weight className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm">
                                        {isCompleted && completedLog?.actualWeight ? 
                                          `${completedLog.actualWeight} kg` : 
                                          `${exercise.weight} kg`
                                        }
                                      </span>
                                    </div>
                                  )}
                                  
                                  {exercise.duration && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm">{exercise.duration} min</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {isCompleted && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    Completed
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSetUncheck(exercise.id, setNumber)}
                                    disabled={uncheckSetMutation.isPending}
                                  >
                                    Uncheck
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {exercise.restTime && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <Timer className="h-4 w-4" />
                          <span>Rest: {exercise.restTime}s between sets</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Workout Scheduled
            </h3>
            <p className="text-gray-500">
              {isToday ? "No workout scheduled for today" : "No workout scheduled for this date"}
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}