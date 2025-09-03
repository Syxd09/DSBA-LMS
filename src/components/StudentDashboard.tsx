import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LogOut, BookOpen, Clock, Award, Trophy, Users, Play, FileText } from 'lucide-react';
import DSBAHeader from './DSBAHeader';
import { getActiveTests, getSubmissionsByStudent, getLeaderboard } from '@/services/examService';
import { Test, TestSubmission, LeaderboardEntry } from '@/types/exam';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTests, setActiveTests] = useState<Test[]>([]);
  const [mySubmissions, setMySubmissions] = useState<TestSubmission[]>([]);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    if (!user) return;
    
    const tests = getActiveTests();
    setActiveTests(tests);
    
    const submissions = getSubmissionsByStudent(user.id);
    setMySubmissions(submissions);
    
    // Load leaderboards for tests that have submissions
    const leaderboardData: Record<string, LeaderboardEntry[]> = {};
    tests.forEach(test => {
      const leaderboard = getLeaderboard(test.id);
      if (leaderboard.length > 0) {
        leaderboardData[test.id] = leaderboard;
      }
    });
    setLeaderboards(leaderboardData);
  };

  const startTest = (testId: string) => {
    navigate(`/take-test/${testId}`);
  };

  const hasSubmitted = (testId: string) => {
    return mySubmissions.some(sub => sub.testId === testId);
  };

  const getSubmissionForTest = (testId: string) => {
    return mySubmissions.find(sub => sub.testId === testId);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getMyRank = (testId: string) => {
    const leaderboard = leaderboards[testId];
    if (!leaderboard) return null;
    
    return leaderboard.find(entry => entry.studentId === user?.id);
  };

  const getAverageScore = () => {
    if (mySubmissions.length === 0) return 0;
    const total = mySubmissions.reduce((sum, sub) => sum + (sub.score / sub.totalMarks * 100), 0);
    return Math.round(total / mySubmissions.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <DSBAHeader />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Student Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.class}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Available Tests</p>
                  <p className="text-3xl font-bold text-primary">{activeTests.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="dsba-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tests Taken</p>
                  <p className="text-3xl font-bold text-success">{mySubmissions.length}</p>
                </div>
                <FileText className="w-8 h-8 text-success opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="dsba-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                  <p className="text-3xl font-bold text-warning">{getAverageScore()}%</p>
                </div>
                <Award className="w-8 h-8 text-warning opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="dsba-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Best Rank</p>
                  <p className="text-3xl font-bold text-primary">
                    {Math.min(...Object.values(leaderboards).map(lb => 
                      lb.find(entry => entry.studentId === user?.id)?.rank || Infinity
                    ).filter(rank => rank !== Infinity)) || '-'}
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tests">Available Tests</TabsTrigger>
            <TabsTrigger value="results">My Results</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboards</TabsTrigger>
          </TabsList>

          {/* Available Tests Tab */}
          <TabsContent value="tests" className="space-y-6">
            <h2 className="text-2xl font-semibold">Available Tests</h2>
            
            {activeTests.length === 0 ? (
              <Card className="dsba-card">
                <CardContent className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active tests available at the moment</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeTests.map((test) => {
                  const submitted = hasSubmitted(test.id);
                  const submission = getSubmissionForTest(test.id);
                  
                  return (
                    <Card key={test.id} className="dsba-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <Badge variant={submitted ? "secondary" : "default"}>
                            {submitted ? "Completed" : "Available"}
                          </Badge>
                        </div>
                        <CardDescription>{test.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Duration: {formatDuration(test.duration)}</span>
                          </div>
                          <div>
                            <span>Total Marks: {test.totalMarks}</span>
                          </div>
                          <div>
                            <span>Questions: {test.questions.length}</span>
                          </div>
                          <div>
                            <span>Subject: {test.subject}</span>
                          </div>
                        </div>

                        {submitted && submission && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-medium">Your Score: {submission.score}/{submission.totalMarks}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round((submission.score / submission.totalMarks) * 100)}% • 
                              Submitted: {submission.submittedAt.toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        <Button 
                          className={submitted ? "w-full" : "w-full bg-dsba-gradient hover:opacity-90"}
                          onClick={() => startTest(test.id)}
                          disabled={submitted}
                        >
                          {submitted ? (
                            <>
                              <FileText className="w-4 h-4 mr-2" />
                              View Results
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start Test
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* My Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <h2 className="text-2xl font-semibold">My Test Results</h2>
            
            {mySubmissions.length === 0 ? (
              <Card className="dsba-card">
                <CardContent className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No test results yet. Take a test to see your results here!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {mySubmissions.map((submission) => {
                  const test = activeTests.find(t => t.id === submission.testId);
                  const percentage = Math.round((submission.score / submission.totalMarks) * 100);
                  
                  return (
                    <Card key={submission.id} className="dsba-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{test?.title || 'Unknown Test'}</h3>
                            <p className="text-sm text-muted-foreground">
                              Submitted: {submission.submittedAt.toLocaleDateString()} at {submission.submittedAt.toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{submission.score}/{submission.totalMarks}</p>
                            <p className="text-sm text-muted-foreground">{percentage}%</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Score Progress</span>
                            <span>{percentage}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                        
                        <div className="mt-4 text-sm text-muted-foreground">
                          Time spent: {Math.floor(submission.timeSpent / 60)}m {submission.timeSpent % 60}s
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Leaderboards Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <h2 className="text-2xl font-semibold">Leaderboards</h2>
            
            {Object.keys(leaderboards).length === 0 ? (
              <Card className="dsba-card">
                <CardContent className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No leaderboards available yet</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(leaderboards).map(([testId, leaderboard]) => {
                  const test = activeTests.find(t => t.id === testId);
                  const myEntry = getMyRank(testId);
                  
                  return (
                    <Card key={testId} className="dsba-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="w-5 h-5" />
                          {test?.title || 'Unknown Test'}
                        </CardTitle>
                        <CardDescription>{leaderboard.length} students participated</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {leaderboard.slice(0, 10).map((entry, index) => (
                            <div 
                              key={entry.studentId}
                              className={`flex items-center justify-between p-3 rounded-lg ${
                                entry.studentId === user?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  index === 0 ? 'bg-yellow-500 text-white' :
                                  index === 1 ? 'bg-gray-400 text-white' :
                                  index === 2 ? 'bg-amber-600 text-white' :
                                  'bg-muted-foreground/20'
                                }`}>
                                  {entry.rank}
                                </div>
                                <div>
                                  <p className="font-medium">{entry.studentName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {entry.percentage}% • Time: {Math.floor(entry.timeSpent / 60)}m
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{entry.score}/{entry.totalMarks}</p>
                                {entry.studentId === user?.id && (
                                  <Badge variant="default" className="text-xs">You</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {myEntry && myEntry.rank > 10 && (
                            <>
                              <div className="text-center text-muted-foreground py-2">...</div>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-muted-foreground/20">
                                    {myEntry.rank}
                                  </div>
                                  <div>
                                    <p className="font-medium">{myEntry.studentName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {myEntry.percentage}% • Time: {Math.floor(myEntry.timeSpent / 60)}m
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{myEntry.score}/{myEntry.totalMarks}</p>
                                  <Badge variant="default" className="text-xs">You</Badge>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;