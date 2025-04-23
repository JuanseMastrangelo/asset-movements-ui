export interface Asset {
  id: string;
  name: string;
  description: string;
  type: 'PHYSICAL' | 'DIGITAL';
  isPercentage: boolean;
  isImmutable?: boolean;
  isMtherAccount: boolean;
  isActive: boolean;
}

export interface CreateAssetDto {
  name: string;
  description: string;
  type: 'PHYSICAL' | 'DIGITAL';
  isPercentage: boolean;
  isMtherAccount: boolean;
}

export interface UpdateAssetDto {
  name?: string;
  description?: string;
  type?: 'PHYSICAL' | 'DIGITAL';
  isPercentage?: boolean;
  isMtherAccount?: boolean;
} 