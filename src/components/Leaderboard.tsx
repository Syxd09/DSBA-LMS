import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Users, Clock, Target, Download } from 'lucide-react';
import { getTests, getLeaderboard } from '@/services/examService';
import { Test, LeaderboardEntry } from '@/types/exam';
import { useAuth } from '@/contexts/AuthContext';

interface TestLeaderboard {
  test: Test;
  leaderboard: LeaderboardEntry[];
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [testLeaderboards, setTestLeaderboards] = useState<TestLeaderboard[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');

  useEffect(() => {
    loadLeaderboardData();
  }, [user]);

  useEffect(() => {
    if (testLeaderboards.length > 0 && !selectedTest) {
      setSelectedTest(testLeaderboards[0].test.id);
    }
  }, [testLeaderboards]);

  const loadLeaderboardData = () => {
    const userTests = getTests().filter(test => test.createdBy === user?.id);
    
    const leaderboards: TestLeaderboard[] = userTests.map(test => ({
      test,
      leaderboard: getLeaderboard(test.id)
    })).filter(item => item.leaderboard.length > 0);

    setTestLeaderboards(leaderboards);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1: return 'default';
      case 2: return 'secondary';
      case 3: return 'outline';
      default: return 'outline';
    }
  };

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return { variant: 'default' as const, label: 'Excellent', color: 'text-green-600' };
    if (percentage >= 80) return { variant: 'secondary' as const, label: 'Very Good', color: 'text-blue-600' };
    if (percentage >= 70) return { variant: 'outline' as const, label: 'Good', color: 'text-yellow-600' };
    if (percentage >= 60) return { variant: 'outline' as const, label: 'Average', color: 'text-orange-600' };
    return { variant: 'destructive' as const, label: 'Below Average', color: 'text-red-600' };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const exportLeaderboard = () => {
    const selectedTestData = testLeaderboards.find(item => item.test.id === selectedTest);
    if (!selectedTestData) return;

    const data = {
      testTitle: selectedTestData.test.title,
      testDate: selectedTestData.test.createdAt.toISOString(),
      totalParticipants: selectedTestData.leaderboard.length,
      leaderboard: selectedTestData.leaderboard,
      exportDate: new Date().toISOString(),
      generatedBy: user?.name
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard-${selectedTestData.test.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedTestData = testLeaderboards.find(item => item.test.id === selectedTest);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Test Leaderboards
          </h2>
          <p className="text-muted-foreground">View top performers across your tests</p>
        </div>
        
        <div className="flex gap-3">
          <select 
            className="px-3 py-2 border rounded-md bg-background"
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
          >
            {testLeaderboards.map(item => (
              <option key={item.test.id} value={item.test.id}>{item.test.title}</option>
            ))}
          </select>
          
          {selectedTestData && (
            <Button onClick={exportLeaderboard} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {testLeaderboards.length === 0 ? (
        <Card className="dsba-card">
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Leaderboard Data</h3>
              <p>Create tests and collect submissions to see leaderboards.</p>
            </div>
          </CardContent>
        </Card>
      ) : selectedTestData ? (
        <>
          {/* Test Info Card */}
          <Card className="dsba-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedTestData.test.title}</CardTitle>
                  <CardDescription>{selectedTestData.test.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  <Users className="w-4 h-4 mr-2" />
                  {selectedTestData.leaderboard.length} participants
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Total Marks</p>
                  <p className="text-2xl font-bold text-primary">{selectedTestData.test.totalMarks}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-primary">
                    {Math.round((selectedTestData.leaderboard.reduce((acc, entry) => acc + entry.percentage, 0) / selectedTestData.leaderboard.length) || 0)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Highest Score</p>
                  <p className="text-2xl font-bold text-success">
                    {selectedTestData.leaderboard[0]?.percentage || 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-primary">100%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top 3 Podium */}
          <Card className="dsba-card">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedTestData.leaderboard.slice(0, 3).map((entry, index) => {
                  const performance = getPerformanceBadge(entry.percentage);
                  return (
                    <Card key={entry.studentId} className={`border-2 ${
                      index === 0 ? 'border-yellow-200 bg-yellow-50' :
                      index === 1 ? 'border-gray-200 bg-gray-50' :
                      'border-amber-200 bg-amber-50'
                    }`}>
                      <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-3">
                          {getRankIcon(entry.rank)}
                        </div>
                        <h3 className="font-bold text-lg mb-2">{entry.studentName}</h3>
                        <div className="space-y-2">
                          <div className="text-3xl font-bold text-primary">
                            {entry.score}/{entry.totalMarks}
                          </div>
                          <Badge variant={performance.variant} className="text-sm">
                            {entry.percentage}% - {performance.label}
                          </Badge>
                          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(entry.timeSpent)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Complete Leaderboard */}
          <Card className="dsba-card">
            <CardHeader>
              <CardTitle>Complete Rankings</CardTitle>
              <CardDescription>All participants ranked by performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedTestData.leaderboard.map((entry) => {
                  const performance = getPerformanceBadge(entry.percentage);
                  return (
                    <div 
                      key={entry.studentId}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-lg">{entry.studentName}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {entry.score}/{entry.totalMarks} marks
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(entry.timeSpent)}
                            </span>
                            <span>
                              Submitted: {entry.submittedAt.toLocaleDateString()} at {entry.submittedAt.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={performance.variant}>
                          {entry.percentage}%
                        </Badge>
                        <div className={`text-right ${performance.color}`}>
                          <div className="font-bold text-xl">{entry.percentage}%</div>
                          <div className="text-xs">{performance.label}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default Leaderboard;