import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, AlertTriangle, Send, User, Shield } from 'lucide-react';
import DSBAHeader from './DSBAHeader';
import { getTestById, submitTest, logAntiCheatEvent } from '@/services/examService';
import { Test, Question } from '@/types/exam';
import { toast } from 'sonner';

const TakeTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [test, setTest] = useState<Test | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [studentName, setStudentName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [antiCheatEvents, setAntiCheatEvents] = useState<any[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const testStarted = useRef(false);

  useEffect(() => {
    if (!testId || !user) return;

    const testData = getTestById(testId);
    if (!testData) {
      toast.error('Test not found');
      navigate('/student-dashboard');
      return;
    }

    setTest(testData);
    setTimeLeft(testData.duration * 60); // Convert minutes to seconds
    testStarted.current = true;

    // Start timer
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Anti-cheat: Detect tab switching
    const handleVisibilityChange = () => {
      if (document.hidden && testStarted.current) {
        logAntiCheatEvent({
          type: 'tab_switch',
          timestamp: new Date(),
          details: 'User switched to another tab/window'
        });
        
        setAntiCheatEvents(prev => [...prev, {
          type: 'tab_switch',
          timestamp: new Date(),
          details: 'User switched to another tab/window'
        }]);
        
        toast.warning('Warning: Tab switching detected!');
      }
    };

    // Anti-cheat: Detect copy/paste
    const handleCopyPaste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        
        logAntiCheatEvent({
          type: 'copy_paste',
          timestamp: new Date(),
          details: `Copy/paste attempt: ${e.key}`
        });
        
        setAntiCheatEvents(prev => [...prev, {
          type: 'copy_paste',
          timestamp: new Date(),
          details: `Copy/paste attempt: ${e.key}`
        }]);
        
        toast.warning('Warning: Copy/paste is not allowed!');
      }
    };

    // Anti-cheat: Detect right-click
    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      
      logAntiCheatEvent({
        type: 'right_click',
        timestamp: new Date(),
        details: 'Right-click attempt detected'
      });
      
      setAntiCheatEvents(prev => [...prev, {
        type: 'right_click',
        timestamp: new Date(),
        details: 'Right-click attempt detected'
      }]);
      
      toast.warning('Warning: Right-click is disabled during the exam!');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleCopyPaste);
    document.addEventListener('contextmenu', handleRightClick);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      testStarted.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleCopyPaste);
      document.removeEventListener('contextmenu', handleRightClick);
    };
  }, [testId, user, navigate]);

  const handleTimeUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    toast.error('Time is up! Submitting your test automatically.');
    handleSubmitTest();
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const currentAnswers = (prev[questionId] as string[]) || [];
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentAnswers, option]
        };
      } else {
        return {
          ...prev,
          [questionId]: currentAnswers.filter(ans => ans !== option)
        };
      }
    });
  };

  const handleSubmitTest = () => {
    if (!test || !user) return;

    setIsSubmitting(true);
    
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      submitTest(
        test.id,
        user.id,
        studentName,
        answers,
        timeSpent,
        antiCheatEvents
      );

      toast.success('Test submitted successfully!');
      navigate('/student-dashboard');
    } catch (error) {
      toast.error('Failed to submit test. Please try again.');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredQuestions = () => {
    return Object.keys(answers).length;
  };

  const getProgressPercentage = () => {
    if (!test) return 0;
    return Math.round((getAnsweredQuestions() / test.questions.length) * 100);
  };

  if (!test || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Test not found</h1>
          <Button onClick={() => navigate('/student-dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background">
      <DSBAHeader />
      
      {/* Test Header */}
      <div className="bg-primary/5 border-b border-primary/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">{test.title}</h1>
              <p className="text-muted-foreground">{test.description}</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Progress</p>
                <p className="text-xl font-bold text-primary">
                  {getAnsweredQuestions()}/{test.questions.length}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Time Left</p>
                <p className={`text-xl font-bold ${timeLeft < 300 ? 'text-destructive' : 'text-primary'}`}>
                  <Clock className="inline w-5 h-5 mr-1" />
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Test Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="dsba-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1} of {test.questions.length}
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-lg leading-relaxed">{currentQuestion.text}</p>
              </div>

              {/* Answer Interface */}
              <div className="space-y-4">
                {currentQuestion.type === 'mcq' && (
                  <RadioGroup
                    value={answers[currentQuestion.id] as string || ''}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  >
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.type === 'checkbox' && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => {
                      const isChecked = ((answers[currentQuestion.id] as string[]) || []).includes(option);
                      return (
                        <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                          <Checkbox
                            id={`checkbox-${index}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange(currentQuestion.id, option, checked as boolean)
                            }
                          />
                          <Label htmlFor={`checkbox-${index}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'descriptive' && (
                  <Textarea
                    placeholder="Write your answer here..."
                    value={answers[currentQuestion.id] as string || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-3">
                  {/* Question Navigation */}
                  <div className="flex gap-1">
                    {test.questions.map((_, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={index === currentQuestionIndex ? "default" : "outline"}
                        className={`w-10 h-10 p-0 ${
                          answers[test.questions[index].id] ? 'bg-success/20 border-success' : ''
                        }`}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>

                {currentQuestionIndex < test.questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Test
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Anti-cheat Warning */}
          {antiCheatEvents.length > 0 && (
            <Card className="mt-4 border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Anti-cheat violations detected: {antiCheatEvents.length}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Questions Answered:</span>
                <span className="ml-2">{getAnsweredQuestions()}/{test.questions.length}</span>
              </div>
              <div>
                <span className="font-medium">Time Remaining:</span>
                <span className="ml-2">{formatTime(timeLeft)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="student-name">Confirm Your Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="student-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Please confirm your name as it will appear in the results
              </p>
            </div>

            {antiCheatEvents.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ {antiCheatEvents.length} anti-cheat violation(s) detected
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  These will be reported to your instructor
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Test
            </Button>
            <Button 
              onClick={handleSubmitTest}
              disabled={!studentName.trim() || isSubmitting}
              className="bg-success hover:bg-success/90"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeTest;