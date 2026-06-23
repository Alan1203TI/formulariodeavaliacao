export const defaultAdmin = { user: "admin", password: "FLL@2026MG", name: "Administrador", role: "admin" };

// Rubricas transcritas do PDF FLL.
// special:true = linha marcada com engrenagem no PDF. No sistema ela aparece com ⚙️ e também gera marcação visual de Core Values, sem peso diferente na pontuação.
export const rubrics = {
  inovacao: {
    title: "Projeto de Inovação",
    color: "blue",
    items: [
      { section: "Identificação", description: "A equipe tinha um problema claramente definido e bem pesquisado.", rows: [
        { special:false, texts:["Definição pouco clara do problema", "Definição parcialmente clara do problema", "Definição clara do problema", "De que maneiras a equipe demonstrou excedência?"] },
        { special:true, texts:["Evidências mínimas de pesquisa", "Evidências parciais de pesquisa de uma ou mais fontes", "Pesquisa clara e detalhada de uma variedade de fontes", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Design", description: "A equipe trabalhou em conjunto na criação de um plano de projeto e no desenvolvimento de suas ideias.", rows: [
        { special:false, texts:["Evidências mínimas de um plano de projeto eficaz", "Evidências parciais de um plano de projeto eficaz", "Evidências claras de um plano de projeto eficaz", "De que maneiras a equipe demonstrou excedência?"] },
        { special:true, texts:["Evidências mínimas de que o processo de desenvolvimento envolveu todos os membros da equipe", "Evidências parciais de que o processo de desenvolvimento envolveu todos os membros da equipe", "Evidências claras de que o processo de desenvolvimento envolveu todos os membros da equipe", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Criação", description: "A equipe desenvolveu uma ideia original ou baseou-se em uma ideia existente com um protótipo/desenho para representar sua solução.", rows: [
        { special:true, texts:["Explicação mínima com relação à inovação na solução", "Explicação simples com relação à inovação na solução", "Explicação detalhada com relação à inovação na solução", "De que maneiras a equipe demonstrou excedência?"] },
        { special:false, texts:["Protótipo/desenho pouco claro para representar a solução", "Protótipo/desenho simples para representar a solução", "Protótipo/desenho detalhado para representar a solução", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Iteração", description: "A equipe compartilhou suas ideias, coletou feedback e incluiu melhorias em sua solução.", rows: [
        { special:false, texts:["Compartilhamento mínimo da solução com outras pessoas", "Solução compartilhada com pelo menos uma pessoa/grupo", "Solução compartilhada com várias pessoas/grupos", "De que maneiras a equipe demonstrou excedência?"] },
        { special:false, texts:["Evidências mínimas de melhorias com base em feedbacks", "Evidências parciais de melhorias com base em feedbacks", "Evidências claras de melhorias com base em feedbacks", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Comunicação", description: "Os alunos fizeram uma apresentação eficaz de sua solução, seu impacto sobre outras pessoas e comemoraram o progresso da equipe.", rows: [
        { special:true, texts:["Explicação pouco clara da solução e seu impacto potencial sobre outras pessoas", "Explicação parcialmente clara da solução e seu impacto potencial sobre outras pessoas", "Explicação clara da solução e seu impacto potencial sobre outras pessoas", "De que maneiras a equipe demonstrou excedência?"] },
        { special:true, texts:["A apresentação demonstra orgulho ou entusiasmo mínimo com o trabalho da equipe", "A apresentação demonstra orgulho ou entusiasmo parcial com o trabalho da equipe", "A apresentação claramente demonstra orgulho ou entusiasmo com o trabalho da equipe", "De que maneiras a equipe demonstrou excedência?"] }
      ]}
    ]
  },
  robo: {
    title: "Design do Robô",
    color: "green",
    items: [
      { section: "Identificação", description: "A equipe definiu quais missões iria tentar realizar, explorou recursos de construção e codificação e buscou orientação conforme necessário.", rows: [
        { special:false, texts:["Evidências mínimas de estratégia de missão", "Evidências parciais de estratégia de missão", "Evidências claras de estratégia de missão", "De que maneiras a equipe demonstrou excedência?"] },
        { special:true, texts:["Uso mínimo de recursos de construção ou codificação", "Uso de alguns recursos de construção ou codificação", "Uso claro de recursos de construção ou codificação para apoiar na estratégia de missão", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Design", description: "Os membros da equipe trabalharam colaborativamente em seus designs e desenvolveram as habilidades de construção e codificação necessárias.", rows: [
        { special:true, texts:["Evidências mínimas de que todos os membros da equipe contribuíram com ideias", "Evidências parciais de que todos os membros da equipe contribuíram com ideias", "Evidências claras de que todos os membros da equipe contribuíram com ideias", "De que maneiras a equipe demonstrou excedência?"] },
        { special:false, texts:["Evidências mínimas de habilidades de construção e codificação em todos os membros da equipe", "Evidências parciais de habilidades de construção e codificação em todos os membros da equipe", "Evidências claras de habilidades de construção e codificação em todos os membros da equipe", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Criação", description: "A equipe desenvolveu designs originais ou melhorou os existentes de acordo com sua estratégia de missão.", rows: [
        { special:false, texts:["Explicação pouco clara dos acessórios e de seu propósito", "Explicação simples dos acessórios e de seu propósito", "Explicação clara de acessórios inovadores e de seu propósito", "De que maneiras a equipe demonstrou excedência?"] },
        { special:false, texts:["Explicação pouco clara do uso de códigos e/ou sensores", "Explicação simples do uso de códigos e/ou sensores", "Explicação clara do uso inovador de códigos e/ou sensores", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Iteração", description: "A equipe testou seus robôs e códigos repetidamente para identificar áreas de melhoria e incorporou as descobertas em suas soluções.", rows: [
        { special:false, texts:["Evidências mínimas de testes do robô e do código", "Evidências parciais de testes do robô e do código", "Evidências claras de testes repetidos do robô e do código", "De que maneiras a equipe demonstrou excedência?"] },
        { special:true, texts:["Evidências mínimas de melhorias com base em testes", "Evidências parciais de melhorias com base em testes", "Evidências claras de melhorias com base em testes", "De que maneiras a equipe demonstrou excedência?"] }
      ]},
      { section: "Comunicação", description: "A equipe explicou de forma eficaz o que aprendeu com o processo do design do robô e comemorou seu progresso.", rows: [
        { special:true, texts:["Explicação pouco clara do processo e lições aprendidas", "Explicação simples do processo e lições aprendidas", "Explicação detalhada do processo e lições aprendidas", "De que maneiras a equipe demonstrou excedência?"] },
        { special:true, texts:["A equipe demonstra orgulho ou entusiasmo mínimo pelo seu trabalho", "A equipe demonstra orgulho ou entusiasmo parcial pelo seu trabalho", "A equipe claramente demonstra orgulho ou entusiasmo pelo seu trabalho", "De que maneiras a equipe demonstrou excedência?"] }
      ]}
    ]
  }
};
