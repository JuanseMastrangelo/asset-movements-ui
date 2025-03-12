import { useToast } from "@/components/ui/use-toast";
import { Toast, ToastTitle, ToastDescription, ToastAction } from "@/components/ui/toast";

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          open={toast.open}
          onOpenChange={(open) => {
            if (!open) dismiss(toast.id);
          }}
          className="max-w-sm rounded-md border p-4 shadow-lg"
        >
          {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
          {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
          {toast.action && <ToastAction altText="test" asChild>{toast.action}</ToastAction>}
        </Toast>
      ))}
    </div>
  );
}
