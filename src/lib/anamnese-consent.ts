/**
 * Texto de consentimento exibido ao salvar a ficha de anamnese. Consentimento
 * e pedido em TODO salvamento (criacao ou edicao) — decisao de produto ja
 * fechada, nao tenta diferenciar mudanca relevante de trivial. O texto exato
 * exibido em cada salvamento e gravado como snapshot em AnamneseConsent.consentText,
 * por isso esta funcao precisa continuar determinística para o mesmo businessName.
 */
export function buildAnamneseConsentText(businessName: string): string {
  return `Ao salvar esta ficha, você autoriza que ${businessName} registre e armazene seus dados de saúde relacionados a este atendimento: alergias, medicamentos em uso, condições de saúde, procedimentos estéticos anteriores e contraindicações.

Esses dados são usados exclusivamente para avaliar a segurança e a adequação dos procedimentos estéticos realizados aqui, evitando reações ou complicações.

Você pode revogar essa autorização a qualquer momento, solicitando a exclusão dos seus dados diretamente a ${businessName}.`
}
