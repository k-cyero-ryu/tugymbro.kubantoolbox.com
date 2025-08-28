import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, DollarSign, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const paymentPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['monthly', 'quarterly', 'annual']),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("USD"),
  features: z.string().optional(),
  isActive: z.boolean().default(true),
});

type PaymentPlanForm = z.infer<typeof paymentPlanSchema>;

export default function PaymentPlans() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const { data: paymentPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["/api/payment-plans"],
    enabled: !!user && user.role === 'superadmin',
  });

  const form = useForm<PaymentPlanForm>({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: {
      name: '',
      type: 'monthly',
      amount: '',
      currency: 'USD',
      features: '',
      isActive: true,
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PaymentPlanForm) => {
      const planData = {
        ...data,
        amount: data.amount, // Keep as string, let backend handle conversion
        features: data.features ? data.features.split('\n').filter(f => f.trim()) : [],
      };
      return await apiRequest('POST', '/api/payment-plans', planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      setShowCreateDialog(false);
      setEditingPlan(null);
      form.reset();
      toast({
        title: "Success",
        description: "Payment plan created successfully",
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

  const updatePlanMutation = useMutation({
    mutationFn: async (data: PaymentPlanForm) => {
      const planData = {
        ...data,
        amount: data.amount, // Keep as string, let backend handle conversion
        features: data.features ? data.features.split('\n').filter(f => f.trim()) : [],
      };
      return await apiRequest('PUT', `/api/payment-plans/${editingPlan.id}`, planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      setShowCreateDialog(false);
      setEditingPlan(null);
      form.reset();
      toast({
        title: "Success",
        description: "Payment plan updated successfully",
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

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest('DELETE', `/api/payment-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      toast({
        title: "Success",
        description: "Payment plan deleted successfully",
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

  const onSubmit = (data: PaymentPlanForm) => {
    if (editingPlan) {
      updatePlanMutation.mutate(data);
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      type: plan.type,
      amount: String(plan.amount),
      currency: plan.currency || 'USD',
      features: plan.features ? plan.features.join('\n') : '',
      isActive: plan.isActive,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (planId: string) => {
    if (confirm('Are you sure you want to delete this payment plan?')) {
      deletePlanMutation.mutate(planId);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'monthly': return 'bg-blue-100 text-blue-800';
      case 'quarterly': return 'bg-green-100 text-green-800';
      case 'annual': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is only available to super administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Plans</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage global payment plan configurations for client subscriptions
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPlan(null); form.reset(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? 'Edit Payment Plan' : 'Create Payment Plan'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Basic Monthly" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Period</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select billing period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <FormControl>
                            <Input placeholder="USD" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features (one per line)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Personal trainer access&#10;Custom workout plans&#10;Progress tracking"
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Plan</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            This plan will be available for client selection
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => { setShowCreateDialog(false); setEditingPlan(null); }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                    >
                      {editingPlan ? 'Update Plan' : 'Create Plan'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payment Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentPlans.map((plan: any) => (
            <Card key={plan.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge className={getTypeColor(plan.type)}>
                    {plan.type}
                  </Badge>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold flex items-center">
                    <DollarSign className="h-6 w-6" />
                    {plan.amount}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {plan.currency}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    per {plan.type.replace('ly', '')}
                  </p>
                </div>
                
                {plan.features && plan.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {paymentPlans.length === 0 && !plansLoading && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payment plans</h3>
            <p className="text-gray-500 mb-4">
              Create your first payment plan to define pricing for client subscriptions
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Plan
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}