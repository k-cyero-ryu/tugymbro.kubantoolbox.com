import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { isUnauthorizedError } from "@/lib/authUtils";
import Chat from "@/components/chat";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Target, 
  Activity, 
  MessageCircle, 
  Edit, 
  ArrowLeft,
  Weight,
  Ruler,
  TrendingUp,
  Clock,
  X,
  Plus,
  Users,
  Heart,
  Apple
} from "lucide-react";

const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

const formatBillingCycle = (type: string) => {
  switch (type) {
    case "monthly":
      return "Monthly";
    case "weekly":
      return "Weekly";
    case "per_session":
      return "Per Session";
    default:
      return type;
  }
};

export default function ClientDetail() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/clients/:clientId");
  const clientId = params?.clientId;
  const [showChat, setShowChat] = useState(false);
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);

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

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId && !!user && user.role === 'trainer',
  });

  const { data: assignedPlans = [] } = useQuery({
    queryKey: ["/api/client-plans", clientId],
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

  // Load client payment plan details if client has one assigned
  const { data: clientPaymentPlan } = useQuery({
    queryKey: [`/api/client-payment-plans/${client?.clientPaymentPlanId}`],
    enabled: !!client?.clientPaymentPlanId && !!user && user.role === 'trainer',
  });

  // Load trainer's training plans for assignment
  const { data: availablePlans = [] } = useQuery({
    queryKey: ["/api/training-plans"],
    enabled: !!user && user.role === 'trainer' && showAssignPlanModal,
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/clients/${clientId}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({
        title: "Success",
        description: "Client suspended successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/clients/${clientId}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({
        title: "Success",
        description: "Client reactivated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: async ({ planId, startDate, endDate }: any) => {
      await apiRequest("POST", "/api/client-plans", {
        planId,
        clientId,
        startDate,
        endDate,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-plans", clientId] });
      toast({
        title: "Success",
        description: "Training plan assigned successfully",
      });
      setShowAssignPlanModal(false);
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
        description: "Failed to assign training plan",
        variant: "destructive",
      });
    },
  });

  if (isLoading || clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'trainer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is only available to trainers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground">The requested client could not be found.</p>
            <Link href="/clients">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'suspended': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getUserInitials = () => {
    const firstName = client.user?.firstName || client.firstName || '';
    const lastName = client.user?.lastName || client.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'CL';
  };

  const getUserDisplayName = () => {
    const firstName = client.user?.firstName || client.firstName || '';
    const lastName = client.user?.lastName || client.lastName || '';
    return `${firstName} ${lastName}`.trim() || client.user?.email || 'Unknown Client';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={client.user?.profileImageUrl} alt={getUserDisplayName()} />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{getUserDisplayName()}</h1>
              <p className="text-muted-foreground">{client.user?.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(client.user?.status || 'inactive')}>
            {client.user?.status || 'inactive'}
          </Badge>
          <Button 
            size="sm"
            onClick={() => setShowAssignPlanModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign Plan
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowChat(true)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Link href={`/clients/${clientId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.user?.email || client.email}</span>
              </div>
              
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
              
              {(client.age || client.dateOfBirth) && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {client.age ? `${client.age} years old` : 
                     client.dateOfBirth ? `Born ${new Date(client.dateOfBirth).toLocaleDateString()}` : ''}
                  </span>
                </div>
              )}
              
              {client.height && (
                <div className="flex items-center gap-3">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.height} cm</span>
                </div>
              )}
              
              {(client.currentWeight || client.weight) && (
                <div className="flex items-center gap-3">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Current: {client.currentWeight || client.weight} kg</span>
                </div>
              )}
              
              {client.targetWeight && (
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Target: {client.targetWeight} kg</span>
                </div>
              )}
              
              {client.activityLevel && (
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Activity: {client.activityLevel}</span>
                </div>
              )}
              
              {client.referralSource && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Referral: {client.referralSource}</span>
                </div>
              )}
              
              {(client.goals || client.bodyGoal) && (
                <div className="flex items-start gap-3">
                  <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Goals</p>
                    <p className="text-sm text-muted-foreground">{client.goals || client.bodyGoal}</p>
                  </div>
                </div>
              )}
              
              {client.medicalConditions && (
                <div className="flex items-start gap-3">
                  <Heart className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Medical Conditions</p>
                    <p className="text-sm text-muted-foreground">{client.medicalConditions}</p>
                  </div>
                </div>
              )}
              
              {client.dietaryRestrictions && (
                <div className="flex items-start gap-3">
                  <Apple className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Dietary Restrictions</p>
                    <p className="text-sm text-muted-foreground">{client.dietaryRestrictions}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Status</span>
                <Badge className={getPaymentStatusColor(client.paymentStatus || 'inactive')}>
                  {client.paymentStatus || 'inactive'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Plan</span>
                {clientPaymentPlan ? (
                  <div className="text-right">
                    <div className="text-sm font-medium">{clientPaymentPlan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(clientPaymentPlan.amount, clientPaymentPlan.currency)} ({formatBillingCycle(clientPaymentPlan.type)})
                    </div>
                  </div>
                ) : (
                  <span className="text-sm">None</span>
                )}
              </div>

            </CardContent>
          </Card>


        </div>

        {/* Right Column - Training Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Training Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Training Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedPlans.length > 0 ? (
                <div className="space-y-3">
                  {assignedPlans.map((clientPlan: any) => (
                    <div key={clientPlan.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/training-plans/${clientPlan.planId}`}>
                          <h3 className="font-medium hover:text-primary cursor-pointer">{clientPlan.plan?.name}</h3>
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{clientPlan.plan?.difficulty}</Badge>
                          {clientPlan.isActive && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{clientPlan.plan?.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {clientPlan.plan?.duration === 0 ? 'Till goal is met' : `${clientPlan.plan?.duration} weeks`}
                        </span>
                        <span>Cycle: {clientPlan.plan?.weekCycle || 1}w</span>
                        <span>{clientPlan.plan?.exercises?.length || 0} exercises</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(clientPlan.startDate).toLocaleDateString()} - {new Date(clientPlan.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No training plans assigned yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Evaluations
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/clients/${clientId}/evaluations`}>
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                  <Link href={`/clients/${clientId}/evaluations/compare`}>
                    <Button variant="secondary" size="sm">
                      Compare
                    </Button>
                  </Link>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evaluations.length > 0 ? (
                <div className="space-y-4">
                  {evaluations.slice(0, 3).map((evaluation: any) => (
                    <div key={evaluation.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">
                          Week {evaluation.weekNumber} - {new Date(evaluation.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short',
                            day: 'numeric'
                          })}
                        </h3>
                        <Badge variant="outline">Self Score: {evaluation.selfEvaluation}/10</Badge>
                      </div>
                      {evaluation.notes && (
                        <p className="text-sm text-muted-foreground">{evaluation.notes}</p>
                      )}
                      <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="font-medium">Training: </span>
                          <span>{evaluation.trainingAdherence}/10</span>
                        </div>
                        <div>
                          <span className="font-medium">Nutrition: </span>
                          <span>{evaluation.mealAdherence}/10</span>
                        </div>
                        <div>
                          <span className="font-medium">Weight: </span>
                          <span>{evaluation.weight} kg</span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-medium">Body Fat: </span>
                          <span>{evaluation.bodyFatPercentage}%</span>
                        </div>
                        <div>
                          <span className="font-medium">Waist: </span>
                          <span>{evaluation.waistMeasurement} cm</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <Link href={`/clients/${clientId}/evaluation/${evaluation.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            View Full Evaluation
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No evaluations recorded yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Client Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Client Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {client.user?.status === 'active' ? (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  onClick={() => suspendMutation.mutate()}
                  disabled={suspendMutation.isPending}
                >
                  {suspendMutation.isPending ? 'Suspending...' : 'Suspend Client'}
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                >
                  {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Client'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-4xl h-[600px] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat with {getUserDisplayName()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-[calc(600px-100px)]">
            <Chat targetUserId={client.userId} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Plan Modal */}
      <Dialog open={showAssignPlanModal} onOpenChange={setShowAssignPlanModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Training Plan</DialogTitle>
          </DialogHeader>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Client: <span className="font-medium">{getUserDisplayName()}</span>
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const planId = formData.get("planId") as string;
              const startDate = formData.get("startDate") as string;
              
              if (!planId) {
                toast({
                  title: "Error",
                  description: "Please select a training plan",
                  variant: "destructive",
                });
                return;
              }

              // Find the selected plan to calculate end date
              const selectedPlan = availablePlans.find((plan: any) => plan.id === planId);
              if (!selectedPlan) {
                toast({
                  title: "Error",
                  description: "Selected plan not found",
                  variant: "destructive",
                });
                return;
              }

              // Calculate end date based on plan duration
              const start = new Date(startDate);
              const end = new Date(start);
              end.setDate(start.getDate() + (selectedPlan.duration * 7));

              assignPlanMutation.mutate({
                planId,
                startDate,
                endDate: end.toISOString().split('T')[0],
              });
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="planId">Select Training Plan</Label>
                <Select name="planId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a training plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(availablePlans) && availablePlans.length > 0 ? (
                      availablePlans.map((plan: any) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({plan.duration} weeks)
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-plans" disabled>
                        No training plans available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  type="date"
                  name="startDate"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignPlanModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignPlanMutation.isPending}
              >
                {assignPlanMutation.isPending ? "Assigning..." : "Assign Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}