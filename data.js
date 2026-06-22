export const judges = [
  { user: "juiz1", password: "1234", name: "Juiz 1" },
  { user: "juiz2", password: "1234", name: "Juiz 2" },
  { user: "juiz3", password: "1234", name: "Juiz 3" },
  { user: "juiz4", password: "1234", name: "Juiz 4" }
];

export const adminUser = { user: "admin", password: "admin123", name: "Administrador" };

export const rubrics = {
  inovacao: {
    title: "Projeto de Inovação",
    color: "blue",
    items: [
      { section: "Identificação", description: "A equipe tinha um problema claramente definido e bem pesquisado.", rows: [
        ["Definição pouco clara do problema", "Definição parcialmente clara do problema", "Definição clara do problema", "Comentário obrigatório para Excelente"],
        ["Evidências mínimas de pesquisa", "Evidências parciais de pesquisa de uma ou mais fontes", "Pesquisa clara e detalhada de uma variedade de fontes", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Design", description: "A equipe trabalhou em conjunto na criação de um plano de projeto e no desenvolvimento de suas ideias.", rows: [
        ["Evidências mínimas de um plano de projeto eficaz", "Evidências parciais de um plano de projeto eficaz", "Evidências claras de um plano de projeto eficaz", "Comentário obrigatório para Excelente"],
        ["Evidências mínimas de que o processo de desenvolvimento envolveu todos os membros da equipe", "Evidências parciais de que o processo de desenvolvimento envolveu todos os membros da equipe", "Evidências claras de que o processo de desenvolvimento envolveu todos os membros da equipe", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Criação", description: "A equipe desenvolveu uma ideia original ou baseou-se em uma ideia existente com um protótipo/desenho para representar sua solução.", rows: [
        ["Explicação mínima com relação à inovação na solução", "Explicação simples com relação à inovação na solução", "Explicação detalhada com relação à inovação na solução", "Comentário obrigatório para Excelente"],
        ["Protótipo/desenho pouco claro para representar a solução", "Protótipo/desenho simples para representar a solução", "Protótipo/desenho detalhado para representar a solução", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Iteração", description: "A equipe compartilhou suas ideias, coletou feedback e incluiu melhorias em sua solução.", rows: [
        ["Compartilhamento mínimo da solução com outras pessoas", "Solução compartilhada com pelo menos uma pessoa/grupo", "Solução compartilhada com várias pessoas/grupos", "Comentário obrigatório para Excelente"],
        ["Evidências mínimas de melhorias com base em feedbacks", "Evidências parciais de melhorias com base em feedbacks", "Evidências claras de melhorias com base em feedbacks", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Comunicação", description: "Os alunos fizeram uma apresentação eficaz de sua solução, seu impacto sobre outras pessoas e comemoraram o progresso da equipe.", rows: [
        ["Explicação pouco clara da solução e seu impacto potencial sobre outras pessoas", "Explicação parcialmente clara da solução e seu impacto potencial sobre outras pessoas", "Explicação clara da solução e seu impacto potencial sobre outras pessoas", "Comentário obrigatório para Excelente"],
        ["A apresentação demonstra orgulho ou entusiasmo mínimo com o trabalho da equipe", "A apresentação demonstra orgulho ou entusiasmo parcial com o trabalho da equipe", "A apresentação claramente demonstra orgulho ou entusiasmo com o trabalho da equipe", "Comentário obrigatório para Excelente"]
      ]}
    ]
  },
  robo: {
    title: "Design do Robô",
    color: "green",
    items: [
      { section: "Identificação", description: "A equipe definiu quais missões iria tentar realizar, explorou recursos de construção e codificação e buscou orientação conforme necessário.", rows: [
        ["Evidências mínimas de estratégia de missão", "Evidências parciais de estratégia de missão", "Evidências claras de estratégia de missão", "Comentário obrigatório para Excelente"],
        ["Uso mínimo de recursos de construção ou codificação", "Uso de alguns recursos de construção ou codificação", "Uso claro de recursos de construção ou codificação para apoiar na estratégia de missão", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Design", description: "Os membros da equipe trabalharam colaborativamente em seus designs e desenvolveram as habilidades de construção e codificação necessárias.", rows: [
        ["Evidências mínimas de que todos os membros da equipe contribuíram com ideias", "Evidências parciais de que todos os membros da equipe contribuíram com ideias", "Evidências claras de que todos os membros da equipe contribuíram com ideias", "Comentário obrigatório para Excelente"],
        ["Evidências mínimas de habilidades de construção e codificação em todos os membros da equipe", "Evidências parciais de habilidades de construção e codificação em todos os membros da equipe", "Evidências claras de habilidades de construção e codificação em todos os membros da equipe", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Criação", description: "A equipe desenvolveu designs originais ou melhorou os existentes de acordo com sua estratégia de missão.", rows: [
        ["Explicação pouco clara dos acessórios e de seu propósito", "Explicação simples dos acessórios e de seu propósito", "Explicação clara de acessórios inovadores e de seu propósito", "Comentário obrigatório para Excelente"],
        ["Explicação pouco clara do uso de códigos e/ou sensores", "Explicação simples do uso de códigos e/ou sensores", "Explicação clara do uso inovador de códigos e/ou sensores", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Iteração", description: "A equipe testou seus robôs e códigos repetidamente para identificar áreas de melhoria e incorporou as descobertas em suas soluções.", rows: [
        ["Evidências mínimas de testes do robô e do código", "Evidências parciais de testes do robô e do código", "Evidências claras de testes repetidos do robô e do código", "Comentário obrigatório para Excelente"],
        ["Evidências mínimas de melhorias com base em testes", "Evidências parciais de melhorias com base em testes", "Evidências claras de melhorias com base em testes", "Comentário obrigatório para Excelente"]
      ]},
      { section: "Comunicação", description: "A equipe explicou de forma eficaz o que aprendeu com o processo do design do robô e comemorou seu progresso.", rows: [
        ["Explicação pouco clara do processo e lições aprendidas", "Explicação simples do processo e lições aprendidas", "Explicação detalhada do processo e lições aprendidas", "Comentário obrigatório para Excelente"],
        ["A equipe demonstra orgulho ou entusiasmo mínimo pelo seu trabalho", "A equipe demonstra orgulho ou entusiasmo parcial pelo seu trabalho", "A equipe claramente demonstra orgulho ou entusiasmo pelo seu trabalho", "Comentário obrigatório para Excelente"]
      ]}
    ]
  }
};
