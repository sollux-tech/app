-- Tabela de formulários
CREATE TABLE IF NOT EXISTS forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  questions JSONB[] DEFAULT '[]'::JSONB[],
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de respostas de formulários
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_forms_company_id ON forms(company_id);
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_created_at ON form_responses(created_at);

-- Função para atualizar o contador de respostas
CREATE OR REPLACE FUNCTION update_form_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forms 
  SET response_count = (SELECT COUNT(*) FROM form_responses WHERE form_id = NEW.form_id)
  WHERE id = NEW.form_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gatilho para atualizar contador de respostas
CREATE TRIGGER trigger_update_form_response_count
AFTER INSERT OR DELETE ON form_responses
FOR EACH ROW
EXECUTE FUNCTION update_form_response_count();

-- Política de segurança para formulários
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's forms"
ON forms FOR SELECT
USING (company_id = auth.uid()::text);

CREATE POLICY "Users can create forms in their company"
ON forms FOR INSERT
WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Users can update their company's forms"
ON forms FOR UPDATE
USING (company_id = auth.uid()::text);

CREATE POLICY "Users can delete their company's forms"
ON forms FOR DELETE
USING (company_id = auth.uid()::text);

-- Política de segurança para respostas de formulários
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses for their company's forms"
ON form_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM forms 
    WHERE forms.id = form_responses.form_id 
    AND forms.company_id = auth.uid()::text
  )
);

CREATE POLICY "Authenticated users can submit responses"
ON form_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM forms 
    WHERE forms.id = form_responses.form_id 
    AND forms.status = 'published'
  )
);