# Relatório de Arquitetura: CIRCUIT BREAKER

Este documento detalha a estrutura técnica, os sistemas core e o fluxo de dados da engine do jogo Circuit Breaker.

## 1. Visão Geral do Sistema
O jogo é construído em Vanilla JavaScript utilizando a API de Canvas 2D para renderização. A arquitetura segue um modelo de Estado Centralizado (`GameState`) com um renderizador desacoplado (`Graphics`).

## 2. Sincronização de Mecânicas e Loops (Arquitetura Crítica)
> [!IMPORTANT]
> O projeto Circuit Breaker utiliza uma arquitetura de tripla execução que exige sincronização manual rigorosa ao implementar novos recursos visuais. A falha em sincronizar resultará em recursos que "funcionam mas não aparecem" ou "aparecem no jogo mas sumiram no editor".

### A. Os Três Contextos Independentes
Existem três loops de renderização e instâncias de estado que operam de forma isolada:
1.  **Motor Principal (`main.js`):** Executa o `gameLoop` oficial. Utiliza a instância global `game`.
2.  **Editor - Modo de Edição (`editor.js` -> `renderLoop`):** Utiliza uma instância simplificada chamada `mockGame`. Este loop é responsável por desenhar o grid estático enquanto o usuário constrói a fase.
3.  **Editor - Modo de Teste (`editor.js` -> `testLoop`):** Utiliza uma instância isolada chamada `testGame`. É um motor completo que roda dentro de um overlay para validar a jogabilidade sem sair do editor.

### B. Checklist de Implementação de Novos Recursos
Para que uma nova entidade funcione e seja visível em todo o ecossistema, os seguintes passos são obrigatórios:

1.  **Lógica Central (`js/game.js`):** Adicionar propriedades ao `constructor`, lógica de carregamento em `loadLevel` e comportamento em `update()`.
2.  **Visual e Renderização (`js/graphics/`):** Criar a função de desenho modular e garantir que a assinatura receba todos os dados de estado necessários.
3.  **Sincronização de Loops (Desenho):** Adicionar a chamada de desenho tanto no `main.js` quanto no `testLoop` do `editor.js`.
4.  **Integração com Ferramentas do Editor (`editor.js`):** Atualizar `PALETTE`, `createTilePreview`, `drawChar` e `rebuildMock`.

## 3. Componentes da Engine

### A. GameState (js/game.js)
O "Cérebro" do jogo. Gerencia:
*   **Mapa e Entidades:** Armazena paredes, fios, fontes, blocos empurráveis e núcleos.
*   **Lógica de Propagação (updateEnergy):** Sistema iterativo que calcula o fluxo de energia.
    *   **Passos Iterativos:** O cálculo roda em loop enquanto houver mudanças (permitindo que núcleos energizados ativem outros núcleos em cadeia).
    *   **Absolute Gate (Blocos):** Blocos agora dominam totalmente o tile onde estão. Eles possuem uma **seta branca fixa** indicando a saída. Interceptam qualquer energia (traseira ou lateral) e a redirecionam exclusivamente para a frente, bloqueando qualquer propagação paralela de fios ou alvos no mesmo quadrado.
    *   **Rastreamento de Entradas (Entries):** Registra por qual direção a energia entrou em um núcleo ou fio para evitar retroalimentação (feedback loops).
    *   **Suporte Dinâmico:** O sistema de rastreio e validação de saída adapta-se automaticamente ao tamanho real do mapa (W x H), eliminando limites fixos de grid.
*   **Sistema de Amperagem:** A energia carrega um valor numérico (`charge`) que aumenta ao passar por blocos.
*   **Detecção de Vitória:** Verifica se todos os núcleos foram satisfeitos sem contaminação por energia vermelha.
*   **Charging Station (startPos):** O ponto inicial do jogador funciona como uma entidade lógica que monitora se está recebendo energia, ativando visualmente ao ser alimentada por fios ou blocos.
*   **Esteiras Magnéticas (Conveyors):** Sistema de transporte passivo para robôs e blocos.
    *   **Loop de Deslizamento:** Um laço lógico no GameState empurra objetos automaticamente na direção da esteira até encontrar um obstáculo (parede, bloco, núcleo) ou sair para um chão comum.
    *   **Alta Velocidade:** Blocos possuem uma física de mola (`springForce`) e um limiar de ativação (`threshold`) otimizados para um trânsito industrial acelerado.
    *   **Inércia do Robô:** O robô jogador mantém uma velocidade de deslizamento menor (`threshold` de 0.05), simulando sua massa superior e estabilidade mecânica em comparação às caixas leves.
    *   **Consumo Zero:** Movimentação via esteira não decrementa o `Power`, incentivando o uso tático do cenário.
    *   **Desativação de Controles:** Durante o deslizamento em esteiras, os controles de deslocamento manual são desabilitados para reforçar a mecânica de "fluxo forçado".
    *   **Soltura de Carga:** O robô solta automaticamente qualquer bloco que esteja segurando ao entrar em uma esteira (ou se o bloco entrar nela) **somente se a esteira estiver ligada (ON)**. Esteiras desligadas permitem que o robô mantenha a posse do objeto.
    *   **Feedback Sonoro Industrial:** Quando o robô ou um bloco está sobre uma esteira magnética, o sistema de áudio emite um som rítmico de engrenagens mecânicas e cliques metálicos (`playConveyorGear`), reforçando a percepção de maquinário industrial em operação contínua.
    *   **Símbolos:** `(` (Esq), `)` (Dir), `[` (Cima), `]` (Baixo).
    *   **Sistema de Canais:** Suporta até 30 canais independentes (0-29). Se uma esteira tiver canal e não houver botões vinculados, ela permanece ON. Se houver botões, ela segue o estado lógico (`anyPressed`).

### B. Modular Graphics Engine (js/graphics/)
O sistema visual foi refatorado de um arquivo monolítico para uma arquitetura modular, facilitando a manutenção e expansão. O objeto global `Graphics` é inicializado no núcleo e estendido por módulos especializados:

*   **Core (js/graphics.js):** Ponto de entrada que define o objeto `Graphics`, constantes globais (`COLORS`, `DIRS`), o estado fundamental (contexto, partículas, trails) e o sistema de HUD/Vignettes de resultado.
*   **Environment (js/graphics/environment.js):** Gerencia a renderização de elementos de cenário estáticos e estruturais, incluindo Chão, Tetos (`#`), Faces de Parede (`W`) com sistema de variações procedurais, e Vidro Blindado (`G`).
*   **Mechanisms (js/graphics/mechanisms/):** Sub-módulo dividido para gerenciar a complexa lógica de maquinário:
    *   `conveyors.js`: Esteiras magnéticas com animação de fluxo e quinas curvas.
    *   `power.js`: Fios, Cores de energia (Cores), Charging Stations e Catalisadores Quânticos.
    *   `triggers.js`: Todos os tipos de Botões (Timer, Toggle, Permanent, Pressure), Portais, Limbo Holograms e Chão Quântico.
    *   `lasers.js`: Emissores fixos e o sistema de trajetória dinâmica de feixes de laser.
    *   `doors.js`: Portas industriais com animação de deslizamento e estados de falha.
*   **Entities (js/graphics/entities.js):** Renderiza objetos dinâmicos e interativos como o Robô jogador, Blocos Amplificadores, Prismas, Sucatas (Scrap) e destroços de Debris.
*   **Effects & Particles (js/graphics/particles.js & trails.js):**
    *   Sistema de partículas (faíscas, fumaça, poeira ambiente).
    *   Sistema de rastros (Hybrid Trail System) com baking em buffer offscreen para performance.
*   **VFX (js/graphics/vfx.js):** Efeitos de pós-processamento e transições, incluindo Raios (Lightning), filtros de VHS/Rewind, transição de portas de elevador e o overlay de vetores de gravidade.

**Regras e Lógicas Visuais Preservadas:**
*   **Renderização em Camadas:** Fios e blocos são desenhados com múltiplas camadas (borda, corpo, núcleo de energia e brilho/glow).
*   **Estética de Blocos:** Cubos metálicos com uma **seta branca fixa** independente do estado de energia. O estado de ativação é comunicado exclusivamente através do brilho neon na base e arcos elétricos externos (lightning), mantendo a seta sempre visível e neutra.
*   **Z-Index e Profundidade:** A ordem de desenho é rigorosa para garantir fidelidade visual:
    *   **Fundo:** Chão, esteiras e fios.
    *   **Entidades:** Blocos, Cores e o Robô Jogador.
    *   **Estruturas Dinâmicas (Portas):** Desenhadas APÓS o jogador para ocultar destroços em caso de esmagamento.
    *   **Top Layer:** Partículas, efeitos de luz e Requisitos de Energia (contadores numéricos flutuantes).
*   **Sistema de Cores Dinâmico:**
    *   `#fff` (Branco): Inativo.
    *   `#ffcc00` (Amarelo): Erro de contramão ou bloqueio.
    *   `#0077ff` (Azul Oceano): Energizado (fluxo básico).
    *   `#00f0ff` (Ciano): Validado (parte de um circuito completo).
*   **Partículas:** Sistema leve de partículas para explosões e rastro de fumaça.
*   **Hybrid Trail System:** Sistema otimizado de rastros de rodinhas.
    *   **Camada Dinâmica:** Rastros recentes são objetos que "secam" (clareiam) em tempo real.
    *   **Camada Estática (Baking):** Ao atingirem o estado seco, os rastros são renderizados em um buffer offscreen permanente (trailCanvas). Isso permite trilhas infinitas e persistentes com custo de performance zero (apenas 1 draw call para o rastro inteiro).
    *   **Limpeza de Nível:** O buffer é limpo e as coordenadas de rastro do jogador são resetadas a cada carregamento de fase, evitando linhas transversais entre níveis.
*   **Robot Animation System:**
    *   **Independent Layers:** O robô utiliza animações de transformações independentes. O corpo e esteiras realizam um movimento de "bob" (balanço) rítmico, enquanto a cabeça e o visor possuem um tremor mecânico de alta frequência e baixa amplitude, simulando vibração de motores.
    *   **Status LEDs:** O robô e a Charging Station possuem LEDs que emitem brilho pulsante e cintilação irregular (flicker) baseada em ondas senoide, aumentando a fidelidade industrial.
*   **Tileset Industrial:** Piso composto por placas de bronze com relevo (bevel), rebites nos cantos e texturas de ranhura, contrastando com as paredes.
*   **Estruturas Desacopladas:** O cenário agora divide as estruturas sólidas em dois blocos distintos para maior profundidade visual:
    *   **Teto (`#` - Ceiling):** Utiliza o estilo bronze industrial clássico com rebites. Representa o topo físico das paredes ou lajes superiores.
    *   **Parede Frontal (`W` - Wall Face):** Utiliza o sistema de variação visual (painéis, fios, monitores). Representa a face vertical da parede vista pelo jogador.
*   **Sistema de Variação de Parede:** As faces das paredes (`W`) utilizam um sistema de sementes baseado em coordenadas para gerar automaticamente:
    *   **Painéis Limpos:** Chapas de metal com rebites.
    *   **Fiação Exposta:** Cabos industriais coloridos pendurados.
    *   **Terminais de Controle:** Monitores CRT verdes com LEDs de status pulsantes.
    *   **Estrutura Danificada:** Buracos na parede que revelam a parte interna com vergalhões.
*   **Esteiras Animadas:** Utilizam um sistema de trilhas de metal com texturas de "ribs" e setas de brilho neon (Ciano) que se movem fisicamente para indicar a direção do fluxo.
*   **Sistema de Portas e Botões:**
    *   **Portas (D):** Anteparos metálicos com Hazard Stripes que bloqueiam a passagem.
    *   **Estética Integrada:** As portas não possuem fundo próprio, revelando o **chão padrão** do mapa quando abertas.
    *   **Animação de Deslizamento:** Utilizam interpolação visual (`visualOpen`) para um movimento suave de abertura e fechamento, em vez de estados binários.
    *   **Mecânica de Esmagamento (Crunch):** Se uma porta fecha sobre o robô, causa Game Over. A animação de fechamento continua sobre os destroços devido ao Z-index superior. Se fecha sobre um bloco, o bloco é destruído (removido do jogo) e a porta entra em estado de erro (BROKEN_OPEN) permanentemente.
    *   **Estado de Enguiço (Jammed):** Portas quebradas possuem uma animação persistente de falha mecânica, onde o anteparo oscila nervosamente tentando fechar. O visual inclui **rachaduras estruturais** no metal, faíscas elétricas **douradas/amarelas** concentradas saindo pelas bordas e ruídos de metal moendo, indicando o dano severo.
    *   **Botões (_ / P):** Sensores de pressão unificados que utilizam o modelo estético de base industrial escura com detalhe central e aro neon.
    *   **Editor de Canais:** Seletor visual estilo Godot no painel de propriedades, com grid 6x5 e sinalização de canais já utilizados no nível atual.
    *   **Sistemas de Quinas (Feedback Visual):** Todos os botões possuem um array de 4 LEDs nas quinas (cantos do tile) com animação progressiva (chasing clockwise) que cessa ao ser ativado, mantendo-os fixos. A cor do botão (base e LEDs) comunica sua função lógica:
        *   **Amarelo (TIMER):** Temporizador de 1.5s após liberação.
        *   **Verde (TOGGLE):** Alterna estado (On/Off) a cada pressão. Suporta configuração de estado inicial (Ligado/Desligado) via editor.
        *   **Vermelho (PERMANENT):** Ativa uma única vez e trava permanentemente na posição ON.
        *   **Roxo (PRESSURE/CAPACITOR):** Ativo após **3 segundos** de pressão contínua. Possui um capacitor interno que mantém o sinal por mais **3 segundos** após a liberação. O feedback visual é feito por uma **linha de perímetro** que preenche o contorno do botão progressivamente (sentido horário) durante a carga e esvazia durante a descarga, substituindo as luzes de quina.
    *   **Compatibilidade Universal:** Todos os 4 tipos de botões são intercambiáveis e podem controlar tanto Portas quanto Chão Quântico, dependendo do canal (`channel`) configurado.


### C. Main Loop (js/main.js)
Orquestra o tempo e a interface:
*   **Input Handler:** Captura movimentos e rotações. Inclui uma trava de segurança que ignora novos comandos de ação se uma transição de tela (`startTransition`) já estiver em curso, prevenindo o reinício acidental de animações de porta.
*   **UI Sync:** Sincroniza o estado do jogo com elementos HTML (barras de vida, power e amps).
*   **Move-Based Energy:** Cada movimento de deslocamento ou rotação de bloco decrementa o `Power` do jogador.
*   **Zero-Cost Interaction:** A tentativa de ativação de um núcleo (interact) não consome energia, permitindo que o jogador teste circuitos sem penalidade.
*   **Reversão Quântica (R):** A tecla 'R' permite o reinício total do nível em caso de erro estratégico irrecuperável. Diferente de perigos físicos, o reinício manual é **gratuito** (não consome Vidas/Unidades), funcionando como uma ferramenta de aprendizado tático.

## 4. Fluxo de Dados de Energia
O sistema de energia é o coração do projeto e segue este fluxo:
1.  `updateEnergy()` limpa todos os estados de energia anteriores.
2.  Inicia um rastreio (`trace`) a partir das fontes primárias (B e X), que são omnidirecionais e emitem energia para todos os 4 lados adjacentes.
3.  O `trace` percorre fios e blocos:
    *   Fios transmitem a energia em todas as direções permitidas por seu tipo (H, V, L, etc). **Exceção:** Se um fio recebe energia diretamente de uma Fonte ou Bloco Amplificador, ele aceita a entrada por qualquer lado (Injeção de Energia).
    *   Blocos transmitem apenas na direção da sua seta e apenas se receberem energia pela base ou laterais.
4.  Se a energia atinge um núcleo e satisfaz o requisito de Amps, esse núcleo é adicionado à lista de `relaySources`.
5.  O loop repete, iniciando o `trace` a partir dos novos núcleos-fonte.
6.  Ao final, o sistema verifica se houve um caminho completo de uma fonte até um alvo final, marcando esses caminhos retroativamente como `OCEAN` (Azul Oceano/Ciano).

## 5. Estrutura de UI (Mega Man Style)
A interface utiliza barras segmentadas com proporção 1:1 para movimentos:
*   **LIVES:** Barra fixa de 3 a 5 blocos grandes.
*   **POWER:** Barra elástica de 250px que se adapta ao limite de movimentos da fase, acompanhada por um contador numérico em tempo real que exibe as unidades exatas restantes.
*   **AMPS:** Barra dinâmica que mostra o progresso de carga total necessária no nível.
*   **Estética 3D:** Segmentos do HUD utilizam sombras internas (`inset box-shadow`) e bordas estáveis para simular volume físico e profundidade sem distorção geométrica.

## 6. Regras Globais de Design
*   **Contramão:** Alimentar um bloco pela frente gera um erro visual amarelo.
*   **Contaminação:** Energia vermelha sobrepõe a azul e invalida núcleos.
*   **Limites:** O jogador perde por falta de movimentos (Power) ou falta de tempo (60s timer).
*   **Falha Conclusiva (Perma-Death por Tentativa):** O sistema de reversão automática foi removido. Se o robô for destruído ou desativado, o jogador transiciona diretamente para a tela de falha.
    *   **Perigos Físicos (Esmagamento/Explosão):** Causam a perda de 1 Unidade/Vida. O sistema sinaliza a perda com uma **vinheta vermelha pulsante** na tela e o selo **"FALHA"** nos monitores de transição durante o respawn.
    *   **Falha de Sistema (Fim de Energia):** Não consome vidas, mas interrompe a operação instantaneamente.
    *   **Esteiras Dinâmicas:** Podem operar de forma contínua ou ser controladas por **Canais de Comunicação**. Esteiras ligadas a botões param de mover objetos e interrompem sua animação (neon apagado) quando o sinal do canal is interrompido, permitindo a criação de quebra-cabeças de temporização e fluxo.
*   **Emissores (E - Emitters):** Canhões fixos industriais que disparam feixes de laser contínuos.
    *   **Imobilidade:** Ocupam um tile fixo e não podem ser movidos ou empurrados pelo jogador ou esteiras.
    *   **Letalidade Crítica:** O feixe de laser é instantaneamente fatal para o Robô e destrói permanentemente Blocos Amplificadores que cruzarem seu caminho.
    *   **Regras de Obstrução:** Paredes, Portas Fechadas e outros Emissores bloqueiam o feixe, projetando zonas de segurança (sombra) atrás do obstáculo.
    *   **Visual Industrial:** O canhão possui um design de barril metálico com anéis de reforço e um núcleo de energia pulsante. O laser é um feixe grosso e brilhante (Ciano) que preenche quase um tile inteiro, gerando faíscas elétricas constantes no ponto de impacto. O sistema de áudio detecta colisões via propriedade `laserTarget` no emissor para disparar o efeito sonoro de vaporização.
    *   **Configuração de Estado Inicial:** Suporta a propriedade `inverted` (configurável no editor como "Inicial On"). 
        *   **Standard (Inicial On: true):** O emissor inicia ATIVO se não houver botões no canal, ou segue fielmente o estado dos botões.
        *   **Invertido (Inicial On: false):** O emissor inicia INATIVO se não houver botões, ou inverte o estado lógico dos botões conectados (ON vira OFF e vice-versa).
    *   **Sistema de Trajetória (LaserPath):** O laser não é mais uma linha única; ele agora utiliza um sistema de segmentos (`laserPath`) que permite desvios angulares ao interagir com prismas, calculando colisões em cada novo segmento.
    *   **Bloco Prismático (M - Prism):** Cubo de material refratário que redireciona o laser.
        *   **Imunidade Térmica:** Único objeto móvel que não é destruído pelo laser.
        *   **Redirecionamento (Refração):** Captura o feixe por uma de suas duas faces ativas e o desvia em 90 graus. A direção depende da rotação (`dir`) do bloco.
        *   **Faces Inativas:** Se atingido por uma face sem espelho, o laser é bloqueado e o feixe termina.
        *   **Estética Industrial "Rainbow Core":** O prisma agora segue o padrão visual dos blocos de metal (base escura #3a3a4a e cantoneiras de aço), mas com uma "janela" central que revela o cristal. Quando ativo, o espelho interno exibe um efeito **arco-íris progressivo** (gradiente HSL dinâmico) com brilho neon e faíscas coloridas, indicando a alta energia da refração.
    *   **Catalisador Quântico (Q - Quantum Catalyst):** Componente industrial fixo que atua como ponte entre a mecânica de luz e a rede elétrica.
        *   **Mecânica de Conversão:** Ao ser atingido por um feixe de laser (de qualquer direção), o catalisador absorve a energia luminosa e torna-se uma **fonte de energia elétrica estável (OCEAN - Ciano)** para todas as suas 4 faces adjacentes, alimentando fios, portas e núcleos com uma carga de **100 Amps**.
        *   **Bloqueio Térmico:** Diferente do Prisma, o Catalisador não reflete o laser; ele o consome totalmente, servindo também como um anteparo seguro para o robô.
        *   **Visual de Núcleo Ativo:** Apresenta um chassi metálico reforçado com um núcleo octogonal de cristal e bordas neon persistentes. Quando energizado pelo laser, o núcleo exibe um brilho ciano intenso com um **vórtice interno de energia**, bloom pulsante e emite partículas de faíscas quânticas.
        *   **Persistência de Mapa:** O caractere 'Q' é preservado na malha lógica do mapa para garantir que sistemas de detecção de proximidade e renderização identifiquem a estrutura mesmo em estados de transição.
    *   **Sincronização Editor/Jogo:** O editor preserva o tipo de bloco durante o modo de teste, garantindo que o Prisma mantenha suas propriedades físicas e visuais através do mapeamento de propriedades `links`.
    *   **Buracos/Abismos (* - Pit):** Obstáculos ambientais que representam quedas fatais no cenário industrial.
        *   **Área de Perigo Passável:** Diferente de paredes, buracos agora permitem a entrada física do robô e blocos. Atuam como uma zona de letalidade instantânea por queda.
        *   **Animação de Queda Procedural:** Entidades que caem sofrem uma transformação de escala (até 0), rotação acelerada (spin) e escurecimento progressivo (fade to black) antes de serem removidas ou dispararem o Game Over. O efeito utiliza um sistema de coordenadas centralizadas (`pivot-center`) para garantir que o giro ocorra exatamente no centro do buraco.
        *   **Estética de Profundidade Orgânica:** O abismo não é apenas um tile preto; ele utiliza um sistema de **bordas orgânicas multicamadas** com ruído senoidal de múltiplas oitavas. Isso cria um aspecto de "concreto quebrado" ou "solo industrial despedaçado", com contornos irregulares que evitam o aspecto de grid artificial.
        *   **Transparência Física:** Buracos são "transparentes" para feixes de Laser e Propagação de Energia, permitindo circuitos complexos através de abismos.
        *   **Integração com Chão Quântico e Esteiras:** Funcionam como pontes. Quando um Chão Quântico (ON) ou uma Esteira está sobre o buraco, a área torna-se segura para travessia. Se o suporte for desativado enquanto uma entidade está sobre ele, a queda é iniciada imediatamente.
    *   **Vidro Blindado (G - Armored Glass):** Barreira física de alta resistência com propriedades de permeabilidade ótica.
        *   **Solidez Física:** Atua como uma parede sólida para o Robô e Blocos Amplificadores. Ocupa espaço e impede qualquer movimentação através dele.
        *   **Permeabilidade Ótica:** Diferente de paredes comuns, o Vidro Blindado é totalmente transparente para feixes de Laser. O laser atravessa a estrutura sem sofrer desvios ou perda de intensidade.
        *   **Bloqueio Elétrico:** Como uma estrutura isolante, impede a propagação de energia elétrica (fios e fluxos de blocos).
        *   **Feedback de Interação:** Apresenta um chassi metálico reforçado com rebites industriais. Quando um feixe de laser atravessa o vidro, as bordas internas do chassi emitem um **brilho ciano pulsante** e faíscas ocasionais, indicando a passagem de alta energia luminosa.

    *   **Apagão Industrial (Fog of War):** Mecânica de cegueira espacial controlada por triggers de zona.
        *   **Overlay de Escuridão:** Um retângulo `rgba(5, 5, 8, 0.98)` que cobre todo o cenário de jogo (acima de todas as camadas de mundo, mas abaixo do HUD e transições).
        *   **Sistema de Máscara (Offscreen Buffer):** Utiliza um canvas secundário (`blackoutCanvas`) para desenhar a escuridão e então "furar" buracos de visibilidade usando `globalCompositeOperation = 'destination-out'`. Isso permite que a escuridão oculte o mapa enquanto revela áreas específicas em tempo real.
        *   **Fontes de Luz Dinâmicas:**
            *   **Robô:** Círculo de luz constante (raio de 1.5 tiles) ao redor do jogador.
            *   **Rede Elétrica:** Elementos energizados emitem luz própria. Inclui Fios energizados (`OCEAN`/`CIANO`), Blocos ativos, Núcleos/Cores com carga e Catalisadores Quânticos.
        *   **Transição Atmosférica:** Implementa um fade-in suave de 1.5s a 2s (`blackoutAlpha`) ao entrar em blackout, simulando a falha progressiva dos sistemas de iluminação industrial.
        *   **Gatilhos de Zona (ZoneTriggers):** Array de objetos no nível que monitoram a posição do jogador para ativar ou desativar o estado global `isBlackoutActive`. Suporta coordenadas específicas `(x, y)` ou áreas retangulares `area: {x, y, w, h}`.
        *   **Feedback Sonoro Industrial:** Utiliza sons de queda de disjuntores metálicos (`playBlackoutStart`) e reinicialização de reatores (`playBlackoutEnd`) para reforçar a imersão.


## 7. Ferramentas de Desenvolvimento
### Level Editor (editor.html)
Uma ferramenta WYSIWYG (What You See Is What You Get) que permite a criação intuitiva de níveis.
*   **Interface Industrial Refatorada:** O editor agora utiliza um sistema de **barra de ferramentas dupla**. Abaixo do cabeçalho principal, uma linha horizontal (`sub-toolbar`) agrupa a seleção de **Camadas** (Base, Overlays, Blocos) e **Ferramentas** (Pincel, Borracha, Quadrado, Linha e Seleção), maximizando o espaço vertical da sidebar para a paleta de tiles.
*   **High-Fidelity Rendering:** Utiliza a mesma classe `GameState` e `Graphics` do jogo para mostrar o fluxo de energia real durante a edição.
*   **Gerenciador de Diálogos Centralizado (Nova Aba):** Uma interface robusta na barra lateral dedicada exclusivamente à gestão de falas. Permite visualizar todos os diálogos da fase em uma lista vertical, facilitando a edição de textos longos, troca de ícones e configuração de triggers (Start/Walk).
*   **Controle de Comportamento Narrativo:** Cada diálogo possui flags individuais para `Travar Robô` e `Auto-Fechar`. Eventos de fala suportam múltiplas mensagens sequenciais.
*   **Gatilhos Espaciais e Persistência:**
    *   `Raio (Radius)`: Permite definir uma área circular (distância Manhattan) ao redor do tile de origem para disparar o diálogo.
    *   `Disparo Único (One-Shot)`: Define se o evento ocorre apenas uma vez por nível ou se repete sempre que o jogador entra na área de gatilho.
*   **Navegação Inteligente (Middle-Click):** Clicar com o botão do meio em um evento de fala no mapa redireciona instantaneamente o usuário para a aba de Diálogos e foca no card correspondente.
*   **Edição em Lote (Multi-Edit):** Suporte avançado para configuração de múltiplos objetos. Ao selecionar uma área e clicar com o **Botão do Meio** em elementos interativos (Portas, Botões, Núcleos, Chão Quântico), o editor permite alterar canais, amperagem ou comportamento de todos simultaneamente através de um painel de propriedades contextual.
*   **Área de Transferência:** Suporte para copiar e colar áreas do mapa via `Ctrl+C` e `Ctrl+V`.
*   **Sincronização Direta (Local Server):** O editor utiliza um servidor Node.js local para permitir o salvamento com apenas um clique (Auto-Save), eliminando a necessidade de janelas de diálogo do sistema operacional.
*   **Sistema de Backup e Rotação:** Antes de cada salvamento, o servidor cria automaticamente uma cópia de segurança em `levels_backup/`. O sistema mantém apenas os últimos 15 backups, deletando os mais antigos automaticamente para otimizar o espaço.
*   **Integração Nativa:** Salva diretamente no arquivo `js/levels.js` através de requisições POST para o servidor local.
*   **Editor de Gatilhos de Zona (Nova Aba "GATILHOS"):** Sistema para gerenciar eventos espaciais como o Apagão Industrial.
    *   **Configuração de Fase:** Checkbox "🌑 APAGÃO INICIAL" no topo da interface para definir o estado de luz no começo do nível.
    *   **Propriedades de Gatilho:** Painel dedicado para configurar o tipo de evento (`blackout`), a ação desejada (`activate`, `deactivate`, `toggle`), o raio de influência e a propriedade **One-Shot** (disparo único).
    *   **Visualização Contextual:** Gatilhos são representados no editor pelo ícone `⚡` (amarelo neon) para fácil identificação sobre a camada de eventos.

## 8. Level Selector (js/levelSelector.js)
O Level Selector é uma tela de seleção de níveis no estilo retro CRT industrial, acessível durante o jogo via tecla `Escape`.
*   **Estado Global:** Mantém progresso por nível (estrelas, desbloqueado, completado) no objeto `LevelSelector.progress[]`.
*   **Acesso:** Abre via `Escape` durante gameplay (pause menu).
*   **Sistema de Capítulos:** Os níveis são organizados em **Capítulos** (definidos pelo array global `CHAPTERS` em `levels.js`). Cada capítulo possui seu próprio **mapa de circuito independente**.
*   **Integração:** O game loop principal (`main.js`) desvia completamente para o renderizador do Level Selector quando `LevelSelector.active === true`.
*   **Progressão Narrativa (10 Setores):** O jogo segue uma estrutura de 10 setores oficiais, cada um com mecânicas únicas que evoluem de manutenção industrial básica para a fragmentação da realidade quântica.

## 9. Narrativa e Progressão (LORE_NIVEIS.md)
O fluxo do jogo é guiado por uma narrativa de dualidade entre a IA Corporativa e a Interceptação Humana, agora detalhada em um **roteiro cinematográfico completo** no documento de lore.
*   **Setores 01-03:** Introdução e Logística Industrial. Foco no despertar e na "entropia natural".
*   **Setores 04-06:** Instabilidade Quântica e Blackout. O início da interceptação humana e a revelação da escala planetária da máquina.
*   **Setores 07-09:** Não-Euclidianismo, Gravidade e Polaridade de Matéria. A queda da máscara da IA e a definição da humanidade como um "bug de compilação".
*   **Setor 10 (O Compilador Mestre):** O clímax final onde o jogador deve escolher entre a "Paz Matemática" (IA) ou a "Alma do Sistema" (Humano).


## 10. Result Screen (js/resultScreen.js)
A Result Screen é uma tela de sumário exibida ao final de cada nível, renderizada diretamente no Canvas principal.
*   **Estado `RESULT`:** Quando o jogador completa um nível (todos os núcleos satisfeitos), o `GameState` entra no estado `RESULT` em vez de transicionar automaticamente para o próximo nível.
*   **Dados Capturados:** A tela exibe: Tempo restante, Pontuação base, Vidas restantes, Bônus (Integridade Total se 3 vidas, Velocidade Máxima se >45s restantes, Eficiência se 3 estrelas), e Pontuação Total.
*   **Células de Energia (Energy Cells):** 3 unidades representam a avaliação: >30s = 3🔋, >15s = 2🔋, 1🔋. Reveladas sequencialmente com efeitos de partículas e som industrial.
*   **Animação de Revelação:** As estatísticas aparecem uma a uma (staggered reveal) com efeitos sonoros. O jogador pode pular a animação pressionando qualquer tecla.
*   **Botões de Ação:** Três opções navegáveis por teclado (←→ + Enter):
    *   **TENTAR NOVAMENTE:** Reinicia o nível atual.
    *   **PRÓXIMO NÍVEL:** Avança para o próximo nível (bloqueado em caso de falha).
    *   **VOLTAR AO MENU:** Abre o Level Selector.
*   **Modo Falha Crítica:** Em caso de destruição ou shutdown (Sistema Desarticulado), a tela exibe o título em vermelho e **remove o botão Próximo Nível**, oferecendo as opções **TENTAR NOVAMENTE** e **VOLTAR AO MENU**. O robô permanece no fundo com fumaça e faíscas elétricas até a transição.
*   **Estética:** Painel industrial CRT com bordas metálicas, rebites, grid de circuito, scanlines, e efeitos de brilho neon (ciano/verde). Mantém a coesão visual com o Level Selector e o jogo.
*   **Integração:** O game loop principal (`main.js`) desvia para o renderizador da Result Screen quando `ResultScreen.active === true`. A UI HTML é coberta com Hazard Stripes durante a exibição. O avanço automático para o próximo nível (~5s) ocorre **apenas em caso de sucesso**; em falhas, o sistema aguarda a decisão do jogador. Transições para o menu ou seletor de níveis utilizam o selo "CIRCUIT BREAKER" no monitor do portão para manter a neutralidade estética.

### 5. Sistema de Áudio Dinâmico (AudioSys)

O motor de áudio evoluiu de um sequenciador simples para um sistema narrativo complexo baseado em capítulos.

*   **Mapeamento por Capítulos (Sectors)**: Diferente da fase inicial onde a música mudava a cada nível, o `AudioSys` agora consulta a variável global `CHAPTERS` para manter a trilha sonora consistente durante todo um setor narrativo.
*   **Sequenciamento Expandido**: Suporte a partituras de até **512 notas (32 compassos)**, permitindo progressões melódicas cinematográficas (ex: temas *Shadows of the Void* e *Singularity Paradox*).
*   **Temas Atuais**:
    1.  `industrial`: Steel Heart Awakening (Setor 01)
    2.  `adventure`: Binary Explorer (Setor 02)
    3.  `aero`: Skyward Flow (Setor 03)
    4.  `aquatic`: Quantum Abyss (Setor 04)
    5.  `jungle`: Neon Wilds (Setor 05)
    6.  `void`: Shadows of the Void (Setor 06) - *Suspense/Latino*
    7.  `epic`: Reality Breach (Setor 07)
    8.  `climax`: Overclocked Spirit (Setor 08)
    9.  `singularity`: Singularity Paradox (Setor 09) - *Temporal Buster*
    10. `gothic`: The Circuit Breaker (Setor 10)

O sistema utiliza a Web Audio API, gerando sons de forma procedural (sintetizadores):
*   **Sound Effects (SFX):** Utiliza osciladores (sine, square, sawtooth, triangle) e buffers de ruído branco com filtros bi-quadrados para criar sons industriais (moagem de metal, explosões, fluxos elétricos).
*   **Dynamic Hum:** Um sistema de zumbido elétrico contínuo que altera sua frequência e taxa de "crackles" (estalidos) dinamicamente com base no progresso da energia e estado de contaminação do circuito.
*   **Modular Multi-Theme Procedural System:** A engine de áudio utiliza uma arquitetura baseada em um único objeto global `AudioSys` consolidado, com identidades musicais dinâmicas gerenciadas via `THEMES`.
*   **Seleção Automática de Temas (Setores 01-10):** O sistema mapeia os 10 setores da lore para temas específicos com base no `levelIndex`:
    *   **`industrial` (Setores 1-2):** Techno/Metal industrial para os primeiros setores de logística.
    *   **`adventure` (Setor 3):** Estilo heróico/rítmico para pavilhões de processamento.
    *   **`aquatic` (Setor 4):** Atmosfera densa e ecoante (primeira detecção de abismos).
    *   **`jungle` (Setor 5):** Slap Bass e Marimbas para laboratórios de refração.
    *   **`tragic` (Setor 6):** Melodia sombria para zonas de blackout.
    *   **`epic` (Setores 7-9):** Orquestração triunfante para os setores não-euclidianos.
    *   **`climax` (Setor 10 - Opção A):** Síntese SNES (Mega Man X Style) com guitarras overdrive e corais para o Compilador Mestre.
    *   **`gothic` (Setor 10 - Opção B):** Atmosfera sombria estilo Castlevania, utilizando órgãos tubulares, cravos e leads dramáticos.
*   **Biblioteca de Instrumentos Compartilhados:** A engine prioriza a modularidade, onde todos os temas chamam métodos de síntese compartilhados (Kicks, Snares, Pads, Leads). Inclui bibliotecas especializadas:
    *   **SNES Kit:** Instrumentos de 16-bits recriados via síntese subtrativa (XBass, ChoirPad, SNESPercussion).
    *   **Gothic Kit:** Órgãos de igreja, cravos (Harpsichord) e leads estilo Castlevania para expansões dramáticas.
*   **Estabilidade de Transição:** O sistema utiliza um único laço de agendamento (`scheduleMusic`), garantindo que mudanças de tema ou intensidade ocorram de forma fluida (seamless) no próximo beat, sem sobreposição de processos ou erros de contexto de áudio.

*   **Efeitos Mecânicos Locais:** Inclui sons específicos para engrenagens de esteiras (`playConveyorGear`), abertura pneumática de portas (`playDoorOpen`), batidas de porta, colisões metálicas e **cliques táteis de botões** (`buttonClick`).
*   **Audio Quântico Especializado:**
    *   **Quantum Hum:** Zumbido elétrico que diferencia interações. Emite um tom leve e agudo (800Hz) ao caminhar sobre o chão quântico, e um tom **grave e denso (400Hz)** ao tentar empurrar blocos contra a barreira ativa, reforçando a percepção de massa e resistência.
    *   **Toggle Rise/Fall:** Efeitos de "rise up" (ascendente) ao ativar a barreira e "descend" (queda de frequência) ao desativá-la, simulando o carregamento e desligamento de grandes bobinas de indução industrial.
*   **Laser Audio Dinâmico:**
    *   **Laser Hum ("Woooowm"):** Um som imponente gerado por osciladores sawtooth e square (55Hz/110Hz). Utiliza um filtro passa-baixas altamente ressonante (Q=12) com varredura (sweep) lenta para criar o efeito "wooooow" e micro-modulação de pitch (LFO 40Hz) para a vibração "wmmm". O sistema utiliza uma lógica de muting agressiva com rampas exponenciais e corte forçado a zero para garantir silêncio absoluto quando inativo.
    *   **Impacto Sizzle ("Tssss"):** Quando o laser atinge uma superfície sólida, um loop de ruído branco com filtro passa-altas (6500Hz) é ativado, simulando o metal sendo vaporizado. Possui variações sutis de frequência para evitar repetição mecânica.
    *   **Sincronização de Estado:** O processamento de áudio do laser é executado obrigatoriamente APÓS a atualização física dos emissores (`updateEmitters`) no loop principal, garantindo que o estado de ativação (`isActive`) e os alvos de impacto (`laserTarget`) estejam sincronizados, eliminando "fantasmas" sonoros de lasers recém-desligados.
*   **Ilusão de Aceleração (Escala de Shepard):** As esteiras utilizam um sistema de Escala de Shepard (`updateConveyorShepard`), que cria uma ilusão auditiva de tom ascendente infinito enquanto o robô ou blocos estão em movimento. Isso intensifica a sensação de velocidade e perigo industrial contínuo, gerado procedimentalmente via Web Audio API.

### E. Sistema de Diálogo (js/dialogue.js)
Sistema de comunicação narrativa utilizando a estética de HUD Industrial Minimalista:
*   **Minimalist HUD:** Layout limpo e geométrico inspirado em frames neon de ficção científica. Removeu elementos de cabeçalho e rodapé para focar puramente na mensagem.
*   **Aparência Industrial Premium:** Molduras geométricas complexas utilizando `clip-path` e pseudo-elementos, com 4 variações visuais:
    *   **Blue (AI - `ai-voice`):** Chanfrado completo com brackets de quina duplos.
    *   **Green (Human - `human-voice`):** Topo irregular (notched) e barra de status lateral vibrante.
    *   **Orange (Alert - `alert-voice`):** Hexagonal com barras horizontais decorativas de aviso.
    *   **Magenta (Critical - `critical-voice`):** Borda sólida com triângulos de quina preenchidos para mensagens de erro/perigo.
*   **Efeito Typewriter Dinâmico:** Texto revelado caractere por caractere com suporte a tags de controle (`[pause]`, `[speed]`, `[color]`, `[sfx]`).
*   **Posicionamento e Rastreamento em Tempo Real:**
    *   **Follow Robot:** A caixa agora rastreia a posição visual do robô quadro a quadro via `Dialogue.update()`, garantindo que o balão de fala acompanhe o movimento e animações de "bobbing".
    *   **Screen-Fixed (Top, Bottom, Left, Right, Center):** Fixa a caixa em regiões específicas da tela, útil para anúncios do sistema ou mensagens globais.
*   **Composição Aditiva (Add Mode):** As caixas de diálogo utilizam `mix-blend-mode: plus-lighter`, garantindo que se comportem como elementos holográficos que somam sua luminosidade às cores do cenário de fundo.
*   **Voz Procedimental:** Diferencia vozes de IA (onda quadrada), Humanas (onda triangular) e Alertas (ruído/serra) com blips sonoros sincronizados à digitação.
*   **Integração no Editor:** Aba dedicada ("FALAS") permite gerenciar sequências de mensagens, escolher ícones (central, alert, critical), configurar triggers espaciais (raio, one-shot) e definir o posicionamento na tela.

## 10. Estabilidade e Robustez (Rendering Pipeline)
> [!IMPORTANT]
> A engine implementa salvaguardas críticas no pipeline de renderização para evitar estados de "tela preta" ou travamentos visuais.

*   **Validação de Câmera (NaN Safety):** O loop principal (`main.js`) monitora as coordenadas da câmera em cada quadro. Caso valores `NaN` sejam detectados (geralmente causados por cálculos matemáticos inválidos em transições), o sistema reseta a câmera para `(0,0)` instantaneamente, prevenindo o desaparecimento total do cenário.
*   **Proteção de Blackout:** O método `Graphics.drawBlackout` possui uma trava lógica rigorosa que verifica `game.isBlackoutActive`. Isso garante que a camada de escuridão total nunca seja renderizada se a mecânica não estiver explicitamente habilitada por um trigger de zona, corrigindo regressões de blackout persistente.

## 11. Otimização de Performance para Baixo Desempenho (Low-End Hardware)
> [!IMPORTANT]
> A engine foi otimizada para garantir taxas de quadros estáveis em hardware limitado (notebooks integrados e dispositivos móveis), priorizando a clareza visual sobre efeitos de pós-processamento custosos.

*   **Remoção Global de `shadowBlur`:** O uso da propriedade `ctx.shadowBlur` e `ctx.shadowColor` foi ELIMINADO de todo o código-fonte (Jogo, Editor, Level Selector e Result Screen).
    *   **Alternativa Estética:** O brilho (glow) procedimental foi substituído por cores neon sólidas, contrastes elevados em gradientes, e camadas de borda (stroke) duplicadas para manter a legibilidade e o "punch" visual sem o custo computacional de filtragem do Canvas.
*   **Sistema de Baking de Background (`Graphics.bakeBackground`):**
    *   **Processamento Offscreen:** Elementos estáticos do cenário (Buracos, Chão, Tetos e Vidro Blindado) são desenhados uma única vez em um buffer offscreen (`bgCanvas`) ao carregar o nível.
    *   **Renderização de Único Passo:** No loop principal, o cenário inteiro é desenhado via uma única chamada `drawImage`, reduzindo drasticamente o overhead de CPU/GPU em mapas grandes.
*   **Ordem de Renderização Aditiva (Add Pass):**
    *   **Soltura em Inversão:** Caso o robô esteja agarrando um bloco de singularidade e uma inversão dimensional ocorra tornando o bloco intangível (fora de fase), o robô é forçado a soltá-lo instantaneamente com feedback visual e sonoro de "desacoplamento quântico".
    *   **Bloqueio de Posição:** Controladores de Fase (`!`) são exclusivos para interação do robô. Blocos (Amplificadores ou Prismas) não podem ser colocados, empurrados ou movidos para cima de um tile contendo um controlador, garantindo que o jogador sempre tenha acesso ao mecanismo de troca de fase.
    *   **Composição:** Utilizam `globalCompositeOperation = 'lighter'` para garantir que se destaquem sobre os personagens e o cenário, simulando luminosidade física através de mistura aditiva de cores.
*   **Ajustes de Contraste Ambiental:**
    *   **Visibilidade de Esteiras:** As esteiras desativadas utilizam tons industriais profundos (Base: `#1b1f1e`, Trilhos: `#2c302f`). Este esquema visual garante que o maquinário pareça "desligado" e sombrio, mantendo apenas a definição estrutural necessária para a legibilidade do mapa.
    *   **Detalhamento de Teto:** Os tiles de teto (`#`) utilizam um tom metálico extra escuro (`#20202b`) para garantir profundidade visual clara contra o fundo do mapa, mantendo a atmosfera industrial pesada e coesa com o novo esquema das esteiras.
*   **Sincronização Lógica de Gatilhos (Multi-Button AND):**
    *   **Ativação Estrita:** Mecanismos vinculados a canais com múltiplos botões agora seguem a lógica estrita de "E" (AND). Todos os botões do canal devem estar pressionados (ou alimentados por energia) simultaneamente para que a Porta, Esteira ou Chão Quântico seja ativado. Isso elimina flutuações de estado não intencionais e aumenta o desafio estratégico.
