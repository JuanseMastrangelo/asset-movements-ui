interface TransactionDetail {
  id: string;
  transactionId: string;
  assetId: string;
  movementType: "INCOME" | "EXPENSE";
  amount: number;
  percentageDifference: number | null;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
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

export interface Transaction {
  id: string;
  clientId: string;
  date: string;
  state: "PENDING" | "COMPLETED" | "CANCELLED";
  notes: string;
  createdBy: string;
  parentTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  details: TransactionDetail[];
  client: Client;
  clientBalances: any[];
  childTransactions: any[];
  parentTransaction: any | null;
  logistics: any | null;
}

interface Meta {
  status: number;
  message: string;
  timestamp: string;
  path: string;
}

export interface TransactionResponse {
  data: Transaction;
  meta: Meta;
}