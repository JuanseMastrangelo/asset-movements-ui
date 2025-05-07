import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "bg-red-600/10 dark:bg-red-600/20 hover:bg-red-600/10 text-red-500 shadow-none rounded-full",
        outline: "text-foreground",
        border: "text-foreground border",
        primary: "border-transparent bg-blue-500 text-white shadow hover:bg-blue-600",
        warning: "bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full",
        success: "bg-emerald-600/10 dark:bg-emerald-600/20 hover:bg-emerald-600/10 text-emerald-500 shadow-none rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      <div
        className={`h-1.5 w-1.5 rounded-full mr-2 ${
          variant === "primary"
            ? "bg-blue-500"
            : variant === "warning"
            ? "rounded-full bg-amber-500"
            : variant === "success"
            ? "rounded-full bg-emerald-500"
            : variant === "destructive"
            ? "rounded-full bg-red-500"
            : "bg-gray-500"
        }`}
      />
      {props.children}
    </div>
  )
}

export { Badge, badgeVariants } 