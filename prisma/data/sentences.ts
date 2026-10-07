/**
 * Frases de consolidação escritas manualmente para as lições que ainda não
 * tinham frase (níveis B2, C1 e C2).
 *
 * Cada frase usa TODAS as 10 palavras da lição. A chave é o nível + a ordem
 * da lição dentro do nível, que é o que o seed conhece antes de criar as
 * lições no banco.
 *
 * IMPORTANTE: o seed só grava estas frases quando a lição ainda não tem
 * frase cadastrada — edições feitas pelo admin no painel são preservadas.
 */

export type ManualSentenceSeed = {
  levelCode: string;
  orderInLevel: number;
  sentenceEn: string;
  sentencePt: string;
};

export const MANUAL_SENTENCES: ManualSentenceSeed[] = [
  // ---------------------------------------------------------------- B2
  {
    levelCode: "B2",
    orderInLevel: 1,
    sentenceEn:
      "To pursue a better position, I had to acknowledge my own limits, assume new responsibilities, emphasize results, highlight what I could enhance, address the problems that seemed to undermine the team, and overcome every obstacle.",
    sentencePt:
      "Para perseguir uma posição melhor, eu tive que reconhecer meus próprios limites, presumir novas responsabilidades, enfatizar resultados, destacar o que eu poderia aprimorar, abordar os problemas que pareciam enfraquecer a equipe e superar cada obstáculo.",
  },
  {
    levelCode: "B2",
    orderInLevel: 2,
    sentenceEn:
      "The insight from the new approach gave us a framework to deal with each constraint and trade-off, and the outcome had a real impact on the scope, on every stakeholder and on the company's revenue.",
    sentencePt:
      "A percepção trazida pela nova abordagem nos deu uma estrutura para lidar com cada restrição e troca, e o resultado teve um impacto real no escopo, em cada parte interessada e na receita da empresa.",
  },
  {
    levelCode: "B2",
    orderInLevel: 3,
    sentenceEn:
      "We need to assess whether it is feasible to allocate more budget to mitigate the risks, leverage the data we already have, streamline the process and keep the results reliable, thorough, consistent and never ambiguous.",
    sentencePt:
      "Precisamos avaliar se é viável alocar mais orçamento para mitigar os riscos, alavancar os dados que já temos, otimizar o processo e manter os resultados confiáveis, minuciosos, consistentes e nunca ambíguos.",
  },
  {
    levelCode: "B2",
    orderInLevel: 4,
    sentenceEn:
      "The new clause forces the supplier to comply with every rule, to enforce the warranty and to avoid any breach or undisclosed liability, and if there is a disclosure problem, we will dispute the terms and settle the case out of court.",
    sentencePt:
      "A nova cláusula obriga o fornecedor a cumprir cada regra, a fazer cumprir a garantia e a evitar qualquer violação ou responsabilidade não divulgada, e se houver um problema de divulgação, vamos contestar os termos e resolver o caso fora da justiça.",
  },

  // ---------------------------------------------------------------- C1
  {
    levelCode: "C1",
    orderInLevel: 1,
    sentenceEn:
      "The committee decided to scrutinize every number to substantiate the report, to circumvent the old bureaucracy, to alleviate the pressure that tends to exacerbate the crisis, to advocate for a fairer policy, to reconcile the two sides, to articulate a clear plan and to discern what really matters.",
    sentencePt:
      "O comitê decidiu escrutinar cada número para comprovar o relatório, contornar a velha burocracia, aliviar a pressão que tende a agravar a crise, defender uma política mais justa, reconciliar os dois lados, articular um plano claro e discernir o que realmente importa.",
  },
  {
    levelCode: "C1",
    orderInLevel: 2,
    sentenceEn:
      "There is a subtle nuance between accepting a paradigm without question and noticing a discrepancy in its premise, so we asked for the rationale behind the consensus, measured the implication of each decision, defined a threshold for the debate and demanded more coherence and less ambiguity.",
    sentencePt:
      "Existe uma nuance sutil entre aceitar um paradigma sem questionar e perceber uma discrepância em sua premissa, então pedimos a justificativa por trás do consenso, medimos a implicação de cada decisão, definimos um limiar para o debate e exigimos mais coerência e menos ambiguidade.",
  },
  {
    levelCode: "C1",
    orderInLevel: 3,
    sentenceEn:
      "It is inherent to a compelling proposal that it be viable, pragmatic and robust, but the fact that the practice is prevalent and the growth unprecedented does not excuse a meticulous analysis of every subtle and arbitrary detail.",
    sentencePt:
      "É inerente a uma proposta convincente que ela seja viável, pragmática e robusta, mas o fato de a prática ser prevalente e o crescimento sem precedentes não dispensa uma análise meticulosa de cada detalhe sutil e arbitrário.",
  },
  {
    levelCode: "C1",
    orderInLevel: 4,
    sentenceEn:
      "The director decided to delegate the operational tasks, to prioritize what really generates value, to optimize the schedule, to facilitate the dialogue between the areas, to integrate the systems, to validate the data, to refine the process, to anticipate the risks, to consolidate the results and to complement the team with new skills.",
    sentencePt:
      "O diretor decidiu delegar as tarefas operacionais, priorizar o que realmente gera valor, otimizar o cronograma, facilitar o diálogo entre as áreas, integrar os sistemas, validar os dados, refinar o processo, antecipar os riscos, consolidar os resultados e complementar a equipe com novas habilidades.",
  },

  // ---------------------------------------------------------------- C2
  {
    levelCode: "C2",
    orderInLevel: 1,
    sentenceEn:
      "He had to pull strings to get the contract, decided to bite the bullet and break the ice with the client, refused to cut corners, hit the nail on the head in the meeting, stayed on the fence about the price, let the cat out of the bag by accident, had to burn the midnight oil, went the extra mile on the project and finally called it a day.",
    sentencePt:
      "Ele teve que usar influência para conseguir o contrato, decidiu engolir o sapo e quebrar o gelo com o cliente, recusou-se a fazer nas coxas, acertou na mosca na reunião, ficou em cima do muro quanto ao preço, deu com a língua nos dentes por acidente, teve que virar a noite trabalhando, foi além do esperado no projeto e finalmente encerrou o dia.",
  },
  {
    levelCode: "C2",
    orderInLevel: 2,
    sentenceEn:
      "It is a paradox that the most ephemeral trends become ubiquitous, that the quintessential modern style is born from the juxtaposition of opposites, that every idiosyncrasy hides a conundrum, that each quandary demands zeal and that all of it still requires prudence.",
    sentencePt:
      "É um paradoxo que as tendências mais efêmeras se tornem onipresentes, que o estilo moderno quintessencial nasça da justaposição de opostos, que cada idiossincrasia esconda um enigma, que cada impasse exija zelo e que tudo isso ainda requeira prudência.",
  },
  {
    levelCode: "C2",
    orderInLevel: 3,
    sentenceEn:
      "The board chose to eschew the old model, to extol the new strategy, never to lambast the team in public, to placate the investors, to refuse to capitulate to pressure, to let good ideas proliferate, to ameliorate the working conditions, never to obfuscate the numbers, to galvanize the employees and, in the end, to vindicate those who had been unfairly accused.",
    sentencePt:
      "O conselho escolheu evitar o modelo antigo, enaltecer a nova estratégia, nunca criticar duramente a equipe em público, apaziguar os investidores, recusar-se a capitular diante da pressão, deixar boas ideias proliferarem, melhorar as condições de trabalho, nunca obscurecer os números, mobilizar os funcionários e, no fim, inocentar quem havia sido acusado injustamente.",
  },
  {
    levelCode: "C2",
    orderInLevel: 4,
    sentenceEn:
      "We are all in the same boat and we see eye to eye on the goal, so let us not beat around the bush: I have a lot on my plate and I am a bit under the weather, but if things get out of hand, take my opinion with a grain of salt, remember that this delay is a blessing in disguise and we will cross that bridge when we come to it — for now, we just need to think outside the box.",
    sentencePt:
      "Estamos todos no mesmo barco e concordamos plenamente quanto ao objetivo, então não vamos enrolar: eu estou com muito na mão e um pouco indisposto, mas se as coisas saírem do controle, não leve minha opinião tão a sério, lembre-se de que este atraso é um mal que vem para o bem e resolveremos isso depois — por enquanto, só precisamos pensar fora da caixa.",
  },
];
