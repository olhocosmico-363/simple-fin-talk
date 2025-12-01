import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export const TransactionList = ({ transactions }: TransactionListProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM", { locale: ptBR });
  };

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-card border-border/50">
        <p className="text-muted-foreground">Nenhuma transação registrada ainda.</p>
        <p className="text-sm text-muted-foreground mt-1">Comece conversando no chat acima!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <Card
          key={transaction.id}
          className="p-4 bg-gradient-card border-border/50 shadow-soft hover:shadow-glow transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`p-2 rounded-xl ${
                  transaction.type === "income" ? "bg-primary/10" : "bg-destructive/10"
                }`}
              >
                {transaction.type === "income" ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{transaction.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
                </div>
              </div>
            </div>
            <p
              className={`text-lg font-bold ${
                transaction.type === "income" ? "text-primary" : "text-destructive"
              }`}
            >
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
};