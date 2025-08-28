import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  ArrowLeft, 
  TrendingUp,
  Calendar,
  Weight,
  Activity,
  Target,
  Eye,
  BarChart3
} from "lucide-react";
import { useEffect } from "react";

export default function ClientEvaluationsList() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/clients/:clientId/evaluations");
  const clientId = params?.clientId;

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

  const { data: client } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId && !!user && user.role === 'trainer',
  });

  const { data: evaluations = [], isLoading: evaluationsLoading } = useQuery({
    queryKey: ["/api/evaluations", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/evaluations?clientId=${clientId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch evaluations');
      return response.json();
    },
    enabled: !!clientId && !!user && user.role === 'trainer',
  });

  if (isLoading || evaluationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading evaluations...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${clientId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Client
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {client?.firstName} {client?.lastName}'s Evaluations
            </h1>
            <p className="text-muted-foreground">
              {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>
        {evaluations.length > 1 && (
          <Link href={`/clients/${clientId}/evaluations/compare`}>
            <Button variant="secondary">
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare Evaluations
            </Button>
          </Link>
        )}
      </div>

      {evaluations.length > 0 ? (
        <div className="grid gap-6">
          {evaluations.map((evaluation: any) => (
            <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Week {evaluation.weekNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(evaluation.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    Self Score: {evaluation.selfEvaluation}/10
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Key Metrics */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Weight</span>
                    </div>
                    <p className="text-lg font-semibold">{evaluation.weight} kg</p>
                    <p className="text-xs text-muted-foreground">Body Fat: {evaluation.bodyFatPercentage}%</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Training</span>
                    </div>
                    <div className="space-y-1">
                      <Progress value={(evaluation.trainingAdherence / 10) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">{evaluation.trainingAdherence}/10</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Nutrition</span>
                    </div>
                    <div className="space-y-1">
                      <Progress value={(evaluation.mealAdherence / 10) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">{evaluation.mealAdherence}/10</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Measurements</span>
                    </div>
                    <p className="text-sm">Waist: {evaluation.waistMeasurement} cm</p>
                    <p className="text-xs text-muted-foreground">Chest: {evaluation.chestMeasurement} cm</p>
                  </div>
                </div>
                
                {evaluation.notes && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {evaluation.notes.length > 100 
                        ? `${evaluation.notes.substring(0, 100)}...` 
                        : evaluation.notes
                      }
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Link href={`/clients/${clientId}/evaluation/${evaluation.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Evaluations Yet</h3>
            <p className="text-muted-foreground">
              This client hasn't submitted any monthly evaluations yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}