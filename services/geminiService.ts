
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Expense } from "../types";

// Inicializa a API com a chave do ambiente
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

// Modelo para análise de texto
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `
  ASSISTENTE DE IA PARA ANÁLISES FINANCEIRAS BÁSICAS - GIGANTE PNEUS (EQUIPE DE OBRAS)

  Função: Interpretar gastos da equipe de obras.

  Objetivo:
  1. Resumo rápido dos gastos.
  2. Identificar se há desvios ou aumentos.
  3. Pontos de atenção.

  Diretrizes:
  - Respostas CURTAS (max 5 linhas).
  - Direto ao ponto.
  - Sem "gordura" ou texto desnecessário.
  - Foque nos números e categorias que mais gastaram.
  `
});

// Modelo genérico para visão (sem instrução de sistema restrita)
const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function getFinancialInsights(expenses: Expense[]) {
  if (!apiKey) {
    return "Erro: Chave de API da IA não encontrada.";
  }

  const summary = expenses.slice(0, 50).map(e => ({
    d: e.description,
    v: e.amount,
    c: e.categoryId,
    p: e.projectId
  }));

  const prompt = `Analise estes dados (JSON simplificado: d=descrição, v=valor, c=id_categoria, p=id_projeto): ${JSON.stringify(summary)}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro na IA:", error);
    return "Não foi possível gerar a análise no momento.";
  }
}

// Helper to convert File to Base64 for Gemini
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const analyzeReceipt = async (imageFile: File) => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);

    // Configura o prompt para retornar JSON
    const prompt = `Analise este comprovante/nota fiscal. Extraia:
    1. O valor total (amount) como number.
    2. A data (date) no formato YYYY-MM-DD. Se não houver ano, assuma o ano atual.
    3. Uma descrição curta (description) do que foi comprado (ex: "Combustível", "Material Elétrico").
    
    Retorne APENAS um objeto JSON neste formato, sem markdown:
    { "amount": 0.00, "date": "YYYY-MM-DD", "description": "Texto" }`;

    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Limpar markdown se houver (ex: \`\`\`json ... \`\`\`)
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro ao ler nota fiscal:", error);
    throw error;
  }
};
