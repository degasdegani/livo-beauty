// Constantes de preco de assinatura. SEM "use client" de proposito — ja
// tivemos bug no projeto de constante numerica exportada de arquivo client
// virar stub no servidor. Estas strings sao a fonte de verdade; nunca fazer
// aritmetica com elas diretamente, so converter pra Number no exato ponto de
// montar o payload pra API do Asaas.

export const PRICING = {
  founding: { monthly: "69.90", yearly: "699.90" },
  standard: { monthly: "129.90", yearly: "1299.90" },
} as const
