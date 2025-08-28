import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, Weight, Ruler } from "lucide-react";
import { Link } from "wouter";

interface Evaluation {
  id: string;
  weekNumber: number;
  weight: number;
  bodyFatPercentage: number;
  waistMeasurement: number;
  chestMeasurement: number;
  bicepsMeasurement: number;
  abdomenMeasurement: number;
  hipsMeasurement: number;
  thighMeasurement: number;
  calfMeasurement: number;
  trainingAdherence: number;
  mealAdherence: number;
  selfEvaluation: number;
  createdAt: string;
}

export default function MonthlyEvaluationComparison() {
  const { user } = useAuth();
  const [selectedEvaluation1, setSelectedEvaluation1] = useState<string>("");
  const [selectedEvaluation2, setSelectedEvaluation2] = useState<string>("");

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["/api/evaluations"],
    enabled: !!user && user.role === 'client',
  });

  const evaluation1 = evaluations.find((e: Evaluation) => e.id === selectedEvaluation1);
  const evaluation2 = evaluations.find((e: Evaluation) => e.id === selectedEvaluation2);

  const calculatePercentageChange = (oldValue: number, newValue: number): number => {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  };

  const formatPercentageChange = (change: number): string => {
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (change: number, isPositiveGood: boolean = true) => {
    if (change === 0) return "text-gray-600";
    const isGood = isPositiveGood ? change > 0 : change < 0;
    return isGood ? "text-green-600" : "text-red-600";
  };

  const ComparisonRow = ({ 
    label, 
    value1, 
    value2, 
    unit = "", 
    isPositiveGood = true 
  }: { 
    label: string; 
    value1: number; 
    value2: number; 
    unit?: string; 
    isPositiveGood?: boolean; 
  }) => {
    const change = calculatePercentageChange(value1, value2);
    const absoluteChange = value2 - value1;
    
    return (
      <div className="flex items-center justify-between py-3 border-b last:border-b-0">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{value1}{unit}</span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-900 font-medium">{value2}{unit}</span>
          <div className="flex items-center gap-1 min-w-[80px] justify-end">
            {getChangeIcon(change)}
            <span className={`font-medium ${getChangeColor(change, isPositiveGood)}`}>
              {formatPercentageChange(change)}
            </span>
          </div>
          <span className={`text-sm ${getChangeColor(change, isPositiveGood)} min-w-[60px] text-right`}>
            ({absoluteChange > 0 ? '+' : ''}{absoluteChange.toFixed(1)}{unit})
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Monthly Evaluation Comparison
            </h1>
            <p className="text-gray-600 mt-2">Compare two monthly evaluations to track your progress</p>
          </div>
          <Link href="/monthly-evaluation">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Evaluations
            </Button>
          </Link>
        </div>
      </div>

      {/* Evaluation Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Evaluations to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Evaluation (Baseline)
              </label>
              <Select value={selectedEvaluation1} onValueChange={setSelectedEvaluation1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first evaluation" />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((evaluation: Evaluation) => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      Week {evaluation.weekNumber} - {new Date(evaluation.createdAt).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Evaluation (Compare To)
              </label>
              <Select value={selectedEvaluation2} onValueChange={setSelectedEvaluation2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second evaluation" />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((evaluation: Evaluation) => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      Week {evaluation.weekNumber} - {new Date(evaluation.createdAt).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {evaluations.length < 2 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                You need at least 2 monthly evaluations to use the comparison feature. 
                Complete more evaluations to start tracking your progress!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {evaluation1 && evaluation2 && (
        <div className="space-y-6">
          {/* Evaluation Headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline">Baseline</Badge>
                  Week {evaluation1.weekNumber}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {new Date(evaluation1.createdAt).toLocaleDateString()}
                </p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="default">Comparison</Badge>
                  Week {evaluation2.weekNumber}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {new Date(evaluation2.createdAt).toLocaleDateString()}
                </p>
              </CardHeader>
            </Card>
          </div>

          {/* Physical Stats Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Weight className="h-5 w-5" />
                Physical Stats Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <ComparisonRow
                  label="Weight"
                  value1={evaluation1.weight}
                  value2={evaluation2.weight}
                  unit=" kg"
                  isPositiveGood={false}
                />
                <ComparisonRow
                  label="Body Fat Percentage"
                  value1={evaluation1.bodyFatPercentage}
                  value2={evaluation2.bodyFatPercentage}
                  unit="%"
                  isPositiveGood={false}
                />
              </div>
            </CardContent>
          </Card>

          {/* Body Measurements Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Body Measurements Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <ComparisonRow
                  label="Waist"
                  value1={evaluation1.waistMeasurement}
                  value2={evaluation2.waistMeasurement}
                  unit=" cm"
                  isPositiveGood={false}
                />
                <ComparisonRow
                  label="Chest"
                  value1={evaluation1.chestMeasurement}
                  value2={evaluation2.chestMeasurement}
                  unit=" cm"
                  isPositiveGood={true}
                />
                <ComparisonRow
                  label="Biceps"
                  value1={evaluation1.bicepsMeasurement}
                  value2={evaluation2.bicepsMeasurement}
                  unit=" cm"
                  isPositiveGood={true}
                />
                <ComparisonRow
                  label="Abdomen"
                  value1={evaluation1.abdomenMeasurement}
                  value2={evaluation2.abdomenMeasurement}
                  unit=" cm"
                  isPositiveGood={false}
                />
                <ComparisonRow
                  label="Hips"
                  value1={evaluation1.hipsMeasurement}
                  value2={evaluation2.hipsMeasurement}
                  unit=" cm"
                  isPositiveGood={false}
                />
                <ComparisonRow
                  label="Thigh"
                  value1={evaluation1.thighMeasurement}
                  value2={evaluation2.thighMeasurement}
                  unit=" cm"
                  isPositiveGood={true}
                />
                <ComparisonRow
                  label="Calf"
                  value1={evaluation1.calfMeasurement}
                  value2={evaluation2.calfMeasurement}
                  unit=" cm"
                  isPositiveGood={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Self-Assessment Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Self-Assessment Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <ComparisonRow
                  label="Training Adherence"
                  value1={evaluation1.trainingAdherence}
                  value2={evaluation2.trainingAdherence}
                  unit="/10"
                  isPositiveGood={true}
                />
                <ComparisonRow
                  label="Meal Adherence"
                  value1={evaluation1.mealAdherence}
                  value2={evaluation2.mealAdherence}
                  unit="/10"
                  isPositiveGood={true}
                />
                <ComparisonRow
                  label="Overall Self-Evaluation"
                  value1={evaluation1.selfEvaluation}
                  value2={evaluation2.selfEvaluation}
                  unit="/10"
                  isPositiveGood={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Selection State */}
      {(!evaluation1 || !evaluation2) && evaluations.length >= 2 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Two Evaluations</h3>
            <p className="text-gray-600">
              Choose two monthly evaluations from the dropdowns above to see a detailed comparison 
              with percentage changes and progress indicators.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}