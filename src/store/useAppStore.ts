import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface VariableSet {
  id: string;
  templateId: string;
  name: string;
  values: Record<string, string>;
  createdAt: string;
}

interface ExecutionRecord {
  id: string;
  templateId: string | null;
  templateContent: string;
  variables: Record<string, string>;
  images: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  result: string;
  tokensUsed: number;
  duration: number;
  createdAt: string;
}

interface UploadedImage {
  id: string;
  filename: string;
  url: string;
}

interface AppState {
  currentTemplate: string;
  variables: Record<string, string>;
  uploadedImages: UploadedImage[];
  model: string;
  temperature: number;
  maxTokens: number;
  templates: Template[];
  variableSets: VariableSet[];
  executionHistory: ExecutionRecord[];
  currentResult: ExecutionRecord | null;
  abResult: ExecutionRecord | null;
  isExecuting: boolean;
  variablePanelOpen: boolean;

  setTemplate: (content: string) => void;
  setVariable: (key: string, value: string) => void;
  setModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  addImage: (image: UploadedImage) => void;
  removeImage: (id: string) => void;
  execute: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadVariableSets: (templateId: string) => Promise<void>;
  saveTemplate: (name: string, tags: string[]) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  toggleVariablePanel: () => void;
  executeAB: () => Promise<void>;
  saveVariableSet: (templateId: string, name: string) => Promise<VariableSet | null>;
  loadVariableSet: (id: string) => void;
}

function extractVariables(content: string): string[] {
  const regex = /\[([^\]]+)\]/g;
  const vars: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1]);
    }
  }
  return vars;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentTemplate: '',
  variables: {},
  uploadedImages: [],
  model: 'gpt-4-vision',
  temperature: 0.7,
  maxTokens: 2048,
  templates: [],
  variableSets: [],
  executionHistory: [],
  currentResult: null,
  abResult: null,
  isExecuting: false,
  variablePanelOpen: false,

  setTemplate: (content) => {
    const vars = extractVariables(content);
    const prev = get().variables;
    const updated: Record<string, string> = {};
    for (const v of vars) {
      updated[v] = prev[v] ?? '';
    }
    set({ currentTemplate: content, variables: updated });
  },

  setVariable: (key, value) =>
    set((s) => ({ variables: { ...s.variables, [key]: value } })),

  setModel: (model) => set({ model }),

  setTemperature: (temperature) => set({ temperature }),

  setMaxTokens: (maxTokens) => set({ maxTokens }),

  addImage: (image) =>
    set((s) => ({ uploadedImages: [...s.uploadedImages, image] })),

  removeImage: (id) =>
    set((s) => ({ uploadedImages: s.uploadedImages.filter((i) => i.id !== id) })),

  execute: async () => {
    const { currentTemplate, variables, uploadedImages, model, temperature, maxTokens } = get();
    set({ isExecuting: true });
    const start = Date.now();
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateContent: currentTemplate,
          variables,
          images: uploadedImages.map((i) => i.url),
          model,
          temperature,
          maxTokens,
        }),
      });
      const json = await res.json();
      const payload = json.data ?? json;
      const record: ExecutionRecord = {
        id: payload.id ?? uuidv4(),
        templateId: null,
        templateContent: currentTemplate,
        variables,
        images: uploadedImages.map((i) => i.url),
        model,
        temperature,
        maxTokens,
        result: payload.result ?? '',
        tokensUsed: payload.tokensUsed ?? 0,
        duration: payload.duration ?? (Date.now() - start),
        createdAt: payload.timestamp ?? new Date().toISOString(),
      };
      set((s) => ({
        currentResult: record,
        executionHistory: [record, ...s.executionHistory],
        isExecuting: false,
      }));
    } catch {
      set({ isExecuting: false });
    }
  },

  loadTemplates: async () => {
    try {
      const res = await fetch('/api/templates');
      const json = await res.json();
      set({ templates: json.data ?? json ?? [] });
    } catch {}
  },

  loadVariableSets: async (templateId) => {
    try {
      const res = await fetch(`/api/templates/${templateId}/variable-sets`);
      const json = await res.json();
      set({ variableSets: json.data ?? json ?? [] });
    } catch {}
  },

  saveTemplate: async (name, tags) => {
    const { currentTemplate } = get();
    const variables = extractVariables(currentTemplate);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content: currentTemplate, variables, tags }),
      });
      const json = await res.json();
      const newTpl = json.data ?? json;
      if (newTpl) {
        set((s) => ({ templates: [newTpl, ...s.templates] }));
      }
    } catch {}
  },

  deleteTemplate: async (id) => {
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
    } catch {}
  },

  loadHistory: async () => {
    try {
      const res = await fetch('/api/history');
      const json = await res.json();
      const records = json.data?.records ?? json.data ?? json ?? [];
      set({ executionHistory: records });
    } catch {}
  },

  toggleVariablePanel: () =>
    set((s) => ({ variablePanelOpen: !s.variablePanelOpen })),

  executeAB: async () => {
    const { currentTemplate, variables, uploadedImages, model, temperature, maxTokens, currentResult } = get();
    set({ isExecuting: true });
    const start = Date.now();
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateContent: currentTemplate,
          variables,
          images: uploadedImages.map((i) => i.url),
          model,
          temperature,
          maxTokens,
        }),
      });
      const json = await res.json();
      const payload = json.data ?? json;
      const record: ExecutionRecord = {
        id: payload.id ?? uuidv4(),
        templateId: null,
        templateContent: currentTemplate,
        variables,
        images: uploadedImages.map((i) => i.url),
        model,
        temperature,
        maxTokens,
        result: payload.result ?? '',
        tokensUsed: payload.tokensUsed ?? 0,
        duration: payload.duration ?? (Date.now() - start),
        createdAt: payload.timestamp ?? new Date().toISOString(),
      };
      set((s) => ({
        abResult: record,
        currentResult: currentResult ?? record,
        executionHistory: [record, ...s.executionHistory],
        isExecuting: false,
      }));
    } catch {
      set({ isExecuting: false });
    }
  },

  saveVariableSet: async (templateId: string, name: string) => {
    const { variables } = get();
    try {
      const res = await fetch(`/api/templates/${templateId}/variable-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, values: variables }),
      });
      const json = await res.json();
      const newSet = json.data ?? json;
      if (newSet) {
        set((s) => ({ variableSets: [newSet, ...s.variableSets] }));
      }
      return newSet;
    } catch {
      return null;
    }
  },

  loadVariableSet: (id) => {
    const vs = get().variableSets.find((v) => v.id === id);
    if (vs) {
      set({ variables: { ...vs.values } });
    }
  },
}));

export type { Template, VariableSet, ExecutionRecord, UploadedImage };
