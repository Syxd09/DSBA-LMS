import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, LogIn, User, Lock, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DSBAHeader from './DSBAHeader';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      return;
    }
    
    setIsLoading(true);
    const success = await login(username, password, role);
    
    if (success) {
      // Navigate based on role
      if (role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');  
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <DSBAHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="dsba-card border-primary/10">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                <LogIn className="w-8 h-8" />
                DSBA Exam Portal
              </CardTitle>
              <CardDescription className="text-base">
                Login to access your examination dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">Select Role</Label>
                  <Select value={role} onValueChange={(value: 'teacher' | 'student') => setRole(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Student
                      </SelectItem>
                      <SelectItem value="teacher" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Teacher
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-dsba-gradient hover:opacity-90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Demo Credentials:</h4>
                <div className="space-y-2 text-xs">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium text-foreground mb-1">Teachers:</p>
                    <p>teacher1 / teacher123 (Dr. Rajesh Kumar)</p>
                    <p>teacher2 / teacher123 (Prof. Priya Sharma)</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium text-foreground mb-1">Students:</p>
                    <p>student1 / student123 (Arjun Patel)</p>
                    <p>student2 / student123 (Sneha Reddy)</p>
                    <p>student3 / student123 (Vikram Singh)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;