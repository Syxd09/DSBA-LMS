import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut, Plus, Play, Pause, Users, BarChart3, Shield, FileText, Settings, Clock } from 'lucide-react';
import DSBAHeader from './DSBAHeader';
import CreateTestDialog from './CreateTestDialog';
import { getTests, getSubmissionsByTest, toggleTestStatus } from '@/services/examService';
import { Test, TestSubmission } from '@/types/exam';
import { toast } from 'sonner';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<TestSubmission[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('tests');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTests(getTests());
    // Load all submissions for analytics
    const allSubmissions: TestSubmission[] = [];
    getTests().forEach(test => {
      allSubmissions.push(...getSubmissionsByTest(test.id));
    });
    setSubmissions(allSubmissions);
  };

  const handleToggleTestStatus = (testId: string) => {
    toggleTestStatus(testId);
    loadData();
  };

  const getUserTests = () => {
    return tests.filter(test => test.createdBy === user?.id);
  };

  const getTestSubmissions = (testId: string) => {
    return submissions.filter(sub => sub.testId === testId);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <DSBAHeader />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={logout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="dsba-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                  <p className="text-3xl font-bold text-primary">{getUserTests().length}</p>
                </div>
                <FileText className="w-8 h-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="dsba-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Tests</p>
                  <p className="text-3xl font-bold text-success">{getUserTests().filter(t => t.isActive).length}</p>
                </div>
                <Play className="w-8 h-8 text-success opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="dsba-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                  <p className="text-3xl font-bold text-warning">{submissions.length}</p>
                </div>
                <Users className="w-8 h-8 text-warning opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="dsba-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                  <p className="text-3xl font-bold text-primary">
                    {submissions.length > 0 
                      ? Math.round(submissions.reduce((acc, sub) => acc + (sub.score / sub.totalMarks * 100), 0) / submissions.length)
                      : 0}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="anticheat">Anti-Cheat</TabsTrigger>
          </TabsList>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">My Tests</h2>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-dsba-gradient hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Test
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {getUserTests().map((test) => {
                const testSubmissions = getTestSubmissions(test.id);
                return (
                  <Card key={test.id} className="dsba-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <Badge variant={test.isActive ? "default" : "secondary"}>
                            {test.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleTestStatus(test.id)}
                        >
                          {test.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </div>
                      <CardDescription>{test.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Duration: {formatDuration(test.duration)}
                          </span>
                          <span>Marks: {test.totalMarks}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Questions: {test.questions.length}</span>
                          <span>Submissions: {testSubmissions.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Subject: {test.subject}</span>
                          <span>Created: {test.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            <h2 className="text-2xl font-semibold">Test Submissions</h2>
            <div className="space-y-4">
              {getUserTests().map((test) => {
                const testSubmissions = getTestSubmissions(test.id);
                if (testSubmissions.length === 0) return null;
                
                return (
                  <Card key={test.id} className="dsba-card">
                    <CardHeader>
                      <CardTitle className="text-lg">{test.title}</CardTitle>
                      <CardDescription>{testSubmissions.length} submissions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {testSubmissions.map((submission) => (
                          <div key={submission.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{submission.studentName}</p>
                              <p className="text-sm text-muted-foreground">
                                Submitted: {submission.submittedAt.toLocaleDateString()} at {submission.submittedAt.toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                {submission.score}/{submission.totalMarks}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {Math.round((submission.score / submission.totalMarks) * 100)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-semibold">Analytics & Reports</h2>
            <Card className="dsba-card">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Detailed analytics coming soon with CO/PO mapping</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <BarChart3 className="w-16 h-16" />
                  <span className="ml-4 text-lg">Analytics Dashboard - Under Development</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anti-Cheat Tab */}
          <TabsContent value="anticheat" className="space-y-6">
            <h2 className="text-2xl font-semibold">Anti-Cheat Monitoring</h2>
            <Card className="dsba-card">
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Monitor suspicious activities during exams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <Shield className="w-16 h-16" />
                  <span className="ml-4 text-lg">Anti-Cheat Dashboard - Under Development</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Test Dialog */}
        <CreateTestDialog 
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onTestCreated={loadData}
        />
      </div>
    </div>
  );
};

export default TeacherDashboard;