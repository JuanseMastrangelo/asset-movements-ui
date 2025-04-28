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

export interface LogisticData {
    id: string;
    transactionId: string;
    originAddress: string;
    destinationAddress: string;
    distance: number;
    price: number;
    pricePerKm: number;
    deliveryDate: string;
    note: string;
    paymentResponsibility: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    transaction: {
      id: string;
      clientId: string;
      date: string;
      state: string;
      notes: string;
      createdBy: string;
      parentTransactionId: string | null;
      createdAt: string;
      updatedAt: string;
    };
}

export interface LogisticResponse {
  data: LogisticData;
  meta: Meta;
}