import axios from 'axios';
import {
  ApiResponse,
  IEntry,
  ICriteria,
  IConfig,
  ICalculationResult,
  ICriteriaSelection,
  IDivisionCalculationResult,
} from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials:true
});

// Global Error Interceptor
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ENTRY
export const entryService = {
  getAll: () => api.get<ApiResponse<IEntry[]>>('/entries'),
  getByDivision: (division: string) =>
    api.get<ApiResponse<IEntry[]>>(`/entries/division/${division}`),
  getById: (id: string) =>
    api.get<ApiResponse<{ entry: IEntry; criteria: ICriteria[] }>>(`/entries/${id}`),
  create: (data: Partial<IEntry>) =>
    api.post<ApiResponse<IEntry>>('/entries', data),
  update: (id: string, data: Partial<IEntry>) =>
    api.put<ApiResponse<IEntry>>(`/entries/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/entries/${id}`),
};

// CRITERIA
export const criteriaService = {
  getByEntry: (entryId: string) =>
    api.get<ApiResponse<ICriteria[]>>(`/criteria/entry/${entryId}`),
  create: (data: { entryId: string; criteriaTitle: string; weight: number }) =>
    api.post<ApiResponse<ICriteria>>('/criteria', data),
  update: (id: string, data: Partial<ICriteria>) =>
    api.put<ApiResponse<ICriteria>>(`/criteria/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/criteria/${id}`),
};

// CONFIG
export const configService = {
  getAll: () => api.get<ApiResponse<IConfig[]>>('/configs'),
};

// CALCULATOR
export const calculatorService = {
  // Single entry calculation
  calculate: (entryId: string, criteriaSelections: ICriteriaSelection[]) =>
    api.post<ApiResponse<ICalculationResult>>('/calculate', {
      entryId,
      criteriaSelections,
    }),
  
  // Division-wide calculation
  calculateDivision: (division: string) =>
    api.get<ApiResponse<IDivisionCalculationResult>>(`/calculate/division/${division}`),
  
  // Generate PDF for single entry
  generatePDF: (data: ICalculationResult) =>
    api.post<ApiResponse<{ pdfUrl: string }>>('/generate-pdf', data),
  
  // Generate PDF for division
  generateDivisionPDF: (data: IDivisionCalculationResult) =>
    api.post<ApiResponse<{ pdfUrl: string }>>('/generate-division-pdf', data),
  
  getHistory: () =>
    api.get<ApiResponse<ICalculationResult[]>>('/calculations'),
  getById: (id: string) =>
    api.get<ApiResponse<ICalculationResult>>(`/calculations/${id}`),
};

export default api;