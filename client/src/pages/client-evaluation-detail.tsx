import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  ArrowLeft, 
  User, 
  Calendar,
  Weight,
  Ruler,
  Activity,
  Heart,
  Target,
  TrendingUp,
  FileText
} from "lucide-react";
import { useEffect } from "react";

export default function ClientEvaluationDetail() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/clients/:clientId/evaluation/:evaluationId");
  const clientId = params?.clientId;
  const evaluationId = params?.evaluationId;

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

  const { data: evaluation, isLoading: evaluationLoading } = useQuery({
    queryKey: ["/api/evaluations", evaluationId],
    queryFn: async () => {
      const response = await fetch(`/api/evaluations/${evaluationId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch evaluation');
      return response.json();
    },
    enabled: !!evaluationId && !!user && user.role === 'trainer',
  });

  if (isLoading || evaluationLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading evaluation details...</p>
        </div>
      </div>
    );
  }

  if (!client || !evaluation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Evaluation not found</p>
          <Link href={`/clients/${clientId}`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Client
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
              Back to {client.firstName} {client.lastName}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Week {evaluation.weekNumber} Evaluation
            </h1>
            <p className="text-muted-foreground">
              {formatDate(evaluation.createdAt)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Self Score: {evaluation.selfEvaluation}/10
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Physical Measurements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Physical Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Weight</span>
                  <span className="font-semibold">{evaluation.weight} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Body Fat</span>
                  <span className="font-semibold">{evaluation.bodyFatPercentage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Waist</span>
                  <span className="font-semibold">{evaluation.waistMeasurement} cm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Chest</span>
                  <span className="font-semibold">{evaluation.chestMeasurement} cm</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Hips</span>
                  <span className="font-semibold">{evaluation.hipsMeasurement} cm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Thigh</span>
                  <span className="font-semibold">{evaluation.thighMeasurement} cm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Calf</span>
                  <span className="font-semibold">{evaluation.calfMeasurement} cm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Biceps</span>
                  <span className="font-semibold">{evaluation.bicepsMeasurement} cm</span>
                </div>
              </div>
            </div>
            {evaluation.abdomenMeasurement && (
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Abdomen</span>
                  <span className="font-semibold">{evaluation.abdomenMeasurement} cm</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adherence Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Adherence & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Training Adherence</span>
                  <span className="font-semibold">{evaluation.trainingAdherence}/10</span>
                </div>
                <Progress value={(evaluation.trainingAdherence / 10) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Meal Adherence</span>
                  <span className="font-semibold">{evaluation.mealAdherence}/10</span>
                </div>
                <Progress value={(evaluation.mealAdherence / 10) * 100} className="h-2" />
              </div>
              
              {evaluation.cardioAdherence && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Cardio Adherence</span>
                    <span className="font-semibold">{evaluation.cardioAdherence}/10</span>
                  </div>
                  <Progress value={(evaluation.cardioAdherence / 10) * 100} className="h-2" />
                </div>
              )}
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Self Evaluation</span>
                  <span className="font-semibold">{evaluation.selfEvaluation}/10</span>
                </div>
                <Progress value={(evaluation.selfEvaluation / 10) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {evaluation.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Evaluation Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{evaluation.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Actions */}
      <div className="mt-8 flex justify-center gap-4">
        <Link href={`/clients/${clientId}/evaluations`}>
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View All Evaluations
          </Button>
        </Link>
        <Link href={`/clients/${clientId}/evaluations/compare`}>
          <Button variant="secondary">
            <Target className="h-4 w-4 mr-2" />
            Compare Evaluations
          </Button>
        </Link>
      </div>
    </div>
  );
}