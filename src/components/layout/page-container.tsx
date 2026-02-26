import { cn } from "@/lib/utils/cn";

interface PageContainerProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function PageContainer({ title, children, className, action }: PageContainerProps) {
  return (
    <div className={cn("px-6 py-6", className)}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
