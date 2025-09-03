import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createTest, getCOPOMapping } from '@/services/examService';
import { Question, Test } from '@/types/exam';
import { toast } from 'sonner';

interface CreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCreated: () => void;
}

const CreateTestDialog = ({ open, onOpenChange, onTestCreated }: CreateTestDialogProps) => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('basic');
  
  // Basic test info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState(120);
  
  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'mcq',
    text: '',
    options: ['', '', '', ''],
    marks: 5,
    co: '',
    po: ''
  });
  
  const copoMapping = getCOPOMapping();
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('');
    setDuration(120);
    setQuestions([]);
    setCurrentQuestion({
      type: 'mcq',
      text: '',
      options: ['', '', '', ''],
      marks: 5,
      co: '',
      po: ''
    });
    setCurrentTab('basic');
  };

  const addQuestion = () => {
    if (!currentQuestion.text || !currentQuestion.marks) {
      toast.error('Please fill in question text and marks');
      return;
    }

    let isValid = true;
    let correctAnswer: string | string[] = '';

    switch (currentQuestion.type) {
      case 'mcq':
        if (!currentQuestion.options || currentQuestion.options.length !== 4) {
          toast.error('MCQ must have exactly 4 options');
          isValid = false;
        }
        // For MCQ, we need the teacher to select the correct answer
        const mcqCorrectIndex = currentQuestion.options?.findIndex(opt => opt.includes('[CORRECT]'));
        if (mcqCorrectIndex === -1) {
          toast.error('Please mark the correct answer by adding [CORRECT] to the end');
          isValid = false;
        } else {
          correctAnswer = currentQuestion.options![mcqCorrectIndex!].replace(' [CORRECT]', '');
        }
        break;
        
      case 'checkbox':
        if (!currentQuestion.options || currentQuestion.options.length < 2) {
          toast.error('Checkbox must have at least 2 options');
          isValid = false;
        }
        // For checkbox, collect all options marked with [CORRECT]
        const correctOptions = currentQuestion.options?.filter(opt => opt.includes('[CORRECT]')).map(opt => opt.replace(' [CORRECT]', ''));
        if (!correctOptions || correctOptions.length === 0) {
          toast.error('Please mark at least one correct answer by adding [CORRECT]');
          isValid = false;
        } else {
          correctAnswer = correctOptions;
        }
        break;
        
      case 'descriptive':
        if (!currentQuestion.keywords || currentQuestion.keywords.length === 0) {
          toast.error('Descriptive questions must have keywords for evaluation');
          isValid = false;
        }
        break;
    }

    if (!isValid) return;

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: currentQuestion.type!,
      text: currentQuestion.text!,
      options: currentQuestion.options?.map(opt => opt.replace(' [CORRECT]', '')),
      correctAnswer,
      keywords: currentQuestion.keywords,
      marks: currentQuestion.marks!,
      co: currentQuestion.co || '',
      po: currentQuestion.po || ''
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      type: 'mcq',
      text: '',
      options: ['', '', '', ''],
      marks: 5,
      co: '',
      po: ''
    });
    toast.success('Question added successfully');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || [])];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...(currentQuestion.keywords || [])];
    newKeywords[index] = value;
    setCurrentQuestion({ ...currentQuestion, keywords: newKeywords });
  };

  const addKeyword = () => {
    setCurrentQuestion({
      ...currentQuestion,
      keywords: [...(currentQuestion.keywords || []), '']
    });
  };

  const removeKeyword = (index: number) => {
    const newKeywords = (currentQuestion.keywords || []).filter((_, i) => i !== index);
    setCurrentQuestion({ ...currentQuestion, keywords: newKeywords });
  };

  const handleCreateTest = () => {
    if (!title || !description || !subject || questions.length === 0) {
      toast.error('Please fill all required fields and add at least one question');
      return;
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    const testData: Omit<Test, 'id' | 'createdAt'> = {
      title,
      description,
      subject,
      duration,
      totalMarks,
      questions,
      isActive: false,
      createdBy: user?.id || '',
      instructions: [
        'Read all questions carefully before starting',
        'Manage your time effectively',
        'Do not refresh the page during exam',
        'Anti-cheat measures are active'
      ]
    };

    createTest(testData);
    onTestCreated();
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Create New Test</DialogTitle>
          <DialogDescription>
            Create a comprehensive test with multiple question types
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="review">Review & Create</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Data Structures - First IA"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Computer Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this test covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="30"
                max="300"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 120)}
              />
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select value={currentQuestion.type} onValueChange={(value: 'mcq' | 'checkbox' | 'descriptive') => 
                      setCurrentQuestion({ ...currentQuestion, type: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                        <SelectItem value="checkbox">Multiple Select (Checkbox)</SelectItem>
                        <SelectItem value="descriptive">Descriptive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Marks</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={currentQuestion.marks}
                      onChange={(e) => setCurrentQuestion({ 
                        ...currentQuestion, 
                        marks: parseInt(e.target.value) || 5 
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course Outcome (CO)</Label>
                    <Select value={currentQuestion.co} onValueChange={(value) => 
                      setCurrentQuestion({ ...currentQuestion, co: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select CO" />
                      </SelectTrigger>
                      <SelectContent>
                        {copoMapping.courseOutcomes.map((co, index) => (
                          <SelectItem key={index} value={`CO${index + 1}`}>{co}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Program Outcome (PO)</Label>
                    <Select value={currentQuestion.po} onValueChange={(value) => 
                      setCurrentQuestion({ ...currentQuestion, po: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select PO" />
                      </SelectTrigger>
                      <SelectContent>
                        {copoMapping.programOutcomes.map((po, index) => (
                          <SelectItem key={index} value={`PO${index + 1}`}>{po}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Textarea
                    placeholder="Enter your question here..."
                    value={currentQuestion.text}
                    onChange={(e) => setCurrentQuestion({ 
                      ...currentQuestion, 
                      text: e.target.value 
                    })}
                  />
                </div>

                {(currentQuestion.type === 'mcq' || currentQuestion.type === 'checkbox') && (
                  <div className="space-y-4">
                    <Label>Options</Label>
                    {currentQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option.replace(' [CORRECT]', '')}
                            onChange={(e) => updateOption(index, e.target.value + (option.includes('[CORRECT]') ? ' [CORRECT]' : ''))}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`correct-${index}`}
                            checked={option.includes('[CORRECT]')}
                            onCheckedChange={(checked) => {
                              const baseOption = option.replace(' [CORRECT]', '');
                              updateOption(index, baseOption + (checked ? ' [CORRECT]' : ''));
                            }}
                          />
                          <Label htmlFor={`correct-${index}`} className="text-sm font-medium text-success">
                            Correct Answer
                          </Label>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      ✓ Mark the correct answer(s) using the checkbox. For MCQ, select only one. For multiple choice, select all correct options.
                    </p>
                  </div>
                )}

                {currentQuestion.type === 'descriptive' && (
                  <div className="space-y-2">
                    <Label>Keywords for Evaluation</Label>
                    {(currentQuestion.keywords || []).map((keyword, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Keyword ${index + 1}`}
                          value={keyword}
                          onChange={(e) => updateKeyword(index, e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeKeyword(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addKeyword}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Keyword
                    </Button>
                  </div>
                )}

                <Button onClick={addQuestion} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </CardContent>
            </Card>

            {questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Added Questions ({questions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {questions.map((question, index) => (
                    <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                      <div>
                        <p className="font-medium">{question.text.substring(0, 60)}...</p>
                        <p className="text-sm text-muted-foreground">
                          {question.type.toUpperCase()} • {question.marks} marks • {question.co} • {question.po}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Title:</p>
                    <p className="text-muted-foreground">{title}</p>
                  </div>
                  <div>
                    <p className="font-medium">Subject:</p>
                    <p className="text-muted-foreground">{subject}</p>
                  </div>
                  <div>
                    <p className="font-medium">Duration:</p>
                    <p className="text-muted-foreground">{duration} minutes</p>
                  </div>
                  <div>
                    <p className="font-medium">Total Questions:</p>
                    <p className="text-muted-foreground">{questions.length}</p>
                  </div>
                  <div>
                    <p className="font-medium">Total Marks:</p>
                    <p className="text-muted-foreground">{questions.reduce((sum, q) => sum + q.marks, 0)}</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Description:</p>
                  <p className="text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {currentTab === 'review' && (
            <Button onClick={handleCreateTest} className="bg-dsba-gradient hover:opacity-90">
              <Save className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTestDialog;