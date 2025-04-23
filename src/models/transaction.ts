import { Asset } from "./asset";
import { Denomination } from "./denomination";

interface BillDetail {
  id: string;
  denominationId: string;
  quantity: number;
  receivedDate: string;
  createdAt: string;
  denomination: Denomination;
}

export interface TransactionDetail {
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
  asset: Asset | {
    id: string;
    name: string;
    isImmutable: boolean;
    description?: string;
  };
  billDetails: BillDetail[];
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

interface ChildTransaction {
  id: string;
  state: "PENDING" | "CURRENT_ACCOUNT" | "COMPLETED" | "CANCELLED";
  date: string;
  notes: string;
  details: {
    assetId: string;
    movementType: "INCOME" | "EXPENSE";
    amount: number;
    notes: string | null;
    id: string;
  }[];
}

export interface Transaction {
  id: string;
  clientId: string;
  date: string;
  state: "PENDING" | "CURRENT_ACCOUNT" | "COMPLETED" | "CANCELLED";
  notes: string;
  createdBy: string;
  parentTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  details: TransactionDetail[];
  client: Client;
  clientBalances: any[];
  childTransactions: ChildTransaction[];
  parentTransaction: any | null;
  logistics: any | null;
}

interface Meta {
  status: number;
  message: string;
  timestamp: string;
  path: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionResponse {
  data: Transaction;
  meta: Meta;
}
export interface TransactionSearchResponse {
  data: Transaction[] ;
  meta: Meta & { pagination: Pagination };
}

export interface Conciliation {
  id: string;
  clientId: string;
  date: string;
  state: "PENDING" | "CURRENT_ACCOUNT" | "COMPLETED" | "CANCELLED";
  notes: string;
  createdBy: string;
  parentTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  };
  details: {
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
    asset: {
      id: string;
      name: string;
      isImmutable: boolean;
    };
    billDetails: any[];
  }[];
  createdByUser: {
    id: string;
    username: string;
  };
}

export interface ConciliationResponse {
  data: {
    transactions: Conciliation[];
    immutableAssets: {
      id: string;
      name: string;
      isImmutable: boolean;
    }[];
  };
  meta: Meta;
}

export interface ConciliationRequest {
  clientTransactions: {
    clientId: string;
    assetId: string;
    movementType: "INCOME" | "EXPENSE";
    amount: number;
    notes: string;
  }[];
  notes: string;
}