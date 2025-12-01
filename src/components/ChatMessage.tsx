import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  isTransaction?: boolean;
}

export const ChatMessage = ({ message, isUser, isTransaction }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-soft",
          isUser
            ? "bg-gradient-primary text-primary-foreground"
            : isTransaction
            ? "bg-gradient-accent text-accent-foreground"
            : "bg-card text-card-foreground"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
};