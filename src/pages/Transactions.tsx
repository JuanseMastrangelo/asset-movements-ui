import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ClientSelection } from "@/components/transactions/ClientSelection";
import { OperationForm } from "@/components/transactions/OperationForm";
import { LogisticsForm } from "@/components/transactions/LogisticsForm";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { transactionsService } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/models/transaction";
import { Client } from "@/models";
import ValuesForm from "@/components/transactions/ValuesForm";

const steps = [
  { id: "client", title: "Selección de Cliente" },
  { id: "operation", title: "Operación" },
  { id: "values", title: "Valores" },
  { id: "logistics", title: "Logística" },
] as const;

type Step = typeof steps[number]["id"];

export function Transactions() {
  const params = useParams();
  const [currentStep, setCurrentStep] = useState<Step>("client");
  const [transactionData, setTransactionData] = useState<Partial<Transaction> | undefined>();

  // Fetch transaction details if an id exists
  const { data: transactionDetails, refetch: refetchTransactionDetails } = useQuery({
    queryKey: ["transaction", params.id],
    queryFn: async () => {
      if (!params.id) throw new Error("No transaction ID provided");
      return transactionsService.getOne(params.id);
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!params.id,
  });

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  // If there is an id in params, load transaction data and set step to "operation"
  useEffect(() => {
    if (params.id) {
      getTransactionData();
    }
  }, [params]);

  const getTransactionData = async () => {
    const response = await refetchTransactionDetails();
    setTransactionData(response.data);
    setCurrentStep("operation");
  };

  // Handler when a client is selected (step 1)
  const handleClientSelection = (clientData: Client) => {
    setTransactionData((prev) => ({ ...prev, clientId: clientData.id }));
    setCurrentStep("operation");
  };

  // Handler when the operation step is completed
  const handleOperationComplete = (operationData: any) => {
    // After completing operation, proceed to the values step
    setCurrentStep("values");
  };

  // Handler when logistics step is completed (si es necesario)
  const handleLogisticsComplete = (logisticsData: any) => {
    // Lógica para finalizar logística si fuera necesaria
  };

  // Render component based on current step
  const renderStep = () => {
    switch (currentStep) {
      case "client":
        return <ClientSelection onComplete={handleClientSelection} />;
      case "operation":
        return (
          <OperationForm
            onComplete={handleOperationComplete}
            initialData={transactionData!}
          />
        );
      case "values": {
        // Extract allowed totals from the transaction details (from step 2)
        const incomeDetail = transactionData?.details?.find(
          (detail) => detail.movementType === "INCOME"
        );
        const expenseDetail = transactionData?.details?.find(
          (detail) => detail.movementType === "EXPENSE"
        );
        const allowedIngressTotal = incomeDetail ? incomeDetail.amount : 0;
        const allowedEgressTotal = expenseDetail ? expenseDetail.amount : 0;

        return (
          <ValuesForm
            transactionId={transactionData!.id!}
            allowedIngressTotal={allowedIngressTotal}
            allowedEgressTotal={allowedEgressTotal}
          />
        );
      }
      case "logistics":
        // return (
        //   <LogisticsForm
        //     onComplete={handleLogisticsComplete}
        //     transactionId={transactionData!.id!}
        //   />
        // );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {transactionDetails ? (
            <div className="flex items-center gap-2">
              Transacción{" "}
              <Badge variant="secondary">
                {transactionDetails.client.name}
              </Badge>{" "}
              <Badge variant="outline">{transactionDetails.id}</Badge>
            </div>
          ) : (
            "Nueva Transacción"
          )}
        </h1>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {steps.map((step, index) => {
          const isClientStep = step.id === "client";
          const isClientLocked = transactionData && transactionData.id && isClientStep;
          return (
            <Card
              key={step.id}
              className={`p-4 ${
                index === currentStepIndex ? "border-primary" : ""
              } ${
                isClientLocked ? "bg-muted cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => {
                // If the client step is locked, do nothing
                if (isClientLocked) return;
                if (transactionData) setCurrentStep(step.id);
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index < currentStepIndex
                      ? "bg-primary/20 text-primary"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{step.title}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">{renderStep()}</Card>
    </div>
  );
}
