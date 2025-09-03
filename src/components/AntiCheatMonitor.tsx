import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Copy, 
  MousePointer, 
  Monitor,
  Clock,
  User,
  RefreshCw,
  Download,
  TrendingUp
} from 'lucide-react';
import { getTests, getSubmissions } from '@/services/examService';
import { Test, TestSubmission, AntiCheatEvent } from '@/types/exam';
import { useAuth } from '@/contexts/AuthContext';

interface AntiCheatSummary {
  totalEvents: number;
  tabSwitches: number;
  copyPasteAttempts: number;
  rightClicks: number;
  fullscreenExits: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface StudentRiskProfile {
  studentId: string;
  studentName: string;
  totalViolations: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  events: AntiCheatEvent[];
  testId: string;
  testTitle: string;
}

const AntiCheatMonitor = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<TestSubmission[]>([]);
  const [antiCheatSummary, setAntiCheatSummary] = useState<AntiCheatSummary>({
    totalEvents: 0,
    tabSwitches: 0,
    copyPasteAttempts: 0,
    rightClicks: 0,
    fullscreenExits: 0,
    riskLevel: 'Low'
  });
  const [studentRiskProfiles, setStudentRiskProfiles] = useState<StudentRiskProfile[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('all');

  useEffect(() => {
    loadAntiCheatData();
  }, [user, selectedTest]);

  const loadAntiCheatData = () => {
    const userTests = getTests().filter(test => test.createdBy === user?.id);
    const allSubmissions = getSubmissions();
    
    // Filter submissions based on user's tests
    const userSubmissions = allSubmissions.filter(submission => 
      userTests.some(test => test.id === submission.testId)
    );

    setTests(userTests);
    setSubmissions(userSubmissions);
    
    calculateAntiCheatSummary(userSubmissions);
    generateStudentRiskProfiles(userSubmissions, userTests);
  };

  const calculateAntiCheatSummary = (submissions: TestSubmission[]) => {
    // Filter submissions by selected test if not 'all'
    const filteredSubmissions = selectedTest === 'all' 
      ? submissions 
      : submissions.filter(sub => sub.testId === selectedTest);

    let totalEvents = 0;
    let tabSwitches = 0;
    let copyPasteAttempts = 0;
    let rightClicks = 0;
    let fullscreenExits = 0;

    filteredSubmissions.forEach(submission => {
      submission.antiCheatEvents.forEach(event => {
        totalEvents++;
        switch (event.type) {
          case 'tab_switch':
            tabSwitches++;
            break;
          case 'copy_paste':
            copyPasteAttempts++;
            break;
          case 'right_click':
            rightClicks++;
            break;
          case 'fullscreen_exit':
            fullscreenExits++;
            break;
        }
      });
    });

    // Determine risk level based on total events
    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (totalEvents > 50) riskLevel = 'Critical';
    else if (totalEvents > 20) riskLevel = 'High';
    else if (totalEvents > 5) riskLevel = 'Medium';

    setAntiCheatSummary({
      totalEvents,
      tabSwitches,
      copyPasteAttempts,
      rightClicks,
      fullscreenExits,
      riskLevel
    });
  };

  const generateStudentRiskProfiles = (submissions: TestSubmission[], tests: Test[]) => {
    // Filter submissions by selected test if not 'all'
    const filteredSubmissions = selectedTest === 'all' 
      ? submissions 
      : submissions.filter(sub => sub.testId === selectedTest);

    const studentProfiles: StudentRiskProfile[] = filteredSubmissions
      .filter(submission => submission.antiCheatEvents.length > 0)
      .map(submission => {
        const test = tests.find(t => t.id === submission.testId);
        const totalViolations = submission.antiCheatEvents.length;
        
        let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
        if (totalViolations > 10) riskLevel = 'Critical';
        else if (totalViolations > 5) riskLevel = 'High';
        else if (totalViolations > 2) riskLevel = 'Medium';

        return {
          studentId: submission.studentId,
          studentName: submission.studentName,
          totalViolations,
          riskLevel,
          events: submission.antiCheatEvents,
          testId: submission.testId,
          testTitle: test?.title || 'Unknown Test'
        };
      })
      .sort((a, b) => b.totalViolations - a.totalViolations);

    setStudentRiskProfiles(studentProfiles);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'outline';
      default: return 'secondary';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'tab_switch': return <Eye className="w-4 h-4" />;
      case 'copy_paste': return <Copy className="w-4 h-4" />;
      case 'right_click': return <MousePointer className="w-4 h-4" />;
      case 'fullscreen_exit': return <Monitor className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'tab_switch': return 'Tab Switch';
      case 'copy_paste': return 'Copy/Paste';
      case 'right_click': return 'Right Click';
      case 'fullscreen_exit': return 'Fullscreen Exit';
      default: return eventType;
    }
  };

  const exportAntiCheatReport = () => {
    const report = {
      summary: antiCheatSummary,
      studentProfiles: studentRiskProfiles,
      exportDate: new Date().toISOString(),
      testFilter: selectedTest === 'all' ? 'All Tests' : tests.find(t => t.id === selectedTest)?.title,
      generatedBy: user?.name
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anti-cheat-report-${new Date().toISOString().split('T')[0]}.json`;
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
            <Shield className="w-6 h-6 text-primary" />
            Anti-Cheat Monitoring
          </h2>
          <p className="text-muted-foreground">Monitor and analyze suspicious activities during exams</p>
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
          
          <Button onClick={loadAntiCheatData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button onClick={exportAntiCheatReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Risk Level Alert */}
      {antiCheatSummary.riskLevel !== 'Low' && (
        <Alert className={getRiskLevelColor(antiCheatSummary.riskLevel)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{antiCheatSummary.riskLevel} Risk Level Detected!</strong>
            {` ${antiCheatSummary.totalEvents} suspicious activities detected across your tests.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold text-destructive">{antiCheatSummary.totalEvents}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tab Switches</p>
                <p className="text-2xl font-bold text-primary">{antiCheatSummary.tabSwitches}</p>
              </div>
              <Eye className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Copy/Paste</p>
                <p className="text-2xl font-bold text-primary">{antiCheatSummary.copyPasteAttempts}</p>
              </div>
              <Copy className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Right Clicks</p>
                <p className="text-2xl font-bold text-primary">{antiCheatSummary.rightClicks}</p>
              </div>
              <MousePointer className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="dsba-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                <Badge variant={getRiskBadgeVariant(antiCheatSummary.riskLevel)} className="text-sm">
                  {antiCheatSummary.riskLevel}
                </Badge>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Student Profiles</TabsTrigger>
          <TabsTrigger value="events">Event Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="dsba-card">
              <CardHeader>
                <CardTitle>Event Distribution</CardTitle>
                <CardDescription>Breakdown of anti-cheat events by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>Tab Switches</span>
                    </div>
                    <span className="font-bold">{antiCheatSummary.tabSwitches}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4" />
                      <span>Copy/Paste Attempts</span>
                    </div>
                    <span className="font-bold">{antiCheatSummary.copyPasteAttempts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4" />
                      <span>Right Clicks</span>
                    </div>
                    <span className="font-bold">{antiCheatSummary.rightClicks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <span>Fullscreen Exits</span>
                    </div>
                    <span className="font-bold">{antiCheatSummary.fullscreenExits}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dsba-card">
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>Security threat level analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full border ${getRiskLevelColor(antiCheatSummary.riskLevel)}`}>
                      <Shield className="w-5 h-5 mr-2" />
                      <span className="font-bold text-lg">{antiCheatSummary.riskLevel} Risk</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p><strong>Total Events:</strong> {antiCheatSummary.totalEvents}</p>
                    <p><strong>Students with Violations:</strong> {studentRiskProfiles.length}</p>
                    <p><strong>Critical Students:</strong> {studentRiskProfiles.filter(s => s.riskLevel === 'Critical').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card className="dsba-card">
            <CardHeader>
              <CardTitle>Student Risk Profiles</CardTitle>
              <CardDescription>Students with suspicious activities ranked by risk level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentRiskProfiles.map((student) => (
                  <Card key={`${student.studentId}-${student.testId}`} className="border-l-4 border-l-destructive/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {student.studentName}
                          </h4>
                          <p className="text-sm text-muted-foreground">{student.testTitle}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={getRiskBadgeVariant(student.riskLevel)}>
                            {student.riskLevel} Risk
                          </Badge>
                          <span className="font-bold text-lg">{student.totalViolations} events</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {['tab_switch', 'copy_paste', 'right_click', 'fullscreen_exit'].map(eventType => {
                          const count = student.events.filter(e => e.type === eventType).length;
                          return (
                            <div key={eventType} className="flex items-center gap-1">
                              {getEventIcon(eventType)}
                              <span>{getEventTypeLabel(eventType)}: {count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {studentRiskProfiles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No suspicious activities detected. All students are following exam protocols.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card className="dsba-card">
            <CardHeader>
              <CardTitle>Recent Events Timeline</CardTitle>
              <CardDescription>Chronological list of anti-cheat events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {studentRiskProfiles
                  .flatMap(student => 
                    student.events.map(event => ({
                      ...event,
                      studentName: student.studentName,
                      testTitle: student.testTitle
                    }))
                  )
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 50)
                  .map((event, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-shrink-0">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {getEventTypeLabel(event.type)} - <span className="text-muted-foreground">{event.studentName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.testTitle} • {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.details && (
                          <p className="text-xs text-muted-foreground mt-1">{event.details}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                
                {studentRiskProfiles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events to display.</p>
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

export default AntiCheatMonitor;