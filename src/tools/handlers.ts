/**
 * MCP ツールハンドラー
 * 各ハンドラーは機能別ファイルに分割
 */

import {
	handleCompareCrs,
	handleGetBestPractices,
	handleGetCrsDetail,
	handleListCrsByRegion,
	handleRecommendCrs,
	handleSearchCrs,
	handleSuggestTransformation,
	handleTroubleshoot,
	handleValidateCrsUsage,
} from './handlers/index.js';

// ハンドラーを再エクスポート
export {
	handleSearchCrs,
	handleGetCrsDetail,
	handleListCrsByRegion,
	handleRecommendCrs,
	handleValidateCrsUsage,
	handleSuggestTransformation,
	handleCompareCrs,
	handleGetBestPractices,
	handleTroubleshoot,
};

// ツール名とハンドラーのマッピング
export const toolHandlers: Record<string, (args: unknown) => Promise<unknown>> = {
	search_crs: handleSearchCrs,
	get_crs_detail: handleGetCrsDetail,
	list_crs_by_region: handleListCrsByRegion,
	recommend_crs: handleRecommendCrs,
	validate_crs_usage: handleValidateCrsUsage,
	suggest_transformation: handleSuggestTransformation,
	compare_crs: handleCompareCrs,
	get_best_practices: handleGetBestPractices,
	troubleshoot: handleTroubleshoot,
};
