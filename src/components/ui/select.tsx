import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

const Select = ({ children, onValueChange, ...props }: any) => {
  return React.cloneElement(children[0], { onValueChange, ...props })
}

const SelectTrigger = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </div>
  )
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, ...props }: any) => {
  return <span className="pointer-events-none">{placeholder}</span>
}

const SelectContent = ({ children }: any) => {
  return <div className="hidden peer-focus:block">{children}</div>
}

const SelectItem = ({ children, value }: any) => {
  return <option value={value}>{children}</option>
}

// Para o MVP, vamos simplificar o Select e usar o padrão HTML mais robusto
const SimpleSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)
SimpleSelect.displayName = "SimpleSelect"

export { SimpleSelect as Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
