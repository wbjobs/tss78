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

interface BatchResult {
  index: number;
  combinationId: string;
  success: boolean;
  error?: string;
  id?: string;
  templateId?: string | null;
  templateContent?: string;
  variables?: Record<string, string>;
  images?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  result?: string;
  tokensUsed?: number;
  duration?: number;
  createdAt?: string;
}

interface BatchRun {
  id: string;
  results: BatchResult[];
  total: number;
  succeeded: number;
  failed: number;
  totalDuration: number;
  startedAt: string;
}

type VariableValueMatrix = Record<string, string[]>;
type ImageMatrix = string[][];

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
  batchMode: boolean;
  batchVariableValues: VariableValueMatrix;
  batchImageGroups: ImageMatrix;
  batchProgress: number;
  batchResults: BatchRun | null;
  isBatchExecuting: boolean;

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
  setBatchMode: (enabled: boolean) => void;
  addBatchVariableValue: (variableName: string, value: string) => void;
  removeBatchVariableValue: (variableName: string, index: number) => void;
  updateBatchVariableValue: (variableName: string, index: number, value: string) => void;
  addBatchImageGroup: (imageIds: string[]) => void;
  removeBatchImageGroup: (index: number) => void;
  generateCombinations: () => Array<{ id: string; variables: Record<string, string>; images: string[] }>;
  executeBatch: () => Promise<void>;
  clearBatchResults: () => void;
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
  batchMode: false,
  batchVariableValues: {},
  batchImageGroups: [],
  batchProgress: 0,
  batchResults: null,
  isBatchExecuting: false,

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

  setBatchMode: (enabled) => {
    const currentVars = extractVariables(get().currentTemplate);
    if (enabled) {
      const prev = get().batchVariableValues;
      const matrix: VariableValueMatrix = {};
      for (const v of currentVars) {
        const existing = prev[v];
        if (existing && existing.length > 0) {
          matrix[v] = existing;
        } else if (get().variables[v]) {
          matrix[v] = [get().variables[v]];
        } else {
          matrix[v] = [''];
        }
      }
      set({
        batchMode: true,
        batchVariableValues: matrix,
        batchResults: null,
      });
    } else {
      set({
        batchMode: false,
        batchResults: null,
      });
    }
  },

  addBatchVariableValue: (variableName, value) =>
    set((s) => ({
      batchVariableValues: {
        ...s.batchVariableValues,
        [variableName]: [...(s.batchVariableValues[variableName] ?? []), value ?? ''],
      },
    })),

  removeBatchVariableValue: (variableName, index) =>
    set((s) => {
      const arr = s.batchVariableValues[variableName] ?? [];
      if (arr.length <= 1) return s;
      return {
        batchVariableValues: {
          ...s.batchVariableValues,
          [variableName]: arr.filter((_, i) => i !== index),
        },
      };
    }),

  updateBatchVariableValue: (variableName, index, value) =>
    set((s) => {
      const arr = s.batchVariableValues[variableName] ?? [];
      const updated = [...arr];
      updated[index] = value;
      return {
        batchVariableValues: {
          ...s.batchVariableValues,
          [variableName]: updated,
        },
      };
    }),

  addBatchImageGroup: (imageIds) =>
    set((s) => ({
      batchImageGroups: [...s.batchImageGroups, imageIds],
    })),

  removeBatchImageGroup: (index) =>
    set((s) => ({
      batchImageGroups: s.batchImageGroups.filter((_, i) => i !== index),
    })),

  generateCombinations: () => {
    const { batchVariableValues, batchImageGroups, uploadedImages } = get();
    const varNames = Object.keys(batchVariableValues).filter((k) => batchVariableValues[k].length > 0);

    const varCombos: Record<string, string>[] = [{}];
    for (const name of varNames) {
      const values = batchVariableValues[name].filter((v) => v.trim() !== '' || (v.trim() === '' && batchVariableValues[name].length === 1));
      if (values.length === 0) continue;
      const next: Record<string, string>[] = [];
      for (const combo of varCombos) {
        for (const val of values) {
          next.push({ ...combo, [name]: val });
        }
      }
      varCombos.length = 0;
      varCombos.push(...next);
    }

    let imageCombos: string[][] = batchImageGroups.length > 0 ? batchImageGroups : [[]];
    if (imageCombos.length === 0) imageCombos = [[]];
    if (imageCombos[0].length === 0 && uploadedImages.length > 0) {
      imageCombos = [uploadedImages.map((i) => i.url)];
    }

    const result: Array<{ id: string; variables: Record<string, string>; images: string[] }> = [];
    for (const varCombo of varCombos) {
      for (const imgCombo of imageCombos) {
        result.push({
          id: uuidv4(),
          variables: varCombo,
          images: imgCombo,
        });
      }
    }
    return result;
  },

  executeBatch: async () => {
    const { currentTemplate, model, temperature, maxTokens, generateCombinations } = get();
    const combinations = generateCombinations();
    if (combinations.length === 0) return;

    set({ isBatchExecuting: true, batchProgress: 0, batchResults: null });
    try {
      const res = await fetch('/api/execute/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateContent: currentTemplate,
          combinations,
          model,
          temperature,
          maxTokens,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const runId = uuidv4();
        const batchRun: BatchRun = {
          id: runId,
          results: json.data.results ?? [],
          total: json.data.total ?? combinations.length,
          succeeded: json.data.succeeded ?? 0,
          failed: json.data.failed ?? 0,
          totalDuration: json.data.totalDuration ?? 0,
          startedAt: json.data.startedAt ?? new Date().toISOString(),
        };
        const records: ExecutionRecord[] = (batchRun.results as BatchResult[])
          .filter((r) => r.success)
          .map((r) => ({
            id: r.id ?? uuidv4(),
            templateId: r.templateId ?? null,
            templateContent: r.templateContent ?? currentTemplate,
            variables: r.variables ?? {},
            images: r.images ?? [],
            model: r.model ?? model,
            temperature: r.temperature ?? temperature,
            maxTokens: r.maxTokens ?? maxTokens,
            result: r.result ?? '',
            tokensUsed: r.tokensUsed ?? 0,
            duration: r.duration ?? 0,
            createdAt: r.createdAt ?? new Date().toISOString(),
          }));
        set((s) => ({
          batchResults: batchRun,
          batchProgress: 100,
          isBatchExecuting: false,
          executionHistory: [...records, ...s.executionHistory],
        }));
      } else {
        set({ isBatchExecuting: false, batchProgress: 0 });
      }
    } catch {
      set({ isBatchExecuting: false, batchProgress: 0 });
    }
  },

  clearBatchResults: () =>
    set({ batchResults: null, batchProgress: 0 }),
}));

export type { Template, VariableSet, ExecutionRecord, UploadedImage, BatchResult, BatchRun, VariableValueMatrix, ImageMatrix };
