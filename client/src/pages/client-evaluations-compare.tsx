import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Weight,
  Activity,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { useEffect } from "react";

export default function ClientEvaluationsCompare() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/clients/:clientId/evaluations/compare");
  const clientId = params?.clientId;
  const [evaluation1Id, setEvaluation1Id] = useState<string>("");
  const [evaluation2Id, setEvaluation2Id] = useState<string>("");

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

  const { data: evaluations = [] } = useQuery({
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

  const evaluation1 = evaluations.find((e: any) => e.id === evaluation1Id);
  const evaluation2 = evaluations.find((e: any) => e.id === evaluation2Id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateChange = (value1: number, value2: number) => {
    const change = value2 - value1;
    const percentChange = value1 ? ((change / value1) * 100) : 0;
    return { change, percentChange };
  };

  const getChangeIcon = (change: number, isPositiveGood: boolean = true) => {
    if (change === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if ((change > 0 && isPositiveGood) || (change < 0 && !isPositiveGood)) {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    }
    return <ArrowDownRight className="h-4 w-4 text-red-600" />;
  };

  const getChangeColor = (change: number, isPositiveGood: boolean = true) => {
    if (change === 0) return "text-muted-foreground";
    if ((change > 0 && isPositiveGood) || (change < 0 && !isPositiveGood)) {
      return "text-green-600";
    }
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading evaluations...</p>
        </div>
      </div>
    );
  }

  if (evaluations.length < 2) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/clients/${clientId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Client
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Compare Evaluations</h1>
            <p className="text-muted-foreground">Need at least 2 evaluations to compare</p>
          </div>
        </div>
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Not Enough Evaluations</h3>
            <p className="text-muted-foreground mb-4">
              This client needs at least 2 evaluations to enable comparison.
            </p>
            <Link href={`/clients/${clientId}/evaluations`}>
              <Button variant="outline">
                View All Evaluations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/clients/${clientId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Compare {client?.firstName} {client?.lastName}'s Evaluations
          </h1>
          <p className="text-muted-foreground">
            Select two evaluations to compare progress
          </p>
        </div>
      </div>

      {/* Evaluation Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Baseline Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={setEvaluation1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select first evaluation" />
              </SelectTrigger>
              <SelectContent>
                {evaluations.map((evaluation: any) => (
                  <SelectItem key={evaluation.id} value={evaluation.id}>
                    Week {evaluation.weekNumber} - {formatDate(evaluation.createdAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparison Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={setEvaluation2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select second evaluation" />
              </SelectTrigger>
              <SelectContent>
                {evaluations.map((evaluation: any) => (
                  <SelectItem key={evaluation.id} value={evaluation.id}>
                    Week {evaluation.weekNumber} - {formatDate(evaluation.createdAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {evaluation1 && evaluation2 && (
        <div className="space-y-6">
          {/* Physical Measurements Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Weight className="h-5 w-5" />
                Physical Measurements Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'weight', label: 'Weight', unit: 'kg', isPositiveGood: false },
                  { key: 'bodyFatPercentage', label: 'Body Fat', unit: '%', isPositiveGood: false },
                  { key: 'waistMeasurement', label: 'Waist', unit: 'cm', isPositiveGood: false },
                  { key: 'chestMeasurement', label: 'Chest', unit: 'cm', isPositiveGood: true },
                  { key: 'hipsMeasurement', label: 'Hips', unit: 'cm', isPositiveGood: false },
                  { key: 'thighMeasurement', label: 'Thigh', unit: 'cm', isPositiveGood: true },
                  { key: 'calfMeasurement', label: 'Calf', unit: 'cm', isPositiveGood: true },
                  { key: 'bicepsMeasurement', label: 'Biceps', unit: 'cm', isPositiveGood: true }
                ].map((metric) => {
                  const value1 = evaluation1[metric.key] || 0;
                  const value2 = evaluation2[metric.key] || 0;
                  const { change, percentChange } = calculateChange(value1, value2);
                  
                  if (!value1 && !value2) return null;
                  
                  return (
                    <div key={metric.key} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{metric.label}</span>
                        {getChangeIcon(change, metric.isPositiveGood)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Week {evaluation1.weekNumber}</span>
                          <span>{value1} {metric.unit}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Week {evaluation2.weekNumber}</span>
                          <span>{value2} {metric.unit}</span>
                        </div>
                        <div className={`text-sm font-semibold ${getChangeColor(change, metric.isPositiveGood)}`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)} {metric.unit}
                          {percentChange !== 0 && (
                            <span className="text-xs ml-1">
                              ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Adherence Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Adherence & Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { key: 'trainingAdherence', label: 'Training Adherence' },
                  { key: 'mealAdherence', label: 'Meal Adherence' },
                  { key: 'cardioAdherence', label: 'Cardio Adherence' },
                  { key: 'selfEvaluation', label: 'Self Evaluation' }
                ].map((metric) => {
                  const value1 = evaluation1[metric.key] || 0;
                  const value2 = evaluation2[metric.key] || 0;
                  const { change } = calculateChange(value1, value2);
                  
                  if (!value1 && !value2) return null;
                  
                  return (
                    <div key={metric.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{metric.label}</span>
                        {getChangeIcon(change, true)}
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Week {evaluation1.weekNumber}</span>
                            <span>{value1}/10</span>
                          </div>
                          <Progress value={(value1 / 10) * 100} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Week {evaluation2.weekNumber}</span>
                            <span>{value2}/10</span>
                          </div>
                          <Progress value={(value2 / 10) * 100} className="h-2" />
                        </div>
                        
                        <div className={`text-sm font-semibold text-center ${getChangeColor(change, true)}`}>
                          {change > 0 ? '+' : ''}{change} points
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Comparison Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium">Baseline (Week {evaluation1.weekNumber})</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(evaluation1.createdAt)}
                  </p>
                  <div className="text-sm space-y-1">
                    <div>Weight: {evaluation1.weight} kg</div>
                    <div>Training: {evaluation1.trainingAdherence}/10</div>
                    <div>Nutrition: {evaluation1.mealAdherence}/10</div>
                    <div>Self Score: {evaluation1.selfEvaluation}/10</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Latest (Week {evaluation2.weekNumber})</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(evaluation2.createdAt)}
                  </p>
                  <div className="text-sm space-y-1">
                    <div>Weight: {evaluation2.weight} kg</div>
                    <div>Training: {evaluation2.trainingAdherence}/10</div>
                    <div>Nutrition: {evaluation2.mealAdherence}/10</div>
                    <div>Self Score: {evaluation2.selfEvaluation}/10</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}