import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Eye, Dumbbell, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function TrainingPlans() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [weeksCycle, setWeeksCycle] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  const [workoutDays, setWorkoutDays] = useState<Record<number, Record<number, Array<{
    exerciseId: string;
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    restTime?: number;
    notes?: string;
  }>>>>({});

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

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/training-plans"],
    enabled: !!user && (user.role === 'trainer' || user.role === 'client'),
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["/api/exercises"],
    enabled: !!user && user.role === 'trainer' && showCreateForm,
  });



  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/training-plans", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Training plan created successfully",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
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
        description: "Failed to create training plan",
        variant: "destructive",
      });
    },
  });



  const handleCreatePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Convert workoutDays to planExercises format
    // Note: Since planExercises table doesn't have week field, we'll take the first week as the template
    const planExercises: any[] = [];
    const firstWeekData = workoutDays[1] || {};
    
    Object.entries(firstWeekData).forEach(([day, exercises]) => {
      exercises.forEach(exercise => {
        planExercises.push({
          exerciseId: exercise.exerciseId,
          dayOfWeek: parseInt(day),
          sets: exercise.sets || null,
          reps: exercise.reps || null,
          weight: exercise.weight || null,
          duration: exercise.duration || null,
          restTime: exercise.restTime || null,
          notes: exercise.notes || null
        });
      });
    });
    
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      goal: formData.get('goal') as string,
      duration: formData.get('duration') as string, // Will be converted by schema (0 for "till-goal")
      weekCycle: weeksCycle,
      dailyCalories: parseInt(formData.get('dailyCalories') as string) || null,
      protein: parseInt(formData.get('protein') as string) || null,
      carbs: parseInt(formData.get('carbs') as string) || null,
      planExercises
    };

    createPlanMutation.mutate(data);
  };

  const handleWeeksCycleChange = (value: string) => {
    const weeks = parseInt(value);
    setWeeksCycle(weeks);
    
    // Initialize workout days for all weeks with exercise arrays
    const newWorkoutDays: Record<number, Record<number, Array<{
      exerciseId: string;
      sets?: number;
      reps?: number;
      weight?: number;
      duration?: number;
      restTime?: number;
      notes?: string;
    }>>> = {};
    
    for (let week = 1; week <= weeks; week++) {
      newWorkoutDays[week] = {};
      for (let day = 1; day <= 6; day++) {
        newWorkoutDays[week][day] = workoutDays[week]?.[day] || [];
      }
    }
    setWorkoutDays(newWorkoutDays);
  };

  const handleExerciseToggle = (week: number, day: number, exerciseId: string, isChecked: boolean) => {
    setWorkoutDays(prev => {
      const currentDay = prev[week]?.[day] || [];
      
      if (isChecked) {
        // Add exercise with default values
        return {
          ...prev,
          [week]: {
            ...prev[week],
            [day]: [...currentDay, { exerciseId, sets: 3, reps: 10 }]
          }
        };
      } else {
        // Remove exercise
        return {
          ...prev,
          [week]: {
            ...prev[week],
            [day]: currentDay.filter(ex => ex.exerciseId !== exerciseId)
          }
        };
      }
    });
  };

  const handleExerciseDetailChange = (week: number, day: number, exerciseId: string, field: string, value: string | number) => {
    setWorkoutDays(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [day]: prev[week]?.[day]?.map(ex => 
          ex.exerciseId === exerciseId 
            ? { ...ex, [field]: value }
            : ex
        ) || []
      }
    }));
  };

  const removeExerciseFromDay = (week: number, day: number, exerciseId: string) => {
    setWorkoutDays(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [day]: prev[week]?.[day]?.filter(ex => ex.exerciseId !== exerciseId) || []
      }
    }));
  };

  const getDayName = (dayNumber: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber - 1];
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setWeeksCycle(1);
    setWorkoutDays({});
  };

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only trainers can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Training Plans</h1>
        <Button onClick={() => {
          setShowCreateForm(true);
          // Initialize workout days for default 1 week
          if (Object.keys(workoutDays).length === 0) {
            handleWeeksCycleChange("1");
          }
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Training Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Weight Loss Program" required />
                </div>
                <div>
                  <Label htmlFor="duration">Plan Duration</Label>
                  <Select name="duration" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="till-goal">Till Goal is Met</SelectItem>
                      <SelectItem value="4">4 weeks</SelectItem>
                      <SelectItem value="6">6 weeks</SelectItem>
                      <SelectItem value="8">8 weeks</SelectItem>
                      <SelectItem value="12">12 weeks</SelectItem>
                      <SelectItem value="16">16 weeks</SelectItem>
                      <SelectItem value="24">24 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weeksCycle">Week Cycle Pattern</Label>
                  <Select value={weeksCycle.toString()} onValueChange={handleWeeksCycleChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pattern cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 week (repeat every week)</SelectItem>
                      <SelectItem value="2">2 weeks (repeat every 2 weeks)</SelectItem>
                      <SelectItem value="3">3 weeks (repeat every 3 weeks)</SelectItem>
                      <SelectItem value="4">4 weeks (repeat every 4 weeks)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Describe the plan goals and approach..." 
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="goal">Primary Goal</Label>
                <Input id="goal" name="goal" placeholder="e.g., Lose weight, build muscle" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dailyCalories">Daily Calories</Label>
                  <Input id="dailyCalories" name="dailyCalories" type="number" placeholder="2000" />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input id="protein" name="protein" type="number" placeholder="120" />
                </div>
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input id="carbs" name="carbs" type="number" placeholder="200" />
                </div>
              </div>

              {/* Weekly Workout Days Tabs */}
              {weeksCycle > 0 && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Weekly Workout Schedule</Label>
                  <Tabs defaultValue="1" className="w-full">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${weeksCycle}, 1fr)` }}>
                      {Array.from({ length: weeksCycle }, (_, i) => i + 1).map((week) => (
                        <TabsTrigger key={week} value={week.toString()}>
                          Week {week}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {Array.from({ length: weeksCycle }, (_, i) => i + 1).map((week) => (
                      <TabsContent key={week} value={week.toString()} className="space-y-4">
                        <h3 className="text-lg font-medium">Week {week} Workouts</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {Array.from({ length: 6 }, (_, i) => i + 1).map((day) => (
                            <div key={day} className="space-y-3">
                              <Label className="text-base font-medium">
                                {getDayName(day)}
                              </Label>
                              
                              {/* Available Exercises */}
                              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                                <Label className="text-sm text-gray-600">Available Exercises:</Label>
                                {Array.isArray(exercises) && exercises.length > 0 ? (
                                  exercises.map((exercise: any) => {
                                    const isSelected = workoutDays[week]?.[day]?.some(ex => ex.exerciseId === exercise.id);
                                    return (
                                      <div key={exercise.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`exercise-${week}-${day}-${exercise.id}`}
                                          checked={isSelected}
                                          onCheckedChange={(checked) => 
                                            handleExerciseToggle(week, day, exercise.id, checked as boolean)
                                          }
                                        />
                                        <Label 
                                          htmlFor={`exercise-${week}-${day}-${exercise.id}`}
                                          className="text-sm cursor-pointer flex-1"
                                        >
                                          {exercise.name}
                                        </Label>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-sm text-gray-500">No exercises available. Create exercises first.</p>
                                )}
                              </div>

                              {/* Selected Exercises Details */}
                              {workoutDays[week]?.[day] && workoutDays[week][day].length > 0 && (
                                <div className="space-y-3">
                                  <Label className="text-sm text-gray-600">Selected Exercises:</Label>
                                  {workoutDays[week][day].map((selectedExercise, index) => {
                                    const exercise = Array.isArray(exercises) ? exercises.find((ex: any) => ex.id === selectedExercise.exerciseId) : undefined;
                                    return (
                                      <div key={index} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium text-sm">{exercise?.name}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeExerciseFromDay(week, day, selectedExercise.exerciseId)}
                                            className="h-6 w-6 p-0"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Sets</Label>
                                            <Input
                                              type="number"
                                              value={selectedExercise.sets || ''}
                                              onChange={(e) => handleExerciseDetailChange(week, day, selectedExercise.exerciseId, 'sets', parseInt(e.target.value) || 0)}
                                              className="h-7 text-xs"
                                              min="1"
                                              placeholder="3"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Reps</Label>
                                            <Input
                                              type="number"
                                              value={selectedExercise.reps || ''}
                                              onChange={(e) => handleExerciseDetailChange(week, day, selectedExercise.exerciseId, 'reps', parseInt(e.target.value) || 0)}
                                              className="h-7 text-xs"
                                              min="1"
                                              placeholder="10"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs">Weight (kg)</Label>
                                            <Input
                                              type="number"
                                              step="0.5"
                                              value={selectedExercise.weight || ''}
                                              onChange={(e) => handleExerciseDetailChange(week, day, selectedExercise.exerciseId, 'weight', parseFloat(e.target.value) || 0)}
                                              className="h-7 text-xs"
                                              min="0"
                                              placeholder="50"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Rest (sec)</Label>
                                            <Input
                                              type="number"
                                              value={selectedExercise.restTime || ''}
                                              onChange={(e) => handleExerciseDetailChange(week, day, selectedExercise.exerciseId, 'restTime', parseInt(e.target.value) || 0)}
                                              className="h-7 text-xs"
                                              min="0"
                                              placeholder="60"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <Label className="text-xs">Notes</Label>
                                          <Textarea
                                            value={selectedExercise.notes || ''}
                                            onChange={(e) => handleExerciseDetailChange(week, day, selectedExercise.exerciseId, 'notes', e.target.value)}
                                            className="h-16 text-xs"
                                            placeholder="Exercise-specific notes..."
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.isArray(plans) && plans.length > 0 ? (
          plans.map((plan: any) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {plan.duration === 0 ? 'Till goal is met' : `${plan.duration} weeks`}
                    </p>
                  </div>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">{plan.description || "No description"}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Goal:</span>
                    <div className="font-medium">{plan.goal || "Not specified"}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <div className="font-medium">
                      {plan.duration === 0 ? 'Till goal is met' : `${plan.duration} weeks`}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Week Cycle:</span>
                    <div className="font-medium">{plan.weekCycle || 1} week{(plan.weekCycle || 1) > 1 ? 's' : ''}</div>
                  </div>
                  {plan.dailyCalories && (
                    <div>
                      <span className="text-gray-500">Daily Calories:</span>
                      <div className="font-medium">{plan.dailyCalories} kcal</div>
                    </div>
                  )}
                  {plan.protein && (
                    <div>
                      <span className="text-gray-500">Protein:</span>
                      <div className="font-medium">{plan.protein}g</div>
                    </div>
                  )}
                  {plan.carbs && (
                    <div>
                      <span className="text-gray-500">Carbs:</span>
                      <div className="font-medium">{plan.carbs}g</div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t flex flex-wrap justify-center gap-2">
                  <Link href={`/training-plans/${plan.id}`}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>

                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No training plans yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first training plan to get started
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Plan
            </Button>
          </div>
        )}
      </div>

      {/* Plan Details Modal */}
      {showPlanDetails && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedPlan.name}</h2>
                <p className="text-gray-600">{selectedPlan.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPlanDetails(false);
                  setSelectedPlan(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Plan Details</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Duration:</span> <span className="font-medium">{selectedPlan.duration} weeks</span></div>
                  <div><span className="text-gray-500">Goal:</span> <span className="font-medium">{selectedPlan.goal || "Not specified"}</span></div>
                  <div><span className="text-gray-500">Status:</span> <Badge variant={selectedPlan.isActive ? "default" : "secondary"}>{selectedPlan.isActive ? "Active" : "Draft"}</Badge></div>
                </div>
              </div>

              {selectedPlan.dailyCalories && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Nutrition</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500">Daily Calories:</span> <span className="font-medium">{selectedPlan.dailyCalories} kcal</span></div>
                    {selectedPlan.protein && <div><span className="text-gray-500">Protein:</span> <span className="font-medium">{selectedPlan.protein}g</span></div>}
                    {selectedPlan.carbs && <div><span className="text-gray-500">Carbs:</span> <span className="font-medium">{selectedPlan.carbs}g</span></div>}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Created</h3>
                <div className="text-sm">
                  <div className="text-gray-500">
                    {selectedPlan.createdAt ? new Date(selectedPlan.createdAt).toLocaleDateString() : "Recently"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-yellow-800">Exercises</h3>
              <p className="text-yellow-700 text-sm">
                Exercise details and workout schedule will be displayed here once the full exercise viewing system is implemented.
                This plan currently stores exercises in the database and can be assigned to clients.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowPlanDetails(false); setSelectedPlan(null); }}>
                Close
              </Button>
              <Button>
                Edit Plan
              </Button>
            </div>
          </div>
        </div>
      )}


    </main>
  );
}
