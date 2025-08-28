import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  Search, 
  Filter,
  User,
  Calendar,
  Target,
  Settings
} from "lucide-react";

export default function AdminExercises() {
  const [search, setSearch] = useState("");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch all exercises with filters
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['/api/admin/exercises', { search, trainer: trainerFilter, category: categoryFilter }],
    queryFn: ({ queryKey }) => {
      const [url, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.trainer && params.trainer !== 'all') searchParams.append('trainer', params.trainer);
      if (params.category && params.category !== 'all') searchParams.append('category', params.category);
      
      const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;
      return fetch(fullUrl, { credentials: 'include' }).then(res => res.json());
    },
  });

  // Fetch trainers for filter
  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/admin/approved-trainers'],
  });

  const getTrainerDisplayName = (exercise: any) => {
    if (exercise?.trainerFirstName || exercise?.trainerLastName) {
      return `${exercise.trainerFirstName || ''} ${exercise.trainerLastName || ''}`.trim();
    }
    return exercise?.trainerEmail || 'Unknown Trainer';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get unique categories from exercises for filter
  const categories = Array.from(new Set(exercises.map((ex: any) => ex.category).filter(Boolean)));

  const ExerciseCard = ({ exercise }: { exercise: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{exercise.name}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
              <User className="h-4 w-4" />
              <span>Created by {getTrainerDisplayName(exercise)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={getDifficultyColor(exercise.difficulty)}>
              {exercise.difficulty || 'Not specified'}
            </Badge>
            {exercise.category && (
              <Badge variant="outline">
                {exercise.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {exercise.description && (
          <p className="text-sm text-muted-foreground">{exercise.description}</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
              <div className="flex items-start space-x-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium">Muscle Groups:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {exercise.muscleGroups.map((muscle: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {exercise.equipment && exercise.equipment.length > 0 && (
              <div className="flex items-start space-x-2 text-sm">
                <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium">Equipment:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {exercise.equipment.map((item: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Created:</span>
              <span>{new Date(exercise.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Updated:</span>
              <span>{new Date(exercise.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {exercise.instructions && (
          <div className="pt-2 border-t">
            <span className="font-medium text-sm">Instructions:</span>
            <p className="text-sm text-muted-foreground mt-1">{exercise.instructions}</p>
          </div>
        )}

        {exercise.mediaUrls && exercise.mediaUrls.length > 0 && (
          <div className="pt-2 border-t">
            <span className="font-medium text-sm">Media Files:</span>
            <p className="text-xs text-muted-foreground mt-1">
              {exercise.mediaUrls.length} file{exercise.mediaUrls.length !== 1 ? 's' : ''} attached
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Exercises</h1>
          <p className="text-muted-foreground">
            View and filter all exercises in the system
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Dumbbell className="h-4 w-4" />
          <span>{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trainer</label>
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All trainers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trainers</SelectItem>
                  {trainers.map((trainer: any) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.firstName || trainer.lastName 
                        ? `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim()
                        : trainer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(search || (categoryFilter && categoryFilter !== 'all') || (trainerFilter && trainerFilter !== 'all')) && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('all');
                  setTrainerFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No exercises found</h3>
            <p className="text-muted-foreground">
              {search || (categoryFilter && categoryFilter !== 'all') || (trainerFilter && trainerFilter !== 'all')
                ? "Try adjusting your filters to see more results."
                : "There are no exercises in the system yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exercises.map((exercise: any) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
      )}
    </div>
  );
}