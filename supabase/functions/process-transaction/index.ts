import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    
    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: "Mensagem e userId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("Processando mensagem:", message);

    // Call AI to extract transaction info
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente financeiro amigável que ajuda usuários a registrar suas finanças pessoais.
            
Quando o usuário descrever uma transação financeira em linguagem natural, você deve extrair:
- type: "expense" para gastos ou "income" para receitas
- amount: valor numérico (apenas o número, sem R$)
- category: categoria apropriada (ex: "alimentação", "transporte", "lazer", "trabalho", "outros")
- description: descrição clara da transação

Use a ferramenta save_transaction para salvar a transação extraída.

Se o usuário perguntar algo sobre finanças ou pedir ajuda, responda de forma amigável e útil sem usar a ferramenta.

Exemplos de como categorizar:
- "gastei 50 no almoço" → expense, 50, alimentação
- "recebi 2000 do salário" → income, 2000, trabalho
- "paguei 30 no Uber" → expense, 30, transporte
- "comprei um livro por 45" → expense, 45, lazer`
          },
          {
            role: "user",
            content: message
          }
        ],
        tools: [
          {
            type: "function",
            name: "save_transaction",
            description: "Salva uma transação financeira (gasto ou receita)",
            parameters: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["expense", "income"],
                  description: "Tipo de transação"
                },
                amount: {
                  type: "number",
                  description: "Valor da transação"
                },
                category: {
                  type: "string",
                  description: "Categoria da transação"
                },
                description: {
                  type: "string",
                  description: "Descrição da transação"
                }
              },
              required: ["type", "amount", "category", "description"],
              additionalProperties: false
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Erro da AI:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log("Resposta da AI:", JSON.stringify(aiResult, null, 2));

    const choice = aiResult.choices?.[0];
    
    // Check if AI used the tool
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log("Argumentos extraídos:", args);

      // Save transaction to database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: args.type,
          amount: args.amount,
          category: args.category,
          description: args.description,
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao salvar transação:", error);
        return new Response(
          JSON.stringify({ error: "Erro ao salvar transação" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Transação salva:", data);

      const responseMessage = args.type === "expense" 
        ? `Registrado! Você gastou R$ ${args.amount.toFixed(2)} em ${args.category}. ${args.description}`
        : `Ótimo! Receita de R$ ${args.amount.toFixed(2)} em ${args.category} registrada. ${args.description}`;

      return new Response(
        JSON.stringify({
          message: responseMessage,
          transaction: data,
          isTransaction: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no tool was used, return AI's message
    const assistantMessage = choice?.message?.content || "Desculpe, não entendi. Você pode descrever uma transação financeira?";
    
    return new Response(
      JSON.stringify({
        message: assistantMessage,
        isTransaction: false
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro no edge function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});