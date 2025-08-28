import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Weight, Ruler, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function MonthlyEvaluation() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [currentEvaluationIndex, setCurrentEvaluationIndex] = useState(0);
  const [frontPhotoUrl, setFrontPhotoUrl] = useState<string>("");
  const [backPhotoUrl, setBackPhotoUrl] = useState<string>("");
  const [sidePhotoUrl, setSidePhotoUrl] = useState<string>("");

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

  const { data: evaluations = [] } = useQuery<any[]>({
    queryKey: ["/api/evaluations"],
    enabled: !!user && user.role === 'client',
  });

  // Navigation functions
  const navigateEvaluation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentEvaluationIndex < evaluations.length - 1) {
      setCurrentEvaluationIndex(currentEvaluationIndex + 1);
    } else if (direction === 'next' && currentEvaluationIndex > 0) {
      setCurrentEvaluationIndex(currentEvaluationIndex - 1);
    }
  };

  const goToLatest = () => {
    setCurrentEvaluationIndex(0);
  };

  // Photo upload helpers
  const handlePhotoUpload = async () => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload');
      const data = await response.json() as { uploadURL: string };
      console.log('Upload response:', data);
      
      if (!data.uploadURL) {
        throw new Error('No upload URL received');
      }
      
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error('Error getting upload URL:', error);
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handlePhotoComplete = async (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>,
    setPhotoUrl: (url: string) => void
  ) => {
    console.log('Upload result:', result);
    
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      console.log('Upload URL from result:', uploadURL);
      
      if (uploadURL) {
        try {
          // Set ACL policy for the uploaded photo and get normalized path
          const response = await apiRequest('PUT', '/api/evaluation-photos', {
            photoURL: uploadURL,
          });
          const data = await response.json() as { objectPath: string };
          
          const normalizedPath = data.objectPath || uploadURL;
          setPhotoUrl(normalizedPath);
          
          toast({
            title: "Success",
            description: "Photo uploaded successfully",
          });
        } catch (error) {
          console.error('Error setting photo ACL:', error);
          // Still set the URL even if ACL setting fails
          setPhotoUrl(uploadURL);
          toast({
            title: "Photo uploaded",
            description: "Photo uploaded but there was an issue with permissions",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Upload Warning",
          description: "Photo uploaded but no URL returned",
          variant: "destructive",
        });
      }
    } else if (result.failed && result.failed.length > 0) {
      console.error('Upload failed:', result.failed);
      toast({
        title: "Upload Failed",
        description: `Failed to upload: ${result.failed[0].error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Get current evaluation to display
  const currentEvaluation = evaluations[currentEvaluationIndex];
  const isLatest = currentEvaluationIndex === 0;
  const canGoPrev = currentEvaluationIndex < evaluations.length - 1;
  const canGoNext = currentEvaluationIndex > 0;

  const evaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/evaluations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Monthly evaluation submitted successfully",
      });
      setShowEvaluationForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
      frontPhotoUrl: frontPhotoUrl || null,
      backPhotoUrl: backPhotoUrl || null,
      sidePhotoUrl: sidePhotoUrl || null,
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

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monthly Evaluation</h1>
            <p className="text-gray-600 mt-2">Track your progress with monthly measurements and self-assessment</p>
          </div>
          <div className="flex gap-2">
            <Link href="/monthly-evaluation-comparison">
              <Button variant="default">Compare Evaluations</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation and Current Evaluation */}
      {evaluations.length > 0 && currentEvaluation && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Evaluations
                <Badge variant={isLatest ? "default" : "secondary"}>
                  {currentEvaluationIndex + 1} of {evaluations.length}
                </Badge>
              </CardTitle>
              
              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateEvaluation('prev')}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateEvaluation('next')}
                  disabled={!canGoNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {!isLatest && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={goToLatest}
                  >
                    Latest
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={isLatest ? "default" : "secondary"}>
                    Week {currentEvaluation.weekNumber}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {new Date(currentEvaluation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {isLatest && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Latest
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Physical Stats */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <Weight className="h-4 w-4" />
                    Physical Stats
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Weight:</span>
                      <span className="font-medium">{currentEvaluation.weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Body Fat:</span>
                      <span className="font-medium">{currentEvaluation.bodyFatPercentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Body Measurements */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <Ruler className="h-4 w-4" />
                    Measurements (cm)
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Waist:</span>
                      <span className="font-medium">{currentEvaluation.waistMeasurement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chest:</span>
                      <span className="font-medium">{currentEvaluation.chestMeasurement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hips:</span>
                      <span className="font-medium">{currentEvaluation.hipsMeasurement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thigh:</span>
                      <span className="font-medium">{currentEvaluation.thighMeasurement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biceps:</span>
                      <span className="font-medium">{currentEvaluation.bicepsMeasurement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Abdomen:</span>
                      <span className="font-medium">{currentEvaluation.abdomenMeasurement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Calf:</span>
                      <span className="font-medium">{currentEvaluation.calfMeasurement}</span>
                    </div>
                  </div>
                </div>

                {/* Self-Evaluation */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Self-Assessment</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Training:</span>
                      <span className="font-medium">{currentEvaluation.trainingAdherence}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nutrition:</span>
                      <span className="font-medium">{currentEvaluation.mealAdherence}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overall:</span>
                      <span className="font-medium">{currentEvaluation.selfEvaluation}/10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* T-Pose Photos Display */}
              {(currentEvaluation.frontPhotoUrl || currentEvaluation.backPhotoUrl || currentEvaluation.sidePhotoUrl) && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    T-Pose Photos
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentEvaluation.frontPhotoUrl && (
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 mb-2">Front View</p>
                        <img 
                          src={currentEvaluation.frontPhotoUrl} 
                          alt="Front view T-pose" 
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    {currentEvaluation.backPhotoUrl && (
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 mb-2">Back View</p>
                        <img 
                          src={currentEvaluation.backPhotoUrl} 
                          alt="Back view T-pose" 
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    {currentEvaluation.sidePhotoUrl && (
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 mb-2">Side View</p>
                        <img 
                          src={currentEvaluation.sidePhotoUrl} 
                          alt="Side view T-pose" 
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Evaluation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            New Monthly Evaluation
          </CardTitle>
          <p className="text-sm text-gray-500">Submit your monthly measurements and self-assessment</p>
        </CardHeader>
        <CardContent>
          {!showEvaluationForm ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Ready to submit your monthly evaluation?</p>
              <Button onClick={() => setShowEvaluationForm(true)} size="lg">
                Start New Evaluation
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEvaluationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Body Measurements */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Body Measurements (cm)</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="waist">Waist</Label>
                      <Input id="waist" name="waist" type="number" step="0.1" placeholder="80" required />
                    </div>
                    <div>
                      <Label htmlFor="chest">Chest</Label>
                      <Input id="chest" name="chest" type="number" step="0.1" placeholder="95" required />
                    </div>
                    <div>
                      <Label htmlFor="biceps">Biceps</Label>
                      <Input id="biceps" name="biceps" type="number" step="0.1" placeholder="32" required />
                    </div>
                    <div>
                      <Label htmlFor="abdomen">Abdomen</Label>
                      <Input id="abdomen" name="abdomen" type="number" step="0.1" placeholder="85" required />
                    </div>
                    <div>
                      <Label htmlFor="hips">Hips</Label>
                      <Input id="hips" name="hips" type="number" step="0.1" placeholder="100" required />
                    </div>
                    <div>
                      <Label htmlFor="thigh">Thigh</Label>
                      <Input id="thigh" name="thigh" type="number" step="0.1" placeholder="55" required />
                    </div>
                    <div>
                      <Label htmlFor="calf">Calf</Label>
                      <Input id="calf" name="calf" type="number" step="0.1" placeholder="38" required />
                    </div>
                  </div>
                </div>

                {/* Physical Stats */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Physical Stats</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input id="weight" name="weight" type="number" step="0.1" placeholder="68" required />
                    </div>
                    <div>
                      <Label htmlFor="bodyFat">Body Fat %</Label>
                      <Input id="bodyFat" name="bodyFat" type="number" step="0.1" placeholder="18" required />
                    </div>
                    <div>
                      <Label htmlFor="weekNumber">Week #</Label>
                      <Input id="weekNumber" name="weekNumber" type="number" placeholder="8" required />
                    </div>
                  </div>
                </div>

                {/* Self-Evaluation */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Self-Evaluation (1-10)</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="trainingAdherence">Training Adherence</Label>
                      <Select name="trainingAdherence" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(10)].map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1} - {i + 1 === 10 ? 'Perfect' : i + 1 >= 8 ? 'Excellent' : i + 1 >= 6 ? 'Good' : 'Needs Improvement'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="mealAdherence">Meal Plan Adherence</Label>
                      <Select name="mealAdherence" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(10)].map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1} - {i + 1 === 10 ? 'Perfect' : i + 1 >= 8 ? 'Excellent' : i + 1 >= 6 ? 'Good' : 'Needs Improvement'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="selfEvaluation">Overall Satisfaction</Label>
                      <Select name="selfEvaluation" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(10)].map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1} - {i + 1 === 10 ? 'Perfect' : i + 1 >= 8 ? 'Excellent' : i + 1 >= 6 ? 'Good' : 'Needs Improvement'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* T-Pose Photos Section */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  T-Pose Photos for Visual Intelligence
                </h4>
                <p className="text-sm text-gray-600 mb-6">
                  Upload three T-pose photos (front, back, and side view) for better progress tracking and visual analysis.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Front Photo */}
                  <div className="space-y-3">
                    <Label htmlFor="frontPhoto">Front View</Label>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handlePhotoUpload}
                      onComplete={(result) => handlePhotoComplete(result, setFrontPhotoUrl)}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Camera className="h-5 w-5" />
                        {frontPhotoUrl ? "Change Front Photo" : "Upload Front Photo"}
                      </div>
                    </ObjectUploader>
                    {frontPhotoUrl && (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        ✓ Front photo uploaded successfully
                      </div>
                    )}
                  </div>

                  {/* Back Photo */}
                  <div className="space-y-3">
                    <Label htmlFor="backPhoto">Back View</Label>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handlePhotoUpload}
                      onComplete={(result) => handlePhotoComplete(result, setBackPhotoUrl)}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Camera className="h-5 w-5" />
                        {backPhotoUrl ? "Change Back Photo" : "Upload Back Photo"}
                      </div>
                    </ObjectUploader>
                    {backPhotoUrl && (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        ✓ Back photo uploaded successfully
                      </div>
                    )}
                  </div>

                  {/* Side Photo */}
                  <div className="space-y-3">
                    <Label htmlFor="sidePhoto">Side View</Label>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handlePhotoUpload}
                      onComplete={(result) => handlePhotoComplete(result, setSidePhotoUrl)}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Camera className="h-5 w-5" />
                        {sidePhotoUrl ? "Change Side Photo" : "Upload Side Photo"}
                      </div>
                    </ObjectUploader>
                    {sidePhotoUrl && (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        ✓ Side photo uploaded successfully
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Photo Guidelines:</strong> Stand in a T-pose with arms extended horizontally. 
                    Wear fitted clothing for best results. These photos help with visual progress tracking and measurements.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEvaluationForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={evaluationMutation.isPending}
                >
                  {evaluationMutation.isPending ? "Submitting..." : "Submit Evaluation"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}