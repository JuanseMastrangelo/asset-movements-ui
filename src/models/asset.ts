export interface Asset {
  id: string;
  name: string;
  description: string;
  type: string;
  isPercentage: boolean;
  isMtherAccount: boolean;
  isActive: boolean;
}

export interface CreateAssetDto {
  name: string;
  description: string;
  type: string;
  isPercentage: boolean;
  isMtherAccount: boolean;
}

export interface UpdateAssetDto {
  name?: string;
  description?: string;
  type?: string;
  isPercentage?: boolean;
  isMtherAccount?: boolean;
} 