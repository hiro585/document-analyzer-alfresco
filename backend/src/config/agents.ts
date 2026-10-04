export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  // 'llm' agents call the model with `task` as the instruction; 'record-match'
  // agents compare the document against a required reference CSV/TXT file
  // (see upload.ts).
  type: 'llm' | 'record-match';
  // Instruction sent to the LLM describing what this agent should check for. Only used when type === 'llm'.
  task?: string;
  // When true, the upload request must include a reference file for this agent to run.
  requiresReferenceFile?: boolean;
}

export const AI_AGENTS: AgentDefinition[] = [
  {
    id: 'fraud-detection',
    name: 'Fraud Detection Agent',
    description: 'Checks the document for wrongful, falsified, or suspicious information.',
    type: 'llm',
    task: 'Carefully review this document for signs of fraud or wrongful information: falsified figures, forged signatures, inconsistent dates or amounts, altered text, impossible or contradictory facts, or anything else that looks fabricated or misleading.',
  },
  {
    id: 'missing-info',
    name: 'Missing Information Check Agent',
    description: 'Checks the document for missing or incomplete required entries.',
    type: 'llm',
    task: 'Carefully review this document for missing information: required fields left blank, incomplete sections, missing signatures, dates, or amounts, or any entries that appear absent or incomplete.',
  },
  {
    id: 'record-match',
    name: 'Record Match Agent',
    description:
      'Checks whether the extracted data matches a record in an uploaded reference list (e.g. a registration list). Requires uploading a CSV/TXT reference file.',
    type: 'record-match',
    requiresReferenceFile: true,
  },
];
