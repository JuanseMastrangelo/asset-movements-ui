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