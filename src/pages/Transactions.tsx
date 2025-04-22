import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ClientSelection } from "@/components/transactions/ClientSelection";
import { OperationForm } from "@/components/transactions/OperationForm";
import { useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Client } from "@/models";
import ValuesForm from "@/components/transactions/ValuesForm";
import { LogisticsForm } from "@/components/transactions/LogisticsForm";

const steps = [
  { id: "client", title: "Selección de Cliente" },
  { id: "operation", title: "Operación" },
  { id: "values", title: "Valores" },
  { id: "logistics", title: "Logística" },
] as const;

type Step = typeof steps[number]["id"];

export function Transactions() {
  // Hooks
  const params = useParams();
  const [searchParams] = useSearchParams();
  // States
  const [currentStep, setCurrentStep] = useState<Step>("client");
  const [currentClient, setCurrentClient] = useState<Client | undefined>();
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  // If there is an id in params, load transaction data and set step to "operation"
  useEffect(() => {
    if (params.id) {
      if (!searchParams.get("step") || searchParams.get("step") !== "values") {
        setCurrentStep("operation");
      }
      if (searchParams.get("step") === "values") {
        setCurrentStep("values");
      }
    }
  }, [params]);

  const handleClientSelection = () => {
    setCurrentStep("operation");
  };

  // Handler when the operation step is completed
  const handleOperationComplete = () => {
    // After completing operation, proceed to the values step
    setCurrentStep("values");
  };

  const handleValuesComplete = (redirectToLogistics: boolean) => {
    if (redirectToLogistics) {
      setCurrentStep("logistics");
    }
  };

  // Render component based on current step
  const renderStep = () => {
    switch (currentStep) {
      case "client":
        return (
          <ClientSelection
            onComplete={handleClientSelection}
            onClientSelected={(client) => setCurrentClient(client)}
          />
        )
      case "operation":
        return (
          <OperationForm
            clientId={currentClient?.id}
            onComplete={handleOperationComplete}
          />
        );
      case "values": {
        return (
          <ValuesForm
          onComplete={handleValuesComplete} />
        );
      }
      case "logistics":
        return (
          <LogisticsForm />
        );
      default:
        return null;
    }
  };

  const isStepAvailable = (step: Step) => {
    switch (step) {
      case "client":
        return !params.id;
      case "operation":
        return true;
      case "values":
        return params.id;
      case "logistics":
        return params.id;
      default: break;
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {currentClient ? (
            <div className="flex items-center gap-2">
              Transacción | <div className="bg-black text-white px-2 py-1 rounded-md">{currentClient.name}</div>
              <Badge variant="outline">Transacción ID: {currentClient.id}</Badge>
            </div>
          ) : (
            "Nueva Transacción"
          )}
        </h1>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {steps.map((step, index) => {
          return (
            <Card
              key={step.id}
              className={`p-4 ${
                index === currentStepIndex ? "border-primary" : ""
              } ${
                !isStepAvailable(step.id) ? "bg-muted cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => {
                if (!isStepAvailable(step.id)) return;
                setCurrentStep(step.id);
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
