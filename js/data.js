/* ============================================================
   RotinaFit — base de dados de exercícios e modelos de treino
   ============================================================ */
(function (global) {
  "use strict";

  const GROUP_LABELS = {
    peito: "Peito",
    costas: "Costas",
    ombros: "Ombros",
    biceps: "Bíceps",
    triceps: "Tríceps",
    pernas: "Pernas e glúteos",
    core: "Core",
    cardio: "Cardio"
  };

  const EQUIP_LABELS = {
    barra: "Barra",
    halteres: "Halteres",
    maquina: "Máquina",
    polia: "Polia",
    corporal: "Peso corporal"
  };

  const OBJECTIVE_LABELS = {
    emagrecer: "Emagrecer",
    "ganhar-massa": "Ganhar massa",
    forca: "Ganhar força",
    condicionamento: "Condicionamento"
  };

  const LEVEL_LABELS = {
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    avancado: "Avançado"
  };

  const LOCATION_LABELS = {
    academia: "Academia completa",
    "casa-halteres": "Casa com halteres",
    "sem-equipamento": "Sem equipamento"
  };

  const LOCATION_EQUIPMENT = {
    academia: ["barra", "halteres", "maquina", "polia", "corporal"],
    "casa-halteres": ["halteres", "corporal"],
    "sem-equipamento": ["corporal"]
  };

  const SPLIT_HINTS = {
    2: "Full Body A / B — dois treinos completos por semana",
    3: "Full Body A / B / C — ideal para quem está começando",
    4: "Upper / Lower — divide superior e inferior",
    5: "Upper / Lower + Full Body — mais volume e frequência",
    6: "Push / Pull / Legs — um dia para cada padrão de movimento"
  };

  const SCHEMES = {
    emagrecer: { label: "Emagrecimento", series: 3, reps: "12–15", descanso: 60 },
    "ganhar-massa": { label: "Hipertrofia", series: 4, reps: "8–12", descanso: 90 },
    forca: { label: "Força", series: 5, reps: "5–6", descanso: 150 },
    condicionamento: { label: "Condicionamento", series: 3, reps: "15–20", descanso: 45 }
  };

  /* Cada slot: { grupo, qtd }. cardio = minutos de cardio no fim do treino. */
  const SPLITS = {
    2: [
      { nome: "Treino A — Full Body", foco: "Compostos e força", slots: [{ grupo: "pernas", qtd: 2 }, { grupo: "peito", qtd: 1 }, { grupo: "costas", qtd: 1 }, { grupo: "core", qtd: 1 }], cardio: 0 },
      { nome: "Treino B — Full Body", foco: "Estabilidade e definição", slots: [{ grupo: "pernas", qtd: 2 }, { grupo: "ombros", qtd: 1 }, { grupo: "biceps", qtd: 1 }, { grupo: "triceps", qtd: 1 }, { grupo: "core", qtd: 1 }], cardio: 8 }
    ],
    3: [
      { nome: "Treino A — Full Body", foco: "Empurrar e agachar", slots: [{ grupo: "peito", qtd: 1 }, { grupo: "costas", qtd: 1 }, { grupo: "pernas", qtd: 2 }, { grupo: "core", qtd: 1 }], cardio: 0 },
      { nome: "Treino B — Full Body", foco: "Puxar e estabilizar", slots: [{ grupo: "costas", qtd: 1 }, { grupo: "ombros", qtd: 1 }, { grupo: "pernas", qtd: 2 }, { grupo: "triceps", qtd: 1 }], cardio: 0 },
      { nome: "Treino C — Full Body", foco: "Braços, core e cardio", slots: [{ grupo: "peito", qtd: 1 }, { grupo: "biceps", qtd: 1 }, { grupo: "pernas", qtd: 1 }, { grupo: "ombros", qtd: 1 }, { grupo: "core", qtd: 1 }], cardio: 12 }
    ],
    4: [
      { nome: "Treino A — Upper", foco: "Peito e costas", slots: [{ grupo: "peito", qtd: 2 }, { grupo: "costas", qtd: 2 }, { grupo: "ombros", qtd: 1 }, { grupo: "biceps", qtd: 1 }], cardio: 0 },
      { nome: "Treino B — Lower", foco: "Pernas e glúteos", slots: [{ grupo: "pernas", qtd: 4 }, { grupo: "core", qtd: 1 }], cardio: 0 },
      { nome: "Treino C — Upper", foco: "Ombros e braços", slots: [{ grupo: "costas", qtd: 2 }, { grupo: "ombros", qtd: 2 }, { grupo: "triceps", qtd: 2 }], cardio: 0 },
      { nome: "Treino D — Lower", foco: "Posterior e core", slots: [{ grupo: "pernas", qtd: 3 }, { grupo: "core", qtd: 2 }], cardio: 8 }
    ],
    5: [
      { nome: "Treino A — Upper", foco: "Força no superior", slots: [{ grupo: "peito", qtd: 2 }, { grupo: "costas", qtd: 2 }, { grupo: "ombros", qtd: 1 }, { grupo: "biceps", qtd: 1 }], cardio: 0 },
      { nome: "Treino B — Lower", foco: "Pernas e glúteos", slots: [{ grupo: "pernas", qtd: 4 }, { grupo: "core", qtd: 1 }], cardio: 0 },
      { nome: "Treino C — Upper", foco: "Ombros e tríceps", slots: [{ grupo: "costas", qtd: 2 }, { grupo: "ombros", qtd: 2 }, { grupo: "triceps", qtd: 2 }], cardio: 0 },
      { nome: "Treino D — Lower", foco: "Estabilidade e posterior", slots: [{ grupo: "pernas", qtd: 3 }, { grupo: "core", qtd: 2 }], cardio: 0 },
      { nome: "Treino E — Full Body", foco: "Circuitado + cardio", slots: [{ grupo: "peito", qtd: 1 }, { grupo: "costas", qtd: 1 }, { grupo: "pernas", qtd: 1 }, { grupo: "core", qtd: 1 }], cardio: 15 }
    ],
    6: [
      { nome: "Treino A — Push", foco: "Peito, ombros e tríceps", slots: [{ grupo: "peito", qtd: 3 }, { grupo: "ombros", qtd: 2 }, { grupo: "triceps", qtd: 1 }], cardio: 0 },
      { nome: "Treino B — Pull", foco: "Costas e bíceps", slots: [{ grupo: "costas", qtd: 3 }, { grupo: "biceps", qtd: 2 }, { grupo: "core", qtd: 1 }], cardio: 0 },
      { nome: "Treino C — Legs", foco: "Quadríceps e glúteos", slots: [{ grupo: "pernas", qtd: 4 }, { grupo: "core", qtd: 1 }], cardio: 0 },
      { nome: "Treino D — Push", foco: "Ombros e peito", slots: [{ grupo: "peito", qtd: 2 }, { grupo: "ombros", qtd: 2 }, { grupo: "triceps", qtd: 2 }], cardio: 0 },
      { nome: "Treino E — Pull", foco: "Costas e braços", slots: [{ grupo: "costas", qtd: 3 }, { grupo: "biceps", qtd: 2 }, { grupo: "core", qtd: 1 }], cardio: 0 },
      { nome: "Treino F — Legs", foco: "Posterior e cardio", slots: [{ grupo: "pernas", qtd: 4 }, { grupo: "core", qtd: 1 }], cardio: 10 }
    ]
  };

  const EXERCISES = [
    /* ---------------- PEITO ---------------- */
    { id: "supino-reto-barra", nome: "Supino reto com barra", grupo: "peito", equipamento: "barra", descricao: "Deite-se no banco com os pés apoiados. Retráia as escápulas, desça a barra até o meio do peito e empurre até estender os braços sem travar os cotovelos.", dica: "Controle a descida por 2 a 3 segundos e nunca deixe a barra quicar no peito." },
    { id: "supino-inclinado-halteres", nome: "Supino inclinado com halteres", grupo: "peito", equipamento: "halteres", descricao: "Banco inclinado a cerca de 30°. Desça os halteres até a altura do peito, mantendo os cotovelos a cerca de 45° do corpo, e suba empurrando para cima e levemente para dentro.", dica: "Inclinações acima de 45° deslocam o esforço para os ombros." },
    { id: "flexao-braco", nome: "Flexão de braço", grupo: "peito", equipamento: "corporal", descricao: "Corpo alinhado dos ombros aos tornozelos. Desça até o peito quase tocar o chão, mantendo o core contraído, e empurre de volta.", dica: "Mais difícil: eleve os pés. Mais fácil: apoie os joelhos no chão." },
    { id: "supino-maquina", nome: "Supino sentado na máquina", grupo: "peito", equipamento: "maquina", descricao: "Ajuste o banco para as alças ficarem na altura do meio do peito. Empurre as alças até a extensão dos braços e volte devagar.", dica: "Ótimo para iniciantes: o movimento é guiado e exige menos estabilização." },
    { id: "voador-halteres", nome: "Voador com halteres", grupo: "peito", equipamento: "halteres", descricao: "Deite-se no banco com os braços levemente flexionados. Abra os halteres até sentir o peito alongar e feche como se abraçasse alguém.", dica: "Mantenha a mesma flexão de cotovelo durante todo o movimento." },
    { id: "crossover-polia", nome: "Crossover na polia", grupo: "peito", equipamento: "polia", descricao: "Em pé, com as polias altas, traga as mãos à frente do peito cruzando os braços. Volte devagar até sentir o alongamento.", dica: "Incline levemente o tronco para frente e use o peito, não os ombros, para puxar." },

    /* ---------------- COSTAS ---------------- */
    { id: "puxada-aberta", nome: "Puxada frontal aberta", grupo: "costas", equipamento: "polia", descricao: "Sentado, segure a barra com pegada aberta. Puxe para a parte alta do peito, levando os cotovelos para baixo e para trás, e suba controlando.", dica: "Pense em 'puxar com os cotovelos', não com as mãos." },
    { id: "remada-curvada-barra", nome: "Remada curvada com barra", grupo: "costas", equipamento: "barra", descricao: "Em pé, joelhos levemente flexionados e tronco inclinado. Puxe a barra até a região do abdômen, mantendo a coluna neutra.", dica: "Evite 'jogar' o tronco para trás; o movimento deve vir das costas." },
    { id: "remada-baixa", nome: "Remada baixa na polia", grupo: "costas", equipamento: "polia", descricao: "Sentado, puxe a barra triangular em direção ao abdômen, juntando as escápulas no fim do movimento. Volte lentamente.", dica: "Peito apoiado no encosto ajuda a não usar a lombar." },
    { id: "remada-maquina", nome: "Remada sentada na máquina", grupo: "costas", equipamento: "maquina", descricao: "Apoie o peito no suporte, segure as alças e puxe até os cotovelos passarem do tronco. Retorne devagar.", dica: "Ajuste o assento para as alças ficarem na altura do peito." },
    { id: "barra-fixa", nome: "Barra fixa", grupo: "costas", equipamento: "corporal", descricao: "Pendure-se na barra com as palmas voltadas para frente. Suba até o queixo passar da barra e desça de forma controlada.", dica: "Se ainda não consegue, use uma cadeira ou faixa de apoio para progredir." },
    { id: "remada-unilateral", nome: "Remada unilateral com halter", grupo: "costas", equipamento: "halteres", descricao: "Apoie uma mão e um joelho no banco. Puxe o halter até a lateral do tórax, mantendo o tronco parado.", dica: "Excelente para corrigir diferenças de força entre os lados." },
    { id: "levantamento-terra", nome: "Levantamento terra", grupo: "costas", equipamento: "barra", descricao: "Com a barra à frente dos pés, agache mantendo as costas retas. Empurre o chão com os pés e estenda quadris e joelhos até ficar em pé.", dica: "A barra deve ficar sempre próxima ao corpo. Pare se sentir a lombar arredondando." },

    /* ---------------- OMBROS ---------------- */
    { id: "desenvolvimento-maquina", nome: "Desenvolvimento de ombros sentado", grupo: "ombros", equipamento: "maquina", descricao: "Sentado com o tronco apoiado, empurre as alças para cima até estender os braços sem travar os cotovelos. Desça até a altura das orelhas.", dica: "Ajuste o encosto para as mãos ficarem alinhadas às orelhas." },
    { id: "desenvolvimento-halteres", nome: "Desenvolvimento com halteres", grupo: "ombros", equipamento: "halteres", descricao: "Sentado, com os halteres na altura das orelhas, empurre para cima alternando ou simultaneamente até estender os braços.", dica: "Não deixe os halteres baterem um no outro no topo." },
    { id: "elevacao-lateral", nome: "Elevação lateral", grupo: "ombros", equipamento: "halteres", descricao: "Em pé, braços estendidos ao lado do corpo, eleve os halteres até a altura dos ombros com um leve arco no cotovelo. Desça devagar.", dica: "Use cargas leves: o objetivo é isolar a parte lateral do ombro." },
    { id: "elevacao-frontal", nome: "Elevação frontal", grupo: "ombros", equipamento: "halteres", descricao: "Em pé, eleve um halter à frente do corpo até a altura dos ombros. Desça devagar e alterne os lados.", dica: "Mantenha o tronco parado para não transformar em impulso." },
    { id: "remada-alta-polia", nome: "Remada alta na polia", grupo: "ombros", equipamento: "polia", descricao: "Em pé, segure a barra com pegada neutra e puxe até a altura do rosto, com os cotovelos mais altos que as mãos.", dica: "Ótimo para a parte posterior do ombro e para a postura." },
    { id: "fly-reverso", nome: "Fly reverso (pássaro)", grupo: "ombros", equipamento: "halteres", descricao: "Incline o tronco para frente e abra os braços para os lados até a altura dos ombros, juntando as escápulas.", dica: "Pense em 'abrir as asas', sem usar impulso." },
    { id: "elevacao-lateral-cabo", nome: "Elevação lateral na polia baixa", grupo: "ombros", equipamento: "polia", descricao: "Em pé ao lado da polia baixa, eleve o braço para o lado até a altura do ombro. Volte controlando.", dica: "A tensão constante do cabo dá um estímulo diferente do halter." },

    /* ---------------- BÍCEPS ---------------- */
    { id: "rosca-direta-barra", nome: "Rosca direta com barra", grupo: "biceps", equipamento: "barra", descricao: "Em pé, pegada supinada na largura dos ombros. Mantenha os cotovelos junto ao tronco e suba a barra até o peito. Desça devagar.", dica: "Não jogue o tronco para trás; se precisar, reduza a carga." },
    { id: "rosca-alternada", nome: "Rosca alternada com halteres", grupo: "biceps", equipamento: "halteres", descricao: "Alterne a subida dos halteres, girando o pulso para cima no fim do movimento. Cotovelos sempre fixos ao lado do corpo.", dica: "A rotação do pulso no final aumenta a contração." },
    { id: "rosca-polia-baixa", nome: "Rosca na polia baixa", grupo: "biceps", equipamento: "polia", descricao: "Segure a barra reta da polia baixa e suba até o peito sem mexer os ombros. Volte estendendo os braços por completo.", dica: "A polia mantém tensão constante em toda a amplitude." },
    { id: "rosca-martelo", nome: "Rosca martelo", grupo: "biceps", equipamento: "halteres", descricao: "Com pegada neutra (palmas voltadas uma para a outra), suba os halteres alternadamente sem girar os pulsos.", dica: "Trabalha o braquial e o antebraço, dando volume ao braço." },
    { id: "rosca-concentrada", nome: "Rosca concentrada", grupo: "biceps", equipamento: "halteres", descricao: "Sentado, apoie o cotovelo na parte interna da coxa e suba o halter até o ombro. Segure a contração por 1 segundo.", dica: "Ideal para 'sentir' o bíceps com cargas menores." },

    /* ---------------- TRÍCEPS ---------------- */
    { id: "triceps-pulley", nome: "Tríceps no pulley com barra", grupo: "triceps", equipamento: "polia", descricao: "Segure a barra da polia alta com pegada neutra. Estenda os cotovelos levando as mãos até os quadris. Volte devagar.", dica: "Mantenha os cotovelos colados ao tronco durante todo o movimento." },
    { id: "triceps-testa", nome: "Tríceps testa com barra", grupo: "triceps", equipamento: "barra", descricao: "Deite-se no banco e desça a barra até a testa flexionando apenas os cotovelos. Volte estendendo os braços.", dica: "Se incomodar o ombro, use halteres ou pegada neutra." },
    { id: "mergulho-paralelas", nome: "Mergulho nas paralelas", grupo: "triceps", equipamento: "corporal", descricao: "Apoie-se nas paralelas com o tronco levemente inclinado para frente. Desça até os ombros na altura das mãos e empurre para cima.", dica: "Incline o tronco para trás se quiser enfatizar o peito." },
    { id: "extensao-triceps-maquina", nome: "Extensão de tríceps na máquina", grupo: "triceps", equipamento: "maquina", descricao: "Sentado, apoie os braços no suporte e estenda as alças até os braços ficarem paralelos ao chão.", dica: "Boa opção para treinar o tríceps sem sobrecarregar os ombros." },
    { id: "triceps-coice", nome: "Coice de tríceps com halter", grupo: "triceps", equipamento: "halteres", descricao: "Incline o tronco para frente e estenda o braço para trás até ficar alinhado ao corpo. Volte controlando.", dica: "Comece leve e foque em manter o braço estável." },

    /* ---------------- PERNAS ---------------- */
    { id: "agachamento-barra", nome: "Agachamento com barra", grupo: "pernas", equipamento: "barra", descricao: "Barra apoiada nos ombros. Agache como se fosse sentar numa cadeira, mantendo os joelhos alinhados aos pés e o tronco firme. Levante empurrando o chão.", dica: "Mantenha os calcanhares no chão durante toda a subida." },
    { id: "leg-press", nome: "Leg press", grupo: "pernas", equipamento: "maquina", descricao: "Sentado, pise na plataforma na largura dos ombros. Desça até os joelhos formarem cerca de 90° e empurre até estender as pernas sem travar.", dica: "Não deixe a bacia sair do assento no fim da descida." },
    { id: "afundo-halteres", nome: "Afundo com halteres", grupo: "pernas", equipamento: "halteres", descricao: "Dê um passo à frente e desça até o joelho de trás quase tocar o chão. Empurre com a perna da frente e alterne os lados.", dica: "Mantenha o tronco ereto e o joelho da frente alinhado ao pé." },
    { id: "cadeira-extensora", nome: "Cadeira extensora", grupo: "pernas", equipamento: "maquina", descricao: "Sentado, estenda as pernas até ficarem paralelas ao chão. Segure por 1 segundo e desça devagar.", dica: "Suba de forma controlada, sem 'chutar' a carga." },
    { id: "cadeira-flexora", nome: "Cadeira flexora", grupo: "pernas", equipamento: "maquina", descricao: "Deite-se de bruços com os tornozelos sob a almofada. Flexione os joelhos trazendo os calcanhares em direção aos glúteos.", dica: "Não levante a bacia do banco para não usar a lombar." },
    { id: "hip-thrust", nome: "Hip thrust com barra", grupo: "pernas", equipamento: "barra", descricao: "Com a parte alta das costas apoiada no banco e a barra sobre os quadris, estenda o quadril até o tronco ficar paralelo ao chão.", dica: "Aperte os glúteos no topo e mantenha o queixo levemente retraído." },
    { id: "elevacao-pelvica", nome: "Elevação pélvica", grupo: "pernas", equipamento: "corporal", descricao: "Deite-se de costas com os joelhos flexionados e os pés apoiados. Levante o quadril até alinhar joelhos, quadris e ombros.", dica: "Pressione os calcanhares no chão e aperte os glúteos no topo." },
    { id: "agachamento-livre", nome: "Agachamento com peso corporal", grupo: "pernas", equipamento: "corporal", descricao: "Pés na largura dos ombros, agache o máximo que conseguir mantendo os calcanhares apoiados. Levante estendendo quadris e joelhos.", dica: "Se os calcanhares levantarem, apoie-os em um pequeno degrau ou calçado firme." },
    { id: "panturrilha-maquina", nome: "Panturrilha sentado na máquina", grupo: "pernas", equipamento: "maquina", descricao: "Com as pontas dos pés na plataforma, suba o máximo que conseguir e desça até alongar a panturrilha.", dica: "Suba e desça em ritmo constante, sem usar impulso." },
    { id: "panturrilha-unilateral", nome: "Panturrilha em um pé", grupo: "pernas", equipamento: "corporal", descricao: "Em pé sobre um degrau, aponte um pé e eleve o corpo o máximo possível. Desça devagar e alterne os lados.", dica: "Apoie-se levemente na parede para manter o equilíbrio." },

    /* ---------------- CORE ---------------- */
    { id: "prancha", nome: "Prancha isométrica", grupo: "core", equipamento: "corporal", descricao: "Apoie-se nos antebraços e nos pés, com o corpo alinhado. Contraia o abdômen e os glúteos e mantenha a posição sem deixar a bacia cair.", dica: "Respire normalmente. Qualidade vale mais que tempo." },
    { id: "abdominal-crunch", nome: "Abdominal crunch", grupo: "core", equipamento: "corporal", descricao: "Deite-se de costas com os joelhos flexionados. Eleve a parte alta do tronco contraindo o abdômen e volte devagar.", dica: "Não puxe o pescoço com as mãos; olhe para o teto." },
    { id: "prancha-lateral", nome: "Prancha lateral", grupo: "core", equipamento: "corporal", descricao: "Deite-se de lado apoiado no antebraço. Levante o quadril mantendo o corpo alinhado e o abdômen contraído. Alterne os lados.", dica: "Se for difícil, apoie o joelho de baixo no chão." },
    { id: "dead-bug", nome: "Dead bug", grupo: "core", equipamento: "corporal", descricao: "Deite-se de costas com braços e pernas erguidos. Estenda o braço oposto à perna que desce, mantendo a lombar colada ao chão.", dica: "Vá devagar: se a lombar sair do chão, reduza a amplitude." },
    { id: "russian-twist", nome: "Russian twist", grupo: "core", equipamento: "corporal", descricao: "Sentado com os joelhos flexionados e o tronco levemente inclinado, gire os ombros de um lado para o outro com as mãos à frente.", dica: "Gire a partir do tronco, não apenas dos braços." },
    { id: "elevacao-pernas", nome: "Elevação de pernas", grupo: "core", equipamento: "corporal", descricao: "Deite-se de costas com as pernas estendidas. Eleve-as até cerca de 90° e desça devagar sem deixar os pés baterem no chão.", dica: "Mantenha a região lombar apoiada no chão." },

    /* ---------------- CARDIO ---------------- */
    { id: "esteira", nome: "Esteira (caminhada ou corrida)", grupo: "cardio", equipamento: "maquina", descricao: "Comece com uma caminhada leve para aquecer e aumente gradualmente a velocidade ou a inclinação conforme seu condicionamento.", dica: "Mantenha postura ereta e passos curtos; fale normalmente para controlar o esforço." },
    { id: "bicicleta", nome: "Bicicleta ergométrica", grupo: "cardio", equipamento: "maquina", descricao: "Ajuste o assento, apoie os pés nos pedais e pedale em ritmo constante, variando entre momentos mais leves e mais intensos.", dica: "Excelente opção de baixo impacto para as articulações." },
    { id: "remo-ergometro", nome: "Remo ergômetro", grupo: "cardio", equipamento: "maquina", descricao: "Com os pés presos, empurre com as pernas, depois o tronco e por fim os braços. Volte na ordem inversa, de forma fluida.", dica: "O movimento começa nas pernas, não nos braços." },
    { id: "polichinelo", nome: "Polichinelo", grupo: "cardio", equipamento: "corporal", descricao: "Em pé, abra e feche as pernas enquanto abre e fecha os braços acima da cabeça, em ritmo constante.", dica: "Pouse suavemente para proteger as articulações." },
    { id: "burpee", nome: "Burpee", grupo: "cardio", equipamento: "corporal", descricao: "Agache, apoie as mãos no chão, estenda as pernas para trás, faça uma flexão, volte à posição agachada e salte para cima.", dica: "Se estiver começando, retire a flexão e o salto." },
    { id: "mountain-climber", nome: "Mountain climber", grupo: "cardio", equipamento: "corporal", descricao: "Em posição de prancha com as mãos no chão, traga os joelhos alternadamente em direção ao peito em ritmo rápido.", dica: "Mantenha os ombros sobre as mãos e o quadril baixo." },
    { id: "agachamento-salto", nome: "Agachamento com salto", grupo: "cardio", equipamento: "corporal", descricao: "Agache e salte o mais alto que conseguir. Caia suavemente flexionando joelhos e quadris e repita.", dica: "Se sentir desconforto nos joelhos, troque pelo agachamento comum." }
  ];

  /* ID do vídeo do YouTube de cada exercício (base: Free Exercise DB / domínio público). */
  const VIDEOS = {
    "supino-reto-barra": "6zWoAllRufg",
    "supino-inclinado-halteres": "8fXfwG4ftaQ",
    "flexao-braco": "3ZCDVRbhOMM",
    "supino-maquina": "gQ3afio08V8",
    "voador-halteres": "rk8YayRoTRQ",
    "crossover-polia": "tGXIQR89-JE",
    "puxada-aberta": "z-lxcsIN4T4",
    "remada-curvada-barra": "MXfyuB6DjWE",
    "remada-baixa": "qD1WZ5pSuvk",
    "remada-maquina": "OJAxVKVMjmg",
    "barra-fixa": "ym1V5H35IpA",
    "remada-unilateral": "1b9BI6zR37A",
    "levantamento-terra": "ZaTM37cfiDs",
    "desenvolvimento-maquina": "6v4nrRVySj0",
    "desenvolvimento-halteres": "k6tzKisR3NY",
    "elevacao-lateral": "Kl3LEzQ5Zqs",
    "elevacao-frontal": "9ThlTL25DH8",
    "remada-alta-polia": "IeOqdw9WI90",
    "fly-reverso": "LsT-bR_zxLo",
    "elevacao-lateral-cabo": "f_OGBg2KxgY",
    "rosca-direta-barra": "ez3YoWf62Eg",
    "rosca-alternada": "MKWBV29S6c0",
    "rosca-polia-baixa": "CrbTqNOlFgE",
    "rosca-martelo": "8H5oWMNWWeQ",
    "rosca-concentrada": "EjUnEEfTSEY",
    "triceps-pulley": "Rc7-euA8FDI",
    "triceps-testa": "K3mFeNz4e3w",
    "mergulho-paralelas": "6IknX1l-XhM",
    "extensao-triceps-maquina": "6Dh8sD6aNQE",
    "triceps-coice": "GZ3NzlJs_yg",
    "agachamento-barra": "MLoZuAkIyZI",
    "leg-press": "EotSw18oR9w",
    "afundo-halteres": "mJilHWIBWO8",
    "cadeira-extensora": "uM86QE59Tgc",
    "cadeira-flexora": "_lgE0gPvbik",
    "hip-thrust": "W86oVlnLqY4",
    "elevacao-pelvica": "LORVjN2bg5o",
    "agachamento-livre": "eFEVKmp3M4g",
    "panturrilha-maquina": "qAQexys5Bv4",
    "panturrilha-unilateral": "ar8nav0jGoE",
    "prancha": "xe2MXatLTUw",
    "abdominal-crunch": "eeJ_CYqSoT4",
    "prancha-lateral": "OVuNi3lbhjM",
    "dead-bug": "4XLEnwUr1d8",
    "russian-twist": "wkD8rjkodUI",
    "elevacao-pernas": "KCt2qWYPrMc",
    "esteira": "1Y0KGKe_Oew",
    "bicicleta": "2NlSyQjkEXY",
    "remo-ergometro": "2bimt8HydAM",
    "polichinelo": "YJbkVbNNops",
    "burpee": "MKuYq5FR_CM",
    "mountain-climber": "7W4JEfEKuC4",
    "agachamento-salto": "iDH79thBFTQ"
  };

  global.RF_DATA = {
    GROUP_LABELS,
    VIDEOS,
    EQUIP_LABELS,
    OBJECTIVE_LABELS,
    LEVEL_LABELS,
    LOCATION_LABELS,
    LOCATION_EQUIPMENT,
    SPLIT_HINTS,
    SCHEMES,
    SPLITS,
    EXERCISES
  };
})(window);
