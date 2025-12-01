import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { FinanceSummary } from "@/components/FinanceSummary";
import { TransactionList } from "@/components/TransactionList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Wallet } from "lucide-react";
import type { User, Session } from "@supabase/supabase-js";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isTransaction?: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      
      // Set up realtime subscription
      const channel = supabase
        .channel("transactions-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar transações:", error);
      return;
    }

    setTransactions(data || []);

    const income = data?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const expense = data?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    setTotalIncome(income);
    setTotalExpense(expense);
  };

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-transaction", {
        body: { message: text, userId: user.id },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        isUser: false,
        isTransaction: data.isTransaction,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.isTransaction) {
        fetchTransactions();
      }
    } catch (error: any) {
      console.error("Erro ao processar mensagem:", error);
      toast.error(error.message || "Erro ao processar mensagem");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, houve um erro ao processar sua mensagem. Tente novamente.",
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-gradient-card border-b border-border/50 shadow-soft backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Wallet className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  MinhasFinanças
                </h1>
                <p className="text-xs text-muted-foreground">Seu assistente financeiro inteligente</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <FinanceSummary
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={totalIncome - totalExpense}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-card border-border/50 shadow-soft flex flex-col h-[600px]">
            <h2 className="text-lg font-semibold mb-4 text-foreground">💬 Conversar</h2>
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-sm">
                    <p className="text-muted-foreground mb-2">
                      👋 Olá! Sou seu assistente financeiro.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Conte-me sobre seus gastos e receitas em linguagem natural. Por exemplo:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-3 space-y-1 text-left">
                      <li>• "Gastei 50 no almoço"</li>
                      <li>• "Recebi 2000 do salário"</li>
                      <li>• "Paguei 30 no Uber"</li>
                    </ul>
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isUser={message.isUser}
                  isTransaction={message.isTransaction}
                />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card rounded-2xl px-4 py-3 shadow-soft">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput onSend={handleSendMessage} disabled={loading} />
          </Card>

          <Card className="p-6 bg-gradient-card border-border/50 shadow-soft h-[600px] flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-foreground">📊 Transações Recentes</h2>
            <div className="flex-1 overflow-y-auto">
              <TransactionList transactions={transactions} />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;