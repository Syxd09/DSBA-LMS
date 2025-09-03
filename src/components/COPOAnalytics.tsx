import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Download, Users, Target, Award } from 'lucide-react';
import { getTests, getSubmissions, getCOPOMapping } from '@/services/examService';
import { Test, TestSubmission } from '@/types/exam';
import { useAuth } from '@/contexts/AuthContext';

interface COPerformance {
  co: string;
  coName: string;
  totalQuestions: number;
  totalMarks: number;
  averageScore: number;
  percentage: number;
  attainmentLevel: string;
}

interface POPerformance {
  po: string;
  poName: string;
  totalQuestions: number;
  totalMarks: number;
  averageScore: number;
  percentage: number;
  attainmentLevel: string;
}

const COPOAnalytics = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<TestSubmission[]>([]);
  const [coPerformance, setCOPerformance] = useState<COPerformance[]>([]);
  const [poPerformance, setPOPerformance] = useState<POPerformance[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('all');

  useEffect(() => {
    loadAnalyticsData();
  }, [user, selectedTest]);

  const loadAnalyticsData = () => {
    const allTests = getTests().filter(test => test.createdBy === user?.id);
    const allSubmissions = getSubmissions();
    
    setTests(allTests);
    setSubmissions(allSubmissions);
    
    // Calculate CO/PO performance
    calculateCOPerformance(allTests, allSubmissions);
    calculatePOPerformance(allTests, allSubmissions);
  };

  const calculateCOPerformance = (tests: Test[], submissions: TestSubmission[]) => {
    const copoMapping = getCOPOMapping();
    const coData: Record<string, { totalMarks: number; totalScored: number; questionCount: number }> = {};

    // Filter tests if specific test is selected
    const filteredTests = selectedTest === 'all' ? tests : tests.filter(t => t.id === selectedTest);

    filteredTests.forEach(test => {
      const testSubmissions = submissions.filter(sub => sub.testId === test.id);
      
      test.questions.forEach(question => {
        if (!question.co) return;
        
        if (!coData[question.co]) {
          coData[question.co] = { totalMarks: 0, totalScored: 0, questionCount: 0 };
        }
        
        coData[question.co].questionCount++;
        
        testSubmissions.forEach(submission => {
          const questionResult = submission.evaluatedAnswers[question.id];
          if (questionResult) {
            coData[question.co].totalMarks += question.marks;
            coData[question.co].totalScored += questionResult.marksAwarded;
          }
        });
      });
    });

    const coPerformanceData: COPerformance[] = Object.keys(coData).map(coKey => {
      const data = coData[coKey];
      const percentage = data.totalMarks > 0 ? (data.totalScored / data.totalMarks) * 100 : 0;
      const coIndex = parseInt(coKey.replace('CO', '')) - 1;
      const coName = copoMapping.courseOutcomes[coIndex] || coKey;
      
      let attainmentLevel = 'Not Attained';
      if (percentage >= 80) attainmentLevel = 'Highly Attained';
      else if (percentage >= 60) attainmentLevel = 'Attained';
      else if (percentage >= 40) attainmentLevel = 'Partially Attained';

      return {
        co: coKey,
        coName,
        totalQuestions: data.questionCount,
        totalMarks: data.totalMarks,
        averageScore: data.totalScored,
        percentage: Math.round(percentage * 100) / 100,
        attainmentLevel
      };
    }).sort((a, b) => a.co.localeCompare(b.co));

    setCOPerformance(coPerformanceData);
  };

  const calculatePOPerformance = (tests: Test[], submissions: TestSubmission[]) => {
    const copoMapping = getCOPOMapping();
    const poData: Record<string, { totalMarks: number; totalScored: number; questionCount: number }> = {};

    // Filter tests if specific test is selected
    const filteredTests = selectedTest === 'all' ? tests : tests.filter(t => t.id === selectedTest);

    filteredTests.forEach(test => {
      const testSubmissions = submissions.filter(sub => sub.testId === test.id);
      
      test.questions.forEach(question => {
        if (!question.po) return;
        
        if (!poData[question.po]) {
          poData[question.po] = { totalMarks: 0, totalScored: 0, questionCount: 0 };
        }
        
        poData[question.po].questionCount++;
        
        testSubmissions.forEach(submission => {
          const questionResult = submission.evaluatedAnswers[question.id];
          if (questionResult) {
            poData[question.po].totalMarks += question.marks;
            poData[question.po].totalScored += questionResult.marksAwarded;
          }
        });
      });
    });

    const poPerformanceData: POPerformance[] = Object.keys(poData).map(poKey => {
      const data = poData[poKey];
      const percentage = data.totalMarks > 0 ? (data.totalScored / data.totalMarks) * 100 : 0;
      const poIndex = parseInt(poKey.replace('PO', '')) - 1;
      const poName = copoMapping.programOutcomes[poIndex] || poKey;
      
      let attainmentLevel = 'Not Attained';
      if (percentage >= 80) attainmentLevel = 'Highly Attained';
      else if (percentage >= 60) attainmentLevel = 'Attained';
      else if (percentage >= 40) attainmentLevel = 'Partially Attained';

      return {
        po: poKey,
        poName,
        totalQuestions: data.questionCount,
        totalMarks: data.totalMarks,
        averageScore: data.totalScored,
        percentage: Math.round(percentage * 100) / 100,
        attainmentLevel
      };
    }).sort((a, b) => a.po.localeCompare(b.po));

    setPOPerformance(poPerformanceData);
  };

  const getAttainmentColor = (level: string) => {
    switch (level) {
      case 'Highly Attained': return 'bg-green-500';
      case 'Attained': return 'bg-blue-500';
      case 'Partially Attained': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getAttainmentBadgeVariant = (level: string) => {
    switch (level) {
      case 'Highly Attained': return 'default';
      case 'Attained': return 'secondary';
      case 'Partially Attained': return 'outline';
      default: return 'destructive';
    }
  };

  const exportAnalytics = () => {
    const data = {
      coPerformance,
      poPerformance,
      exportDate: new Date().toISOString(),
      testFilter: selectedTest === 'all' ? 'All Tests' : tests.find(t => t.id === selectedTest)?.title
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copo-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            CO/PO Analytics
          </h2>
          <p className="text-muted-foreground">Course and Program Outcome attainment analysis</p>
        </div>
        
        <div className="flex gap-3">
          <select 
            className="px-3 py-2 border rounded-md bg-background"
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
          >
            <option value="all">All Tests</option>
            {tests.map(test => (
              <option key={test.id} value={test.id}>{test.title}</option>
            ))}
          </select>
          
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold text-primary">{tests.length}</p>
              </div>
              <Target className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold text-primary">{submissions.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg CO Attainment</p>
                <p className="text-2xl font-bold text-primary">
                  {coPerformance.length > 0 
                    ? Math.round(coPerformance.reduce((acc, co) => acc + co.percentage, 0) / coPerformance.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg PO Attainment</p>
                <p className="text-2xl font-bold text-primary">
                  {poPerformance.length > 0 
                    ? Math.round(poPerformance.reduce((acc, po) => acc + po.percentage, 0) / poPerformance.length)
                    : 0}%
                </p>
              </div>
              <Award className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CO/PO Analysis Tabs */}
      <Tabs defaultValue="co" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="co">Course Outcomes</TabsTrigger>
          <TabsTrigger value="po">Program Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="co" className="space-y-4">
          <Card className="dsba-card">
            <CardHeader>
              <CardTitle>Course Outcome Attainment</CardTitle>
              <CardDescription>Performance analysis for each Course Outcome</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coPerformance.map((co) => (
                  <div key={co.co} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{co.co}: {co.coName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {co.totalQuestions} questions • {co.averageScore.toFixed(1)}/{co.totalMarks} marks
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getAttainmentBadgeVariant(co.attainmentLevel)}>
                          {co.attainmentLevel}
                        </Badge>
                        <span className="font-bold text-lg min-w-[60px] text-right">
                          {co.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={co.percentage} 
                      className="h-3"
                    />
                  </div>
                ))}
                
                {coPerformance.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No CO data available. Create tests with CO mapping to see analytics.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="po" className="space-y-4">
          <Card className="dsba-card">
            <CardHeader>
              <CardTitle>Program Outcome Attainment</CardTitle>
              <CardDescription>Performance analysis for each Program Outcome</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {poPerformance.map((po) => (
                  <div key={po.po} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{po.po}: {po.poName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {po.totalQuestions} questions • {po.averageScore.toFixed(1)}/{po.totalMarks} marks
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getAttainmentBadgeVariant(po.attainmentLevel)}>
                          {po.attainmentLevel}
                        </Badge>
                        <span className="font-bold text-lg min-w-[60px] text-right">
                          {po.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={po.percentage} 
                      className="h-3"
                    />
                  </div>
                ))}
                
                {poPerformance.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No PO data available. Create tests with PO mapping to see analytics.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default COPOAnalytics;