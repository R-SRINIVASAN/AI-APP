// src/types/index.ts

/**
 * Defines the structure for a Health Vital record.
 */
export interface HealthVital {
  id: string;
  date: Date;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenSaturation: number;
  heartRate: number;
  bloodSugar: number;
}

/**
 * Defines the structure for a User profile.
 * Includes optional fields for profile setup data.
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  age?: number;
  gender?: string;
  height?: number; // in cm
  weight?: number; // in kg
  bloodGroup?: string;
  emergencyContact?: string;
  diseases?: string[]; // Array of medical conditions
  allergies?: string[]; // Array of known allergies
  medications?: string[]; // Array of current medications
  smokingStatus?: 'never' | 'former' | 'current';
  alcoholConsumption?: 'never' | 'occasional' | 'regular';
  exerciseFrequency?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietaryPreferences?: string[]; // Array of dietary preferences/restrictions
  familyHistory?: string[]; // Array of family medical history entries
  occupation?: string;
  profileCompleted?: boolean; // Flag to indicate if profile setup is complete
}
