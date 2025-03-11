import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ClientSelection } from "@/components/transactions/ClientSelection";
import { OperationForm } from "@/components/transactions/OperationForm";
import { ValuesForm } from "@/components/transactions/ValuesForm";
import { LogisticsForm } from "@/components/transactions/LogisticsForm";

const steps = [
  { id: "client", title: "Selección de Cliente" },
  { id: "operation", title: "Operación" },
  { id: "values", title: "Valores" },
  { id: "logistics", title: "Logística" },
] as const;

type Step = typeof steps[number]["id"];

interface TransactionData {
  clientId?: string;
  operation?: any;
  values?: any;
  logistics?: any;
  transactionId?: string;
}

export function Transactions() {
  const [currentStep, setCurrentStep] = useState<Step>("client");
  const [data, setData] = useState<TransactionData>({});

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleClientSelection = (clientData: any) => {
    setData(prev => ({ ...prev, clientId: clientData.id }));
    setCurrentStep("operation");
  };

  const handleOperationComplete = (operationData: any) => {
    setData(prev => ({ ...prev, operation: operationData }));
    setCurrentStep("values");
  };

  const handleValuesComplete = (valuesData: any) => {
    setData(prev => ({ ...prev, values: valuesData }));
    setCurrentStep("logistics");
  };

  const handleLogisticsComplete = (logisticsData: any) => {
    setData(prev => ({ ...prev, logistics: logisticsData }));
    // La transacción se cierra automáticamente en el último paso
  };

  const renderStep = () => {
    switch (currentStep) {
      case "client":
        return (
          <ClientSelection
            onComplete={handleClientSelection}
            initialData={data.clientId ? { id: data.clientId } : undefined}
          />
        );
      case "operation":
        return (
          <OperationForm
            onComplete={handleOperationComplete}
            initialData={data.operation}
            clientId={data.clientId!}
          />
        );
      case "values":
        return (
          <ValuesForm
            onComplete={handleValuesComplete}
            initialData={data.values}
            transactionId={data.transactionId!}
          />
        );
      case "logistics":
        return (
          <LogisticsForm
            onComplete={handleLogisticsComplete}
            initialData={data.logistics}
            transactionId={data.transactionId!}
          />
        );
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Nueva Transacción</h1>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {steps.map((step, index) => (
          <Card
            key={step.id}
            className={`p-4 ${
              index === currentStepIndex
                ? "border-primary"
                : index < currentStepIndex
                ? "bg-muted"
                : ""
            }`}
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
        ))}
      </div>

      <Card className="p-6">
        {renderStep()}
      </Card>
    </div>
  );
} 