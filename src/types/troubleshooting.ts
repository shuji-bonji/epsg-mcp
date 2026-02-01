/**
 * トラブルシューティング関連型定義
 */

export type CauseLikelihood = 'high' | 'medium' | 'low';

export interface Cause {
	likelihood: CauseLikelihood;
	cause: string;
	description: string;
	indicators: string[];
}

export interface DiagnosticStep {
	step: number;
	action: string;
	expected: string;
	ifFailed: string;
}

export interface Solution {
	forCause: string;
	steps: string[];
	prevention: string;
	tools?: string[];
}

export interface TroubleshootContext {
	sourceCrs?: string;
	targetCrs?: string;
	location?: string;
	tool?: string;
	magnitude?: string;
}

export interface TroubleshootArgs {
	symptom: string;
	context?: TroubleshootContext;
}

export interface TroubleshootOutput {
	matchedSymptom: string;
	possibleCauses: Cause[];
	diagnosticSteps: DiagnosticStep[];
	suggestedSolutions: Solution[];
	relatedBestPractices: string[];
	confidence: 'high' | 'medium' | 'low';
}

// データ構造

export interface SymptomData {
	description: string;
	keywords: string[];
	possibleCauses: Cause[];
	diagnosticSteps: DiagnosticStep[];
	solutions: Solution[];
	relatedBestPractices: string[];
}

export interface TroubleshootingData {
	version: string;
	symptoms: Record<string, SymptomData>;
	keywordMapping: Record<string, string[]>;
}
