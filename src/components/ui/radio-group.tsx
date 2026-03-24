import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (val: string) => void
}>({})

const RadioGroup = React.forwardRef<HTMLDivElement, any>(
  ({ className, onValueChange, defaultValue, children, ...props }, ref) => {
    const [value, setValue] = React.useState(defaultValue)

    const handleValueChange = (val: string) => {
      setValue(val)
      if (onValueChange) onValueChange(val)
    }

    return (
      <RadioGroupContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div className={cn("grid gap-2", className)} {...props} ref={ref}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<HTMLInputElement, any>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)

    return (
      <input
        type="radio"
        ref={ref}
        value={value}
        checked={context.value === value}
        onChange={() => context.onValueChange?.(value)}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
