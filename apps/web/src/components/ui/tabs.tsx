"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within <Tabs>`);
  }
  return context;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(
    defaultValue ?? "",
  );
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: activeValue, setValue }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const context = useTabsContext("TabsTrigger");
  const isActive = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => context.setValue(value)}
      className={cn(
        "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        isActive
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const context = useTabsContext("TabsContent");
  if (context.value !== value) return null;

  return (
    <div role="tabpanel" className={cn("mt-3", className)}>
      {children}
    </div>
  );
}
