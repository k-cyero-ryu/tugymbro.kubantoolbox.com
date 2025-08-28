import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Dumbbell, 
  Clock, 
  Target, 
  Calendar,
  Eye,
  Play
} from "lucide-react";

export default function ClientTrainingPlans() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const { data: assignedPlans = [], isLoading: plansLoading, error } = useQuery<any[]>({
    queryKey: ["/api/client/assigned-plans"],
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

  // Auto-redirect to active plan if there's exactly one active plan
  useEffect(() => {
    if (!plansLoading && assignedPlans && assignedPlans.length > 0) {
      const activePlans = assignedPlans.filter((plan: any) => plan.isActive);
      if (activePlans.length === 1) {
        // Redirect to the single active plan details
        setLocation(`/my-training-plan/${activePlans[0].planId}`);
        return;
      }
    }
  }, [assignedPlans, plansLoading, setLocation]);

  if (isLoading || plansLoading) {
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
          <h2 className="text-2xl font-bold mb-4">Error Loading Training Plans</h2>
          <p className="text-muted-foreground mb-4">
            {isUnauthorizedError(error) ? "You are not authorized to view training plans." : "Failed to load your training plans."}
          </p>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Training Plans</h1>
          <p className="text-muted-foreground">View your assigned training plans and track your progress</p>
        </div>
      </div>

      {/* Training Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {assignedPlans.length > 0 ? (
          assignedPlans.map((clientPlan: any) => (
            <Card key={clientPlan.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{clientPlan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {clientPlan.duration === 0 ? 'Till goal is met' : `${clientPlan.duration} weeks`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={clientPlan.isActive ? "default" : "secondary"}>
                      {clientPlan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">{clientPlan.description || "No description available"}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Goal:</span>
                    <div className="font-medium">{clientPlan.goal || "Not specified"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium">
                      {clientPlan.duration === 0 ? 'Till goal is met' : `${clientPlan.duration} weeks`}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Week Cycle:</span>
                    <div className="font-medium">{clientPlan.weekCycle || 1} week{(clientPlan.weekCycle || 1) > 1 ? 's' : ''}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sessions/Week:</span>
                    <div className="font-medium">{clientPlan.sessionsPerWeek || 'N/A'}</div>
                  </div>
                </div>

                {/* Plan Dates */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Started: {new Date(clientPlan.assignedDate).toLocaleDateString()}
                  </span>
                  {clientPlan.endDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ends: {new Date(clientPlan.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Nutrition Information */}
                {(clientPlan.dailyCalories || clientPlan.protein || clientPlan.carbs) && (
                  <div className="grid grid-cols-3 gap-4 text-xs pt-2 border-t">
                    {clientPlan.dailyCalories && (
                      <div>
                        <span className="text-muted-foreground">Calories:</span>
                        <div className="font-medium">{clientPlan.dailyCalories} kcal</div>
                      </div>
                    )}
                    {clientPlan.protein && (
                      <div>
                        <span className="text-muted-foreground">Protein:</span>
                        <div className="font-medium">{clientPlan.protein}g</div>
                      </div>
                    )}
                    {clientPlan.carbs && (
                      <div>
                        <span className="text-muted-foreground">Carbs:</span>
                        <div className="font-medium">{clientPlan.carbs}g</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t flex justify-center">
                  <Link href={`/my-training-plan/${clientPlan.planId}`}>
                    <Button size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details & Exercises
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Training Plans Yet</h3>
            <p className="text-muted-foreground mb-4">
              Your trainer hasn't assigned any training plans yet. Check back soon or contact your trainer.
            </p>
            <Link href="/">
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Help Section */}
      {assignedPlans.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Click "View Details & Exercises" to see your complete workout schedule</p>
              <p>• Each plan shows your weekly exercise pattern and nutrition guidelines</p>
              <p>• Contact your trainer if you have questions about any exercise</p>
              <p>• Track your progress and stay consistent for best results</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}