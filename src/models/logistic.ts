export interface LogisticConfig {
  id: string;
  name: string;
  basePrice: number;
  pricePerKm: number;
  minDistance: number;
  maxDistance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLogisticConfigDto {
  name: string;
  basePrice: number;
  pricePerKm: number;
  minDistance: number;
  maxDistance: number;
  isActive: boolean;
}

interface Meta {
  status: number;
  message: string;
  timestamp: string;
  path: string;
  totalPages?: number;
}

export interface LogisticConfigResponse {
  data: LogisticConfig[];
  meta: Meta;
}

export interface CalculateLogisticDto {
  originAddress: string;
  destinationAddress: string;
  settingsId: string;
}

export interface CalculateLogisticForm {
  originAddress: string;
  destinationAddress: string;
  settingsId: string;
}

export interface CalculateLogisticResponse {
  data: {
    originAddress: string;
    destinationAddress: string;
    distance: number;
    basePrice: number;
    pricePerKm: number;
    totalPrice: number;
    settingsUsed: {
      id: string;
      name: string;
    };
  };
  meta: Meta;
}