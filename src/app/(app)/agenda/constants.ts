// Janela fixa de exibicao 06:00-24:00 (1440min = fim do dia corrente, NAO
// meia-noite do dia seguinte — cuidado ao reusar este valor em contas de
// data/hora). O model BusinessHours ja existe no schema mas ainda nao tem
// tela de configuracao — quando existir, este intervalo deve passar a ser
// lido de la (por dia da semana), em vez de fixo aqui.
//
// IMPORTANTE: este arquivo NAO pode ter "use client" nem ser reexportado por
// um arquivo que tenha — page.tsx (Server Component) importa estas
// constantes diretamente. Exports de um modulo "use client" viram
// referencias opacas do lado do servidor (mesmo constantes simples), o que
// já causou um bug real aqui: Math.max/Math.min com essas "referencias"
// retornava NaN, fazendo todo agendamento ser filtrado da grade
// silenciosamente (duration NaN > 0 é sempre false).
export const AGENDA_WINDOW_START_MINUTES = 6 * 60
export const AGENDA_WINDOW_END_MINUTES = 24 * 60
