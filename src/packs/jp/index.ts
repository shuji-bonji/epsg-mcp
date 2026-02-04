/**
 * Japan Country Knowledge Pack
 *
 * 日本の CRS 知識を提供するパック
 * 平面直角座標系 I-XIX、JGD2011/JGD2000/Tokyo Datum の知識を含む
 */

import { loadJapanCrs, loadRecommendations } from '../../data/loader.js';
import type {
	BoundingBox,
	CountryPack,
	LocationSpec,
	PackBestPractice,
	PackCrsDataSet,
	PackRecommendationRules,
	PackTransformationKnowledge,
	PackTroubleshootingGuide,
	PackValidationRule,
	ZoneMapping,
} from '../../types/index.js';
import { JP_BOUNDS, JP_PLANE_RECT } from './constants.js';

/**
 * 複数系をまたぐ都道府県かどうかを判定
 */
function isMultiZonePrefecture(prefecture: string): boolean {
	return prefecture === '北海道' || prefecture === '沖縄県';
}

/**
 * 緯度経度から平面直角座標系の系を判定（北海道・沖縄用）
 */
function determineZoneFromCoordinate(
	point: { lat: number; lng: number },
	prefecture: string
): string {
	if (prefecture === '北海道') {
		// 経度で大まかに判定
		if (point.lng < JP_BOUNDS.HOKKAIDO.ZONE_XI_XII_BOUNDARY) {
			return JP_PLANE_RECT.ZONE_XI; // 西部
		}
		if (point.lng < JP_BOUNDS.HOKKAIDO.ZONE_XII_XIII_BOUNDARY) {
			return JP_PLANE_RECT.ZONE_XII; // 中部
		}
		return JP_PLANE_RECT.ZONE_XIII; // 東部
	}

	if (prefecture === '沖縄県') {
		// 経度で大まかに判定
		if (point.lng > JP_BOUNDS.OKINAWA.ZONE_XVI_XVII_BOUNDARY) {
			return JP_PLANE_RECT.ZONE_XVII; // 大東
		}
		if (point.lng < JP_BOUNDS.OKINAWA.ZONE_XV_XVI_BOUNDARY) {
			return JP_PLANE_RECT.ZONE_XVI; // 先島
		}
		return JP_PLANE_RECT.ZONE_XV; // 本島
	}

	return JP_PLANE_RECT.ZONE_IX; // デフォルト（東京周辺）
}

/**
 * JP Pack を作成
 */
export function createJpPack(): CountryPack {
	return {
		metadata: {
			countryCode: 'JP',
			name: 'Japan CRS Knowledge Pack',
			version: '1.0.0',
			primaryDatum: 'JGD2011',
			description: 'Japan Plane Rectangular CS I-XIX, JGD2011/JGD2000/Tokyo Datum knowledge',
			language: 'ja',
			aliases: ['JPN', 'JAPAN'],
		},

		async getCrsData(): Promise<PackCrsDataSet> {
			const japanCrsData = await loadJapanCrs();
			return {
				geographicCRS: japanCrsData.geographicCRS as PackCrsDataSet['geographicCRS'],
				projectedCRS: japanCrsData.projectedCRS as PackCrsDataSet['projectedCRS'],
			};
		},

		async getZoneMapping(): Promise<ZoneMapping> {
			const japanCrsData = await loadJapanCrs();
			const recommendationsData = await loadRecommendations();

			const entries: ZoneMapping['entries'] = {};
			const zoneMapping = japanCrsData.zoneMapping as Record<
				string,
				{ zone: string; code: string; notes?: string }
			>;

			for (const [prefecture, mapping] of Object.entries(zoneMapping)) {
				entries[prefecture] = {
					zone: mapping.zone,
					code: mapping.code,
					notes: mapping.notes,
				};
			}

			const multiZone = recommendationsData.multiZonePrefectures as Record<
				string,
				{
					note: string;
					subRegions: Record<string, string>;
					cities: Record<string, string>;
					default: string;
				}
			>;

			return {
				entries,
				multiZoneRegions: multiZone,
			};
		},

		async getRecommendationRules(): Promise<PackRecommendationRules> {
			const recommendationsData = await loadRecommendations();
			const rules = recommendationsData.rules as Record<
				string,
				{
					japan?: {
						primary: string;
						alternatives?: string[];
						fallback?: string;
						reasoning: string;
						pros?: string[];
						cons?: string[];
						warnings?: string[];
						codePattern?: string;
					};
				}
			>;

			const purposeRules: PackRecommendationRules['purposeRules'] = {};

			for (const [purpose, rule] of Object.entries(rules)) {
				if (rule.japan) {
					purposeRules[purpose] = {
						primary: rule.japan.primary,
						alternatives: rule.japan.alternatives,
						fallback: rule.japan.fallback,
						reasoning: rule.japan.reasoning,
						pros: rule.japan.pros,
						cons: rule.japan.cons,
						warnings: rule.japan.warnings,
						codePattern: rule.japan.codePattern,
						usesZoneMapping:
							rule.japan.codePattern === 'EPSG:6669-6687' ||
							rule.japan.primary.includes('平面直角座標系'),
					};
				}
			}

			return { purposeRules };
		},

		async getValidationRules(): Promise<PackValidationRule[]> {
			// Phase 5-2 では既存の validation-rules.ts を参照
			// 将来的にはここに日本固有ルールを移動
			return [];
		},

		async getTransformationKnowledge(): Promise<PackTransformationKnowledge> {
			// Phase 5-2 では既存の transformations.json を参照
			// 将来的にはここに日本固有の変換知識を移動
			return {
				transformations: [],
				hubCrs: ['EPSG:6668', 'EPSG:4326'],
				deprecatedCrs: ['EPSG:4612', 'EPSG:4301'],
			};
		},

		async getBestPractices(): Promise<PackBestPractice[]> {
			// Phase 5-2 では既存の best-practices.json を参照
			// 将来的にはここに日本固有のベストプラクティスを移動
			return [];
		},

		async getTroubleshootingGuides(): Promise<PackTroubleshootingGuide[]> {
			// Phase 5-2 では既存の troubleshooting.json を参照
			// 将来的にはここに日本固有のトラブルシュートを移動
			return [];
		},

		async selectZoneForLocation(location: LocationSpec): Promise<string | null> {
			const japanCrsData = await loadJapanCrs();
			const recommendationsData = await loadRecommendations();

			const prefecture = location.prefecture || location.subdivision;

			// 複数系またぐ地域の特別処理
			if (prefecture && isMultiZonePrefecture(prefecture)) {
				const multiZone = recommendationsData.multiZonePrefectures as Record<
					string,
					{
						subRegions: Record<string, string>;
						cities: Record<string, string>;
						default: string;
					}
				>;
				const prefConfig = multiZone[prefecture];

				if (prefConfig) {
					// 市が指定されていれば使用
					if (location.city && prefConfig.cities[location.city]) {
						return prefConfig.cities[location.city];
					}

					// 地域が指定されていれば使用
					if (location.region && prefConfig.subRegions[location.region]) {
						return prefConfig.subRegions[location.region];
					}

					// 緯度経度があれば計算
					if (location.centerPoint) {
						return determineZoneFromCoordinate(location.centerPoint, prefecture);
					}

					// デフォルト
					return prefConfig.default;
				}
			}

			// 都道府県からゾーンマッピングを取得
			if (prefecture) {
				const zoneMapping = japanCrsData.zoneMapping as Record<string, { code: string }>;
				const zoneInfo = zoneMapping[prefecture];
				if (zoneInfo) {
					return zoneInfo.code;
				}
			}

			// 緯度経度から判定（日本国内と仮定）
			if (location.centerPoint) {
				const { lat, lng } = location.centerPoint;

				// 北海道
				if (lat > JP_BOUNDS.HOKKAIDO.LAT_THRESHOLD) {
					if (lng < JP_BOUNDS.HOKKAIDO.ZONE_XI_XII_BOUNDARY) return JP_PLANE_RECT.ZONE_XI;
					if (lng < JP_BOUNDS.HOKKAIDO.ZONE_XII_XIII_BOUNDARY) return JP_PLANE_RECT.ZONE_XII;
					return JP_PLANE_RECT.ZONE_XIII;
				}

				// 東北
				if (lat > JP_BOUNDS.REGIONS.TOHOKU.SOUTH && lng > JP_BOUNDS.REGIONS.TOHOKU.EAST) {
					return JP_PLANE_RECT.ZONE_X;
				}

				// 関東
				const kanto = JP_BOUNDS.REGIONS.KANTO;
				if (lat > kanto.SOUTH && lat < kanto.NORTH && lng > kanto.WEST && lng < kanto.EAST) {
					return JP_PLANE_RECT.ZONE_IX;
				}

				// 中部
				const chubu = JP_BOUNDS.REGIONS.CHUBU;
				if (lat > chubu.SOUTH && lat < chubu.NORTH && lng > chubu.WEST && lng < chubu.EAST) {
					return JP_PLANE_RECT.ZONE_VII;
				}

				// 近畿
				const kansai = JP_BOUNDS.REGIONS.KANSAI;
				if (lat > kansai.SOUTH && lat < kansai.NORTH && lng > kansai.WEST && lng < kansai.EAST) {
					return JP_PLANE_RECT.ZONE_VI;
				}

				// デフォルト
				return JP_PLANE_RECT.ZONE_IX;
			}

			return null;
		},

		isLocationInCountry(location: LocationSpec): boolean {
			const japanPrefectures = new Set([
				'北海道',
				'青森県',
				'岩手県',
				'宮城県',
				'秋田県',
				'山形県',
				'福島県',
				'茨城県',
				'栃木県',
				'群馬県',
				'埼玉県',
				'千葉県',
				'東京都',
				'神奈川県',
				'新潟県',
				'富山県',
				'石川県',
				'福井県',
				'山梨県',
				'長野県',
				'岐阜県',
				'静岡県',
				'愛知県',
				'三重県',
				'滋賀県',
				'京都府',
				'大阪府',
				'兵庫県',
				'奈良県',
				'和歌山県',
				'鳥取県',
				'島根県',
				'岡山県',
				'広島県',
				'山口県',
				'徳島県',
				'香川県',
				'愛媛県',
				'高知県',
				'福岡県',
				'佐賀県',
				'長崎県',
				'熊本県',
				'大分県',
				'宮崎県',
				'鹿児島県',
				'沖縄県',
			]);

			// country が JP の場合
			if (location.country?.toUpperCase() === 'JP') {
				return true;
			}

			// 日本語の都道府県名が指定されている場合
			const prefecture = location.prefecture || location.subdivision;
			if (prefecture && japanPrefectures.has(prefecture)) {
				return true;
			}

			// prefecture フィールドがある場合は日本と推定
			if (location.prefecture) {
				return true;
			}

			// 座標が日本の範囲内
			if (location.centerPoint) {
				const { lat, lng } = location.centerPoint;
				return (
					lat >= JP_BOUNDS.SOUTH &&
					lat <= JP_BOUNDS.NORTH &&
					lng >= JP_BOUNDS.WEST &&
					lng <= JP_BOUNDS.EAST
				);
			}

			return false;
		},

		getCountryBounds(): BoundingBox {
			return {
				north: JP_BOUNDS.NORTH,
				south: JP_BOUNDS.SOUTH,
				east: JP_BOUNDS.EAST,
				west: JP_BOUNDS.WEST,
			};
		},
	};
}
