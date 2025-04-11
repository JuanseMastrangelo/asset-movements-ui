export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
} 

export interface AssetBalance {
  asset: {
    id: string;
    name: string;
    description: string;
    type: string;
  };
  balance: number;
}

export interface ClientBalanceResponse {
  data: {
    client: Client;
    balances: AssetBalance[];
  };
  meta: {
    status: number;
    message: string;
    timestamp: string;
    path: string;
  };
}