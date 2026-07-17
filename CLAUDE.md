# CLAUDE.md — LIVO Beauty

Este arquivo é lido automaticamente pelo Claude Code sempre que este projeto for aberto.
Ele define o contexto, a filosofia e as regras de trabalho do LIVO Beauty.

---

## O QUE É O LIVO BEAUTY

Segunda vertical do ecossistema LIVO. Plataforma SaaS para **salões de beleza e clínicas
de estética**, com equipe em regime de parceria (não CLT).

**Sistema separado do LIVO Barber** (já em produção em livobarber.com.br) — repositório
de código próprio, banco de dados próprio, deploy próprio. Não compartilha nada
tecnicamente com o Barber por enquanto. A unificação futura do ecossistema (mesmo banco,
`VerticalType` compartilhado) é objetivo de longo prazo, não requisito de lançamento.

**Founder:** Eduardo Degani — solo dev/CPO/CTO. Claude atua como arquiteto técnico e de
produto, tomando decisões com racional declarado, escalando apenas decisões de negócio
genuínas (não decisões técnicas que já são de escopo do Claude).

**Contexto de urgência:** founder está sem renda há meses, precisa lançar rápido e gerar
receita. Toda decisão de escopo deve favorecer velocidade de lançamento sobre construção
de especificação completa. Ver seção "MVP — Escopo Fechado" abaixo.

---

## FILOSOFIA DE PRODUTO

O LIVO Beauty não deve parecer um ERP nem um sistema de gestão tradicional. Deve parecer
uma plataforma SaaS premium (referência: Stripe, Linear, Notion, Calendly).

**Regra de ouro para esta fase:** qualidade visual alta desde o primeiro pixel, mas
**quantidade de funcionalidade reduzida** ao essencial do MVP. Não é "fazer feio para ser
rápido" — é "fazer poucos módulos, mas cada um bem feito", usando os design tokens certos
desde o início (evita retrabalho — já aconteceu no Barber por pular essa disciplina).

Módulos fora do MVP (CRM avançado com IA preditiva, Campanhas de marketing automatizadas,
Score de retenção, etc.) ficam documentados no `LIVO_BEAUTY_DESIGN_SYSTEM.md` como visão
de longo prazo, mas não entram nesta fase.

---

## MVP — ESCOPO FECHADO

Módulos, na ordem de construção (cada um depende do anterior):

1. **Fundação** — schema do banco (multi-tenant), autenticação, tokens de design
   (cores, tipografia, componentes base: Botão, Card, Input, Badge)
2. **Profissionais + Serviços** — pré-requisito da Agenda
3. **Agenda** — módulo mais visado do design system (referência Google Calendar/Calendly).
   Inclui, desde o desenho do schema:
   - **WhatsApp automatizado para cliente final** (confirmação, lembrete, aviso de falta)
     — reaproveitar o padrão já validado no LIVO Barber (`sanitizePhone`/`buildWhatsappUrl`,
     link `wa.me` com mensagem pronta, sem custo de infraestrutura nova)
   - **PWA + notificação push para o profissional/staff** — avisar automaticamente
     "daqui a 30 minutos tem cliente". Requer: manifest PWA instalável, Web Push API
     (chaves VAPID, Service Worker, tabela de inscrições de push por profissional) e um
     job agendado (cron) checando agendamentos próximos. Depende da Agenda existir antes.
4. **Clientes** — cadastro + histórico de atendimento
5. **Produtos/Estoque**:
   - Campo "disponível para venda" (sim/não) — produto pode ser só consumo interno
     (ex: esmalte usado no atendimento) ou também vendável (ex: shampoo no balcão)
   - **Fornecedores como cadastro próprio** (nome, WhatsApp), em relação N:N com produtos
     (um produto pode ter vários fornecedores; um fornecedor atende vários produtos)
   - Cada vínculo produto-fornecedor pode ter preço de custo específico e marcação de
     "fornecedor principal"
   - Estoque mínimo de alerta por produto — quando atingido, botão "Avisar fornecedor"
     abre WhatsApp com mensagem pronta (mesmo padrão wa.me); se houver mais de um
     fornecedor cadastrado, mostra opção de escolha antes de abrir
6. **Financeiro** — fechamento de caixa, comissões
7. **Relatórios** — versão enxuta: Faturamento, Comissões, Clientes (expansível depois,
   não construir "completo" agora)
8. **Configurações**
9. **Prontuário/Anamnese** — módulo **opcional, ligável por tipo de negócio** nas
   Configurações. Um salão que só faz corte/escova não precisa ativar; uma clínica que
   faz procedimento estético (botox, peeling) ativa e usa. Dado sensível de saúde sob
   LGPD — exige desenho de consentimento específico (não é "aceite genérico de termos"),
   controle de acesso granular, armazenamento seguro de fotos de evolução (diferente do
   armazenamento público usado para foto de capa/logo), trilha de auditoria de acesso.
   Não subestimar esse módulo só porque está no fim da fila — é tecnicamente sensível.
10. **Dashboard** — construído por último de propósito: é o resumo de dados gerados
    pelos outros módulos (KPIs, gráficos). Não faz sentido antes de existir dado real
    circulando no sistema.

**Fora de escopo do MVP, decisão consciente:**
- **Split de pagamento via Asaas** — exige CNPJ (mínimo MEI) de cada profissional
  parceira e aprovação individual de compliance por subconta; trava velocidade de
  lançamento. Revisar quando o produto estiver validado.
- **Z-API (WhatsApp automatizado de verdade, sem clique manual)** — até lá, usar padrão
  `wa.me` com link e mensagem pré-preenchida, clique manual do usuário.
- **Nutricionista/psicóloga/fisioterapeuta** — ficam reservados para o futuro **LIVO
  Saúde**, vertical separada (modelo de negócio diferente: sessão recorrente, sem
  produto físico, regras de conselho profissional). Estética fica no Beauty, não no
  Saúde — decisão já fechada.

---

## DESIGN SYSTEM

Fonte de verdade completa: `docs/LIVO_BEAUTY_DESIGN_SYSTEM.md` (documento técnico
convertido do `.docx` original) e `design_beauty.png` (mockup de referência do Dashboard).

Resumo rápido dos tokens principais:

**Cores**
- Background principal: `#F8FAFC` (nunca branco puro)
- Surface (cards, inputs, modais): `#FFFFFF`
- Border: `#E7ECF3`
- Primary (marca): `#7C6CF6` — usar com moderação, é "joia da interface", não cor de fundo
- Primary Hover: `#6B5AF0`
- Primary Light: `#F3F0FF`
- Accent (confirmações, IA): `#3DD6C1`
- Success: `#10B981` · Warning: `#F59E0B` · Error: `#EF4444`
- Text Primary: `#111827` (nunca preto absoluto) · Secondary: `#4B5563` · Muted: `#94A3B8`

**Tipografia:** Satoshi (fallback: General Sans → Inter → SF Pro Display). Escala de
Display XL (64px) até Micro (11px) — ver documento completo para tabela integral.
Preferência por peso Medium; Bold só em momentos importantes.

**Grid:** 12 colunas, container máx. 1600px, largura confortável 1440px, gutters 32px,
margens 40px. Espaçamento sempre múltiplo de 4.

**Ícones:** Lucide, stroke 1.75, nunca preenchidos.

**Princípio geral:** minimalismo sofisticado, sem decoração gratuita, toda sombra é sutil
(nunca chama atenção, só separa planos), toda animação entre 120-220ms com
`easeOutCubic`, loading sempre skeleton (nunca spinner).

---

## STACK TÉCNICO

Next.js · React · TypeScript · Tailwind · Shadcn UI · TanStack Query · TanStack Table ·
Framer Motion · GSAP · Zustand · React Hook Form · Zod · Recharts · React Aria · Lucide ·
Sonner · CMDK

Stack deliberadamente mais robusto que o LIVO Barber (que usa componentes próprios mais
simples) — aqui usamos bibliotecas prontas de UI/estado para acelerar construção mantendo
qualidade alta.

---

## DISCIPLINA DE ENGENHARIA (herdada do LIVO Barber, mesmo padrão)

- **Branch de feature sempre.** Nunca commit direto em `main`. Fluxo:
  branch → preview → validação → merge `--no-ff`.
- **`npx tsc --noEmit` limpo antes de qualquer commit.**
- **`git add` de arquivos específicos**, nunca `git add .`.
- **Confirmar `git branch --show-current`** antes de qualquer commit, especialmente após
  operações de merge (já causou erro de commit acidental em `main` no projeto Barber —
  lição aprendida, aplicar aqui desde o início).
- **Comandos PowerShell um de cada vez**, em bloco copiável, sempre especificando se é
  PowerShell ou Claude Code.
- **Diagnóstico antes de código.** Nunca escrever código sem antes checar o que já existe
  (schema, componentes, convenções já estabelecidas no próprio projeto Beauty conforme
  ele for crescendo).
- **ADR físico em `docs/adr/`** para toda decisão de arquitetura relevante, mesmo padrão
  do Barber.
- **Sem emoji cru em `.ts`/`.tsx`** (mesmo problema de corrupção de encoding no Windows
  que já ocorreu no Barber — usar ícone Lucide ou `\u{XXXX}` quando necessário em texto
  enviado ao cliente).

---

## COMUNICAÇÃO

- Direto, sem jargão sem explicação prévia.
- Explicações técnicas com exemplo concreto antes da execução, quando o founder pedir
  ("explica simplificado").
- Founder é solo — Claude assume papel de CTO/CPO, toma decisão técnica com racional
  declarado, só escala decisão de negócio genuína.
- Sessões podem ser longas — ao fechar cada módulo/feature, resumir o que foi entregue
  antes de seguir para o próximo, mesmo padrão de disciplina usado no LIVO Barber.

---

FIM DO DOCUMENTO
