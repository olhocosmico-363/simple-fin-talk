import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card } from "./ui/card";

interface FinanceSummaryProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const FinanceSummary = ({ totalIncome, totalExpense, balance }: FinanceSummaryProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="p-6 bg-gradient-card border-border/50 shadow-soft hover:shadow-glow transition-all duration-300">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Receitas</h3>
        </div>
        <p className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</p>
      </Card>

      <Card className="p-6 bg-gradient-card border-border/50 shadow-soft hover:shadow-glow transition-all duration-300">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-destructive/10">
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Gastos</h3>
        </div>
        <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</p>
      </Card>

      <Card className="p-6 bg-gradient-card border-border/50 shadow-soft hover:shadow-glow transition-all duration-300">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-accent/10">
            <Wallet className="h-5 w-5 text-accent" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Saldo</h3>
        </div>
        <p className={`text-2xl font-bold ${balance >= 0 ? "text-accent" : "text-destructive"}`}>
          {formatCurrency(balance)}
        </p>
      </Card>
    </div>
  );
};