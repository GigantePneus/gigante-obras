
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Expense } from "../types";

// Inicializa a API com a chave do ambiente
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

// Modelo para análise de texto
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
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
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export async function getFinancialInsights(expenses: Expense[]) {
  if (!apiKey) {
    console.error('❌ Chave de API da IA não configurada');
    return "Erro: Chave de API da IA não encontrada. Configure VITE_GEMINI_API_KEY no arquivo .env";
  }

  if (!expenses || expenses.length === 0) {
    return "Não há gastos registrados para análise.";
  }

  console.log('🤖 Gerando insights para', expenses.length, 'gastos...');

  const summary = expenses.slice(0, 50).map(e => ({
    d: e.description,
    v: e.amount,
    c: e.categoryId,
    p: e.projectId,
    dt: e.date
  }));

  const prompt = `Analise estes gastos de obra (JSON simplificado: d=descrição, v=valor, c=id_categoria, p=id_projeto, dt=data): 
${JSON.stringify(summary)}

Forneça uma análise CURTA (máximo 5 linhas) focando em:
1. Total gasto e principais categorias
2. Tendências ou padrões identificados
3. Pontos de atenção ou alertas`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const insight = response.text();
    console.log('✅ Insight gerado com sucesso');
    return insight;
  } catch (error) {
    console.error("❌ Erro ao gerar insight:", error);
    return "Não foi possível gerar a análise no momento. Verifique sua conexão e tente novamente.";
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
    console.log('🔍 Iniciando análise de recibo...', imageFile.name, imageFile.type);

    const imagePart = await fileToGenerativePart(imageFile);

    // Prompt melhorado para extração mais precisa
    const currentYear = new Date().getFullYear();
    const prompt = `Você é um assistente especializado em extrair informações de notas fiscais e comprovantes.

Analise a imagem fornecida e extraia as seguintes informações:
1. Valor total da compra (amount) - retorne apenas o número decimal, sem símbolo de moeda
2. Data da compra (date) - formato YYYY-MM-DD (se não houver ano visível, use ${currentYear})
3. Descrição curta do que foi comprado (description) - máximo 50 caracteres, seja específico

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem markdown, sem explicações, apenas o JSON puro no formato:
{"amount": 0.00, "date": "YYYY-MM-DD", "description": "texto"}`;

    const result = await visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('📄 Resposta bruta da IA:', text);

    // Limpar markdown e extrair JSON
    let jsonStr = text.trim();
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    jsonStr = jsonStr.trim();

    console.log('🧹 JSON limpo:', jsonStr);

    const parsed = JSON.parse(jsonStr);
    console.log('✅ Dados extraídos com sucesso:', parsed);

    // Validar estrutura
    if (!parsed.amount || !parsed.date || !parsed.description) {
      throw new Error('Dados incompletos extraídos da nota fiscal');
    }

    return parsed;
  } catch (error) {
    console.error('❌ Erro detalhado ao analisar recibo:', error);
    throw new Error('Não foi possível ler a nota fiscal. Verifique se a imagem está nítida e tente novamente.');
  }
};
