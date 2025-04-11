import { Asset } from "./asset";

export interface Denomination {
    id: string;
    assetId: string;
    value: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    asset: Asset;
}