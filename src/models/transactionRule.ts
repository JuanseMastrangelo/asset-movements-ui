import { Asset } from "./asset";

export interface TransactionRule {
  id: string;
  sourceAssetId: string;
  targetAssetId: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  sourceAsset: Asset;
  targetAsset: Asset;
}

interface Meta {
  status: number;
  message: string;
  timestamp: string;
  path: string;
}

export interface TransactionRuleResponse {
  data: TransactionRule[];
  meta: Meta;
} 