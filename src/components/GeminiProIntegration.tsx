
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGeminiResponse } from './GeminiProIntegration';

interface GeminiProIntegrationProps {
  apiKey: string;
  onAnalysisComplete: (analysis: string) => void;
  className?: string;
}

const GeminiProIntegration: React.FC<GeminiProIntegrationProps> = ({ 
  apiKey, 
  onAnalysisComplete,
  className
}) => {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const [analysisType, setAnalysisType] = useState('legal-brief');

  const analysisOptions = [
    { value: 'legal-brief', label: 'Legal Brief Generation' },
    { value: 'contract-analysis', label: 'Contract Analysis' },
    { value: 'case-precedent', label: 'Case Precedent Research' },
    { value: 'compliance-check', label: 'Compliance Check' },
    { value: 'risk-assessment', label: 'Legal Risk Assessment' },
    { value: 'document-summary', label: 'Document Summary' }
  ];

  const getPromptTemplate = (type: string, content: string): string => {
    const templates: Record<string, string> = {
      'legal-brief': `Generate a comprehensive legal brief based on the following information. Include relevant legal principles, case citations, and structured arguments:\n\n${content}`,
      'contract-analysis': `Analyze this contract text and identify key clauses, potential risks, obligations, and suggested modifications:\n\n${content}`,
      'case-precedent': `Research and identify relevant case precedents related to this legal issue. Include case names, citations, and brief summaries of their relevance:\n\n${content}`,
      'compliance-check': `Perform a compliance check on this text to identify potential regulatory issues, focusing on applicable laws and regulations:\n\n${content}`,
      'risk-assessment': `Conduct a legal risk assessment based on this information. Identify potential legal risks, their likelihood, potential impact, and mitigation strategies:\n\n${content}`,
      'document-summary': `Provide a comprehensive yet concise summary of this legal document, highlighting key points, implications, and important considerations:\n\n${content}`
    };
    
    return templates[type] || templates['document-summary'];
  };

  const generateAnalysis = async () => {
    if (!text.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter some text to analyze",
      });
      return;
    }

    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please set your Gemini API key first",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = getPromptTemplate(analysisType, text);
      const analysis = await getGeminiResponse(prompt, apiKey);
      
      onAnalysisComplete(analysis);
      setIsOpen(false);
      setText('');
      
      toast({
        title: "Analysis Complete",
        description: `${analysisOptions.find(opt => opt.value === analysisType)?.label} has been generated successfully`,
      });
    } catch (error) {
      console.error(`Error generating analysis:`, error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to generate analysis",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs flex items-center gap-1"
        >
          <Zap className="h-3 w-3" />
          Gemini Pro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle>Gemini Pro Legal Analysis</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
            <Select 
              value={analysisType} 
              onValueChange={setAnalysisType}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Select analysis type" />
              </SelectTrigger>
              <SelectContent>
                {analysisOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Text Input</TabsTrigger>
                <TabsTrigger value="url" disabled>URL Input</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <TabsContent value="text" className="mt-0">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[250px] resize-none dark:bg-zinc-800 dark:border-zinc-700"
              placeholder={`Enter text for ${analysisOptions.find(opt => opt.value === analysisType)?.label}...`}
            />
          </TabsContent>
          
          <TabsContent value="url" className="mt-0">
            <Input
              placeholder="Enter URL to analyze (e.g., legal document, case law, etc.)"
              className="dark:bg-zinc-800 dark:border-zinc-700"
              disabled
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              URL analysis coming soon
            </p>
          </TabsContent>
          
          <Button 
            onClick={generateAnalysis} 
            disabled={isGenerating || !text.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Analysis...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate {analysisOptions.find(opt => opt.value === analysisType)?.label}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GeminiProIntegration;
