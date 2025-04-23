export interface Audit {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    changedData: {
      url: string;
      method: string;
      request: Record<string, any>;
      response: Record<string, any>;
    };
    changedBy: string;
    changedAt: string;
    changedByUser: {
      username: string;
      email: string;
      role: string;
    };
  }
  
  export interface AuditResponse {
    data: Audit[];
    meta: {
      status: number;
      message: string;
      timestamp: string;
      path: string;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
  }