import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  UserCheck, 
  UserX, 
  CreditCard,
  Edit,
  DollarSign,
  Calendar,
  Users
} from "lucide-react";
import type { User, Trainer, PaymentPlan } from "@shared/schema";

type TrainerWithUser = Trainer & {
  user: User;
  paymentPlan?: PaymentPlan;
  clientCount: number;
};

export default function ManageTrainers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerWithUser | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<string>("");

  // Fetch all trainers with details
  const { data: trainers = [], isLoading: trainersLoading } = useQuery<TrainerWithUser[]>({
    queryKey: ['/api/admin/trainers'],
  });

  // Fetch available payment plans
  const { data: paymentPlans = [] } = useQuery<PaymentPlan[]>({
    queryKey: ['/api/payment-plans'],
  });

  // Update trainer payment plan mutation
  const updatePaymentPlanMutation = useMutation({
    mutationFn: async ({ trainerId, paymentPlanId }: { trainerId: string; paymentPlanId: string | null }) => {
      return await apiRequest('PUT', `/api/admin/trainers/${trainerId}/payment-plan`, { paymentPlanId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainers'] });
      setIsPaymentDialogOpen(false);
      setSelectedTrainer(null);
      toast({
        title: "Payment Plan Updated",
        description: "Trainer payment plan has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve/reject trainer mutation
  const updateTrainerStatusMutation = useMutation({
    mutationFn: async ({ trainerId, status }: { trainerId: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/trainers/${trainerId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainers'] });
      toast({
        title: "Status Updated",
        description: "Trainer status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignPaymentPlan = (trainer: TrainerWithUser) => {
    setSelectedTrainer(trainer);
    setSelectedPaymentPlan(trainer.paymentPlanId || "none");
    setIsPaymentDialogOpen(true);
  };

  const handleSavePaymentPlan = () => {
    if (!selectedTrainer) return;
    
    const paymentPlanId = selectedPaymentPlan === 'none' ? null : selectedPaymentPlan;
    updatePaymentPlanMutation.mutate({
      trainerId: selectedTrainer.id,
      paymentPlanId,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { variant: "default" as const, label: "Approved" },
      pending: { variant: "secondary" as const, label: "Pending" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
      suspended: { variant: "outline" as const, label: "Suspended" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUserInitials = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email || 'Unknown User';
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You need SuperAdmin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (trainersLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Trainers</h1>
          <p className="text-gray-600">Manage trainer accounts and payment plans</p>
        </div>
        <div className="text-sm text-gray-500">
          Total Trainers: {trainers.length}
        </div>
      </div>

      <div className="grid gap-6">
        {trainers.map((trainer: TrainerWithUser) => (
          <Card key={trainer.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={trainer.user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-lg">
                      {getUserInitials(trainer.user)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {getUserDisplayName(trainer.user)}
                      </h3>
                      <p className="text-gray-600">{trainer.user.email}</p>
                      <p className="text-sm text-gray-500">Code: {trainer.referralCode}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{trainer.clientCount || 0} clients</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>${trainer.monthlyRevenue || '0'}/month</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{trainer.createdAt ? new Date(trainer.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    
                    {trainer.expertise && (
                      <div>
                        <span className="text-sm text-gray-500">Expertise: </span>
                        <span className="text-sm">{trainer.expertise}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-3">
                  {getStatusBadge(trainer.user.status)}
                  
                  <div className="text-right">
                    {trainer.paymentPlan ? (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-green-600">
                          {trainer.paymentPlan.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ${trainer.paymentPlan.amount}/{trainer.paymentPlan.type}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-orange-600 font-medium">
                        No Payment Plan
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignPaymentPlan(trainer)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      {trainer.paymentPlan ? 'Edit Plan' : 'Assign Plan'}
                    </Button>
                    
                    {trainer.user.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateTrainerStatusMutation.mutate({
                            trainerId: trainer.id,
                            status: 'approved'
                          })}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateTrainerStatusMutation.mutate({
                            trainerId: trainer.id,
                            status: 'rejected'
                          })}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {trainer.user.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTrainerStatusMutation.mutate({
                          trainerId: trainer.id,
                          status: 'suspended'
                        })}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Plan Assignment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTrainer?.paymentPlan ? 'Edit Payment Plan' : 'Assign Payment Plan'}
            </DialogTitle>
            <DialogDescription>
              {selectedTrainer ? 
                `Manage payment plan for ${getUserDisplayName(selectedTrainer.user)}` :
                'Select a payment plan for this trainer'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-plan">Payment Plan</Label>
              <Select value={selectedPaymentPlan} onValueChange={setSelectedPaymentPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a payment plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Payment Plan</SelectItem>
                  {paymentPlans.map((plan: PaymentPlan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{plan.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ${plan.amount}/{plan.type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPaymentPlan && selectedPaymentPlan !== 'none' && paymentPlans.find((p: PaymentPlan) => p.id === selectedPaymentPlan) && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Plan Details:</h4>
                {(() => {
                  const plan = paymentPlans.find((p: PaymentPlan) => p.id === selectedPaymentPlan);
                  return plan ? (
                    <div className="space-y-1 text-sm">
                      <div><strong>Name:</strong> {plan.name}</div>
                      <div><strong>Amount:</strong> ${plan.amount} {plan.currency}</div>
                      <div><strong>Billing:</strong> {plan.type}</div>
                      <div><strong>Status:</strong> {plan.isActive ? 'Active' : 'Inactive'}</div>
                      {plan.features && plan.features.length > 0 && (
                        <div>
                          <strong>Features:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {plan.features.map((feature: string, index: number) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePaymentPlan}
              disabled={updatePaymentPlanMutation.isPending}
            >
              {updatePaymentPlanMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}