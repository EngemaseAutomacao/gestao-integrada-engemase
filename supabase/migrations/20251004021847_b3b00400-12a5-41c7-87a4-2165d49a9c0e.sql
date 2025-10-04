-- Create enum for issue severity
CREATE TYPE public.issue_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for issue status
CREATE TYPE public.issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create table for tool issues
CREATE TABLE public.tool_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  checkout_id UUID REFERENCES public.tool_checkouts(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity public.issue_severity NOT NULL DEFAULT 'medium',
  status public.issue_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tool_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view tool issues"
  ON public.tool_issues
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can report issues"
  ON public.tool_issues
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can update own issues"
  ON public.tool_issues
  FOR UPDATE
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can update all issues"
  ON public.tool_issues
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can delete issues"
  ON public.tool_issues
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Trigger for updated_at
CREATE TRIGGER update_tool_issues_updated_at
  BEFORE UPDATE ON public.tool_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_tool_issues_tool_id ON public.tool_issues(tool_id);
CREATE INDEX idx_tool_issues_status ON public.tool_issues(status);
CREATE INDEX idx_tool_issues_severity ON public.tool_issues(severity);