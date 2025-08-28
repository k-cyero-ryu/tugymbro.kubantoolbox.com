import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, TrendingUp, MessageCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            My Body Trainer Manager
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            The complete fitness management platform connecting trainers with clients through personalized training plans, progress tracking, and real-time communication.
          </p>
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="text-center">
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-gray-900 dark:text-white">Client Management</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Manage your clients, track their progress, and maintain strong relationships
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="text-center">
              <Dumbbell className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-gray-900 dark:text-white">Training Plans</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Create customized workout plans with detailed exercises and schedules
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="text-center">
              <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle className="text-gray-900 dark:text-white">Progress Tracking</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Monitor client progress with detailed analytics and monthly evaluations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="text-center">
              <MessageCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <CardTitle className="text-gray-900 dark:text-white">Real-time Chat</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Stay connected with clients through instant messaging and support
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-blue-600 border-0 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to Transform Your Fitness Business?
              </h2>
              <p className="text-blue-100 mb-6">
                Join thousands of trainers who trust My Body Trainer Manager to grow their business and deliver exceptional client experiences.
              </p>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
              >
                Start Your Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}