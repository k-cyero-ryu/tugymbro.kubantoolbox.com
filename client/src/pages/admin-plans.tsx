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
  Clock,
  Target
} from "lucide-react";

export default function AdminPlans() {
  const [search, setSearch] = useState("");
  const [trainerFilter, setTrainerFilter] = useState("all");

  // Fetch all training plans with filters
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['/api/admin/training-plans', { search, trainer: trainerFilter }],
    queryFn: ({ queryKey }) => {
      const [url, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.trainer && params.trainer !== 'all') searchParams.append('trainer', params.trainer);
      
      const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;
      return fetch(fullUrl, { credentials: 'include' }).then(res => res.json());
    },
  });

  // Fetch trainers for filter
  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/admin/approved-trainers'],
  });

  const getTrainerDisplayName = (plan: any) => {
    if (plan?.trainerFirstName || plan?.trainerLastName) {
      return `${plan.trainerFirstName || ''} ${plan.trainerLastName || ''}`.trim();
    }
    return plan?.trainerEmail || 'Unknown Trainer';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const PlanCard = ({ plan }: { plan: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
              <User className="h-4 w-4" />
              <span>Created by {getTrainerDisplayName(plan)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={getDifficultyColor(plan.difficulty)}>
              {plan.difficulty || 'Not specified'}
            </Badge>
            {plan.category && (
              <Badge variant="outline">
                {plan.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Duration:</span>
            <span>{plan.duration || 'Not specified'}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Created:</span>
            <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Updated:</span>
            <span>{new Date(plan.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Training Plans</h1>
          <p className="text-muted-foreground">
            View and filter all training plans in the system
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Dumbbell className="h-4 w-4" />
          <span>{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search plans..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
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
          {(search || (trainerFilter && trainerFilter !== 'all')) && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setTrainerFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No training plans found</h3>
            <p className="text-muted-foreground">
              {search || (trainerFilter && trainerFilter !== 'all')
                ? "Try adjusting your filters to see more results."
                : "There are no training plans in the system yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan: any) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}