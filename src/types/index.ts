export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export enum Division {
  DHAKA = 'Dhaka',
  CHATTOGRAM = 'Chattogram',
  RAJSHAHI = 'Rajshahi',
  KHULNA = 'Khulna',
  BARISHAL = 'Barishal',
  SYLHET = 'Sylhet',
  RANGPUR = 'Rangpur',
  MYMENSINGH = 'Mymensingh'
}

export const BD_DIVISIONS = Object.values(Division);

export interface IEntry {
  _id: string;
  division: string;
  climateHazardCategory: string;
  createdDate?: Date;
  updatedDate?: Date;
}

export interface ICriteria {
  _id: string;
  criteriaTitle: string;
  weight: number;
  entryId: string;
}

export enum DamageLevel {
  SEVERELY_DAMAGE = 'Severely Damage',
  MODERATELY_DAMAGE = 'Moderately Damage',
  SLIGHTLY_DAMAGE = 'Slightly Damage',
  NO_DAMAGE = 'No Damage'
}

export interface IConfig {
  _id: string;
  name: string;
  value: number;
}

export interface ICalculationResult {
  _id?: string;
  division: string;
  entryId: string;
  climateHazardCategory?: string;
  criteriaResults: {
    criteriaId: string;
    criteriaTitle: string;
    selectedConfig: string;
    configValue: number;
  }[];
  totalScore: number;
  averageScore: number;
  riskLevel: string;
  pdfUrl?: string;
  calculatedDate?: Date;
}

export interface ICriteriaSelection {
  criteriaId: string;
  value: number;
}

// NEW: Division-wide calculation result
export interface IDivisionCalculationResult {
  division: string;
  entryCount: number;
  totalCriteriaCount: number;
  sumOfAllCriteriaValues: number;
  divisionAverageScore: number;
  divisionRiskLevel: string;
  entryResults: {
    riskLevelShort: string;
    entryId: string;
    climateHazardCategory: string;
    criteriaResults: {
      criteriaId: string;
      criteriaTitle: string;
      selectedConfig: string;
      configValue: number;
    }[];
    totalScore: number;
    averageScore: number;
    riskLevel: string;
    criteriaCount: number;
  }[];
  calculatedDate: Date;
}