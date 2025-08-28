import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Edit, Plus, DollarSign } from "lucide-react";

const clientPaymentPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  amount: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  currency: z.string().default("USD"),
  type: z.enum(["monthly", "weekly", "per_session"]),
  features: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
});

type ClientPaymentPlanForm = z.infer<typeof clientPaymentPlanSchema>;

interface ClientPaymentPlan {
  id: string;
  trainerId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  type: string;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function ClientPaymentPlanForm({ 
  plan, 
  onSuccess, 
  open, 
  onOpenChange 
}: { 
  plan?: ClientPaymentPlan; 
  onSuccess: () => void; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [featuresInput, setFeaturesInput] = useState(plan?.features?.join(", ") || "");

  const form = useForm<ClientPaymentPlanForm>({
    resolver: zodResolver(clientPaymentPlanSchema),
    defaultValues: {
      name: plan?.name || "",
      description: plan?.description || "",
      amount: plan?.amount || 0,
      currency: plan?.currency || "USD",
      type: plan?.type as any || "monthly",
      features: plan?.features || [],
      isActive: plan?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientPaymentPlanForm) => {
      const features = featuresInput.split(",").map(f => f.trim()).filter(f => f);
      return apiRequest("POST", "/api/client-payment-plans", { ...data, features });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-payment-plans"] });
      toast({ title: "Success", description: "Client payment plan created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create client payment plan", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClientPaymentPlanForm) => {
      const features = featuresInput.split(",").map(f => f.trim()).filter(f => f);
      return apiRequest("PUT", `/api/client-payment-plans/${plan!.id}`, { ...data, features });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-payment-plans"] });
      toast({ title: "Success", description: "Client payment plan updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update client payment plan", variant: "destructive" });
    },
  });

  const onSubmit = (data: ClientPaymentPlanForm) => {
    if (plan) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Client Payment Plan" : "Create Client Payment Plan"}</DialogTitle>
          <DialogDescription>
            {plan ? "Update the client payment plan details" : "Create a new payment plan for your clients"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Basic Training" {...field} />
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
                    <FormLabel>Billing Cycle</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="per_session">Per Session</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="99.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what's included in this plan..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Features (comma-separated)</label>
              <Input
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                placeholder="e.g., 3 sessions per week, nutrition plan, progress tracking"
              />
            </div>

            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormLabel className="text-sm">Active Plan</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientPaymentPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<ClientPaymentPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery<ClientPaymentPlan[]>({
    queryKey: ["/api/client-payment-plans"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest("DELETE", `/api/client-payment-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-payment-plans"] });
      toast({ title: "Success", description: "Client payment plan deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete client payment plan", variant: "destructive" });
    },
  });

  const handleEdit = (plan: ClientPaymentPlan) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedPlan(null);
  };

  const handleDelete = (planId: string) => {
    if (confirm("Are you sure you want to delete this payment plan? This will remove it from any assigned clients.")) {
      deleteMutation.mutate(planId);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatBillingCycle = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'Monthly';
      case 'weekly': return 'Weekly';
      case 'per_session': return 'Per Session';
      default: return cycle;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Client Payment Plans</h1>
          <p className="text-gray-600 mt-2">
            Create and manage payment plans for your clients
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Payment Plans Yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first client payment plan to start managing client billing
            </p>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold text-blue-600">
                        {formatCurrency(plan.amount, plan.currency)}
                      </span>
                      <Badge variant="secondary">
                        {formatBillingCycle(plan.type)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(plan)}
                      className="p-1 h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(plan.id)}
                      className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {plan.description && (
                  <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                )}
                
                {plan.features && plan.features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Features:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
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
      )}

      <ClientPaymentPlanForm
        plan={selectedPlan || undefined}
        onSuccess={handleFormSuccess}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}