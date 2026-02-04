/**
 * 検証ルール定義
 * データ駆動型の検証ルールを定義
 */

import { EPSG } from '../constants/index.js';
import { selectZoneForLocation } from '../services/recommendation-service.js';
import type {
	CrsDetail,
	LocationSpec,
	Purpose,
	RecommendationsData,
	ValidationIssue,
	ValidationIssueCode,
} from '../types/index.js';
import { isJapanLocation } from './location-normalizer.js';
import { checkZoneSpan, isLegacyDatum, isPlaneRectangularCS } from './validation.js';

/**
 * 検証ルールのコンテキスト
 */
export interface ValidationContext {
	crs: CrsDetail;
	location: LocationSpec;
	recommendations: RecommendationsData;
}

/**
 * 検証ルール定義
 */
export interface ValidationRule {
	/** 適用する用途（配列で複数指定可能） */
	purposes: Purpose[];
	/** ルールの条件判定（trueなら問題あり） */
	condition: (ctx: ValidationContext) => boolean | Promise<boolean>;
	/** 検出される問題 */
	issue: ValidationIssue | ((ctx: ValidationContext) => ValidationIssue | Promise<ValidationIssue>);
}

/**
 * 検証ルール一覧
 */
export const VALIDATION_RULES: ValidationRule[] = [
	// ===== 面積計算 =====
	{
		purposes: ['area_calculation'],
		condition: (ctx) => ctx.crs.code === EPSG.WEB_MERCATOR,
		issue: {
			severity: 'error',
			code: 'AREA_DISTORTION',
			message: 'Web Mercator causes significant area distortion',
			recommendation: 'Use an equal-area or local projected CRS',
		},
	},
	{
		purposes: ['area_calculation'],
		condition: (ctx) => ctx.crs.type === 'geographic',
		issue: {
			severity: 'info',
			code: 'GEOGRAPHIC_AREA',
			message: 'Geographic CRS requires spherical/ellipsoidal area calculation',
			recommendation: 'Use projected CRS or geodetic area formula',
		},
	},

	// ===== 距離計算 =====
	{
		purposes: ['distance_calculation'],
		condition: (ctx) => ctx.crs.type === 'geographic',
		issue: {
			severity: 'info',
			code: 'GEOGRAPHIC_DISTANCE',
			message: 'Geographic CRS requires geodetic distance calculation',
			recommendation: 'Use Haversine/Vincenty formula or a projected CRS',
		},
	},
	{
		purposes: ['distance_calculation'],
		condition: (ctx) => ctx.crs.code === EPSG.WEB_MERCATOR,
		issue: {
			severity: 'warning',
			code: 'DISTANCE_DISTORTION',
			message: 'Web Mercator distance varies significantly with latitude',
			recommendation: 'Use local projected CRS or geodetic calculation',
		},
	},
	{
		purposes: ['distance_calculation'],
		condition: (ctx) =>
			isPlaneRectangularCS(ctx.crs.code) &&
			!!ctx.location.boundingBox &&
			checkZoneSpan(ctx.location.boundingBox),
		issue: {
			severity: 'warning',
			code: 'CROSS_ZONE_CALCULATION',
			message: 'Area spans multiple plane rectangular zones',
			recommendation: 'Use JGD2011 geographic (EPSG:6668) with geodetic calculation',
		},
	},

	// ===== 測量 =====
	{
		purposes: ['survey'],
		condition: (ctx) => isJapanLocation(ctx.location) && !isPlaneRectangularCS(ctx.crs.code),
		issue: {
			severity: 'warning',
			code: 'NOT_OFFICIAL_SURVEY_CRS',
			message: 'Not the official survey CRS for Japan',
			recommendation: 'Use Japan Plane Rectangular CS (EPSG:6669-6687)',
		},
	},
	{
		purposes: ['survey'],
		condition: async (ctx) => {
			if (!isJapanLocation(ctx.location) || !isPlaneRectangularCS(ctx.crs.code)) {
				return false;
			}
			const expectedZone = await selectZoneForLocation(ctx.location);
			return !!expectedZone && expectedZone !== ctx.crs.code;
		},
		issue: async (ctx) => {
			const expectedZone = await selectZoneForLocation(ctx.location);
			return {
				severity: 'warning',
				code: 'ZONE_MISMATCH' as ValidationIssueCode,
				message: `Expected ${expectedZone} for ${ctx.location.prefecture || 'this location'}, but ${ctx.crs.code} was specified`,
				recommendation: `Use ${expectedZone} for this location`,
			};
		},
	},
	{
		purposes: ['survey'],
		condition: (ctx) => isLegacyDatum(ctx.crs.code),
		issue: {
			severity: 'error',
			code: 'LEGACY_DATUM',
			message: 'Tokyo Datum (old Japanese datum) should not be used for new surveys',
			recommendation: 'Use JGD2011-based CRS (EPSG:6668 or EPSG:6669-6687)',
		},
	},

	// ===== Webマッピング =====
	{
		purposes: ['web_mapping'],
		condition: (ctx) => !ctx.recommendations.validationRules.webMappingCrs.includes(ctx.crs.code),
		issue: {
			severity: 'info',
			code: 'NON_STANDARD_WEB_CRS',
			message: 'This CRS may not be natively supported by web mapping libraries',
			recommendation: 'Consider EPSG:3857 for display or EPSG:4326 for GeoJSON',
		},
	},

	// ===== ナビゲーション =====
	{
		purposes: ['navigation'],
		condition: (ctx) => !ctx.recommendations.validationRules.navigationCrs.includes(ctx.crs.code),
		issue: {
			severity: 'info',
			code: 'GPS_CONVERSION_NEEDED',
			message: 'GPS devices output WGS84 coordinates',
			recommendation: 'Consider using EPSG:4326 or EPSG:6668 (practically equivalent)',
		},
	},

	// ===== データ保存 =====
	{
		purposes: ['data_storage'],
		condition: (ctx) => ctx.crs.type === 'projected',
		issue: {
			severity: 'info',
			code: 'PROJECTED_STORAGE',
			message: 'Projected CRS may limit future reprojection flexibility',
			recommendation: 'Consider storing in geographic CRS (EPSG:4326 or EPSG:6668)',
		},
	},
	{
		purposes: ['data_storage'],
		condition: (ctx) => !!ctx.crs.deprecated,
		issue: (ctx) => ({
			severity: 'warning',
			code: 'DEPRECATED_STORAGE',
			message: 'Storing data in deprecated CRS may cause future compatibility issues',
			recommendation: `Migrate to ${ctx.crs.supersededBy || 'a current CRS'}`,
		}),
	},

	// ===== データ交換 =====
	{
		purposes: ['data_exchange'],
		condition: (ctx) => !ctx.recommendations.validationRules.dataExchangeCrs.includes(ctx.crs.code),
		issue: {
			severity: 'info',
			code: 'NON_STANDARD_EXCHANGE',
			message: 'EPSG:4326 is the most widely supported CRS for data exchange',
			recommendation: 'Consider converting to WGS84 for broader compatibility',
		},
	},
	{
		purposes: ['data_exchange'],
		condition: (ctx) => ctx.crs.type === 'projected',
		issue: {
			severity: 'warning',
			code: 'GEOJSON_INCOMPATIBLE',
			message: 'GeoJSON specification requires WGS84 (EPSG:4326)',
			recommendation: 'Convert to EPSG:4326 for GeoJSON export',
		},
	},

	// ===== 可視化 =====
	{
		purposes: ['visualization'],
		condition: (ctx) => !ctx.recommendations.validationRules.webMappingCrs.includes(ctx.crs.code),
		issue: {
			severity: 'info',
			code: 'NON_STANDARD_WEB_CRS',
			message: 'This CRS may not be natively supported by visualization libraries',
			recommendation: 'Consider EPSG:3857 for web display',
		},
	},
];

/**
 * 指定された用途に対する検証ルールを適用
 */
export async function applyValidationRules(
	purpose: Purpose,
	ctx: ValidationContext
): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];
	const applicableRules = VALIDATION_RULES.filter((rule) => rule.purposes.includes(purpose));

	for (const rule of applicableRules) {
		const conditionMet = await rule.condition(ctx);
		if (conditionMet) {
			const issue = typeof rule.issue === 'function' ? await rule.issue(ctx) : rule.issue;
			issues.push(issue);
		}
	}

	return issues;
}
