# Relatório de Arquitetura: CIRCUIT BREAKER

Este documento detalha a estrutura técnica, os sistemas core e o fluxo de dados da engine do jogo Circuit Breaker.

## 1. Visão Geral do Sistema
O jogo é construído em Vanilla JavaScript utilizando a API de Canvas 2D para renderização. A arquitetura segue um modelo de Estado Centralizado (`GameState`) com um renderizador desacoplado (`Graphics`).

## 2. Componentes da Engine

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
    *   **Feedback Sonoro Industrial:** Quando o robô ou um bloco está sobre uma esteira magnética, o sistema de áudio emite um som rítmico de engrenagens mecânicas e cliques metálicos (`playConveyorGear`), reforçando a percepção de maquinário industrial em operação contínua.
    *   **Símbolos:** `(` (Esq), `)` (Dir), `[` (Cima), `]` (Baixo).
    *   **Sistema de Canais:** Suporta até 30 canais independentes (0-29). Se uma esteira tiver canal e não houver botões vinculados, ela permanece ON. Se houver botões, ela segue o estado lógico (`anyPressed`).

### B. Graphics (js/graphics.js)
Responsável por toda a parte visual:
*   **Renderização em Camadas:** Fios e blocos são desenhados com múltiplas camadas (borda, corpo, núcleo de energia e brilho/glow).
*   **Estética de Blocos:** Cubos metálicos com uma **seta branca fixa** independente do estado de energia. O estado de ativação é comunicado exclusivamente através do brilho neon na base e arcos elétricos externos (lightning), mantendo a seta sempre visível e neutra.
*   **Z-Index e Profundidade:** A ordem de desenho é rigorosa para garantir fidelidade visual:
    *   **Fundo:** Chão, esteiras e fios.
    *   **Entidades:** Blocos, Cores e o Robô Jogador.
    *   **Estruturas Dinâmicas (Portas):** Desenhadas APÓS o jogador. Isso garante que, em situações de esmagamento (Crunch), as peças destruídas do robô fiquem visualmente ocultas sob o anteparo de metal da porta.
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

## 3. Fluxo de Dados de Energia
O sistema de energia é o coração do projeto e segue este fluxo:
1.  `updateEnergy()` limpa todos os estados de energia anteriores.
2.  Inicia um rastreio (`trace`) a partir das fontes primárias (B e X), que são omnidirecionais e emitem energia para todos os 4 lados adjacentes.
3.  O `trace` percorre fios e blocos:
    *   Fios transmitem a energia em todas as direções permitidas por seu tipo (H, V, L, etc). **Exceção:** Se um fio recebe energia diretamente de uma Fonte ou Bloco Amplificador, ele aceita a entrada por qualquer lado (Injeção de Energia).
    *   Blocos transmitem apenas na direção da sua seta e apenas se receberem energia pela base ou laterais.
4.  Se a energia atinge um núcleo e satisfaz o requisito de Amps, esse núcleo é adicionado à lista de `relaySources`.
5.  O loop repete, iniciando o `trace` a partir dos novos núcleos-fonte.
6.  Ao final, o sistema verifica se houve um caminho completo de uma fonte até um alvo final, marcando esses caminhos retroativamente como `OCEAN` (Azul Oceano/Ciano).

## 4. Estrutura de UI (Mega Man Style)
A interface utiliza barras segmentadas com proporção 1:1 para movimentos:
*   **LIVES:** Barra fixa de 3 a 5 blocos grandes.
*   **POWER:** Barra elástica de 250px que se adapta ao limite de movimentos da fase, acompanhada por um contador numérico em tempo real que exibe as unidades exatas restantes.
*   **AMPS:** Barra dinâmica que mostra o progresso de carga total necessária no nível.
*   **Estética 3D:** Segmentos do HUD utilizam sombras internas (`inset box-shadow`) e bordas estáveis para simular volume físico e profundidade sem distorção geométrica.

## 5. Regras Globais de Design
*   **Contramão:** Alimentar um bloco pela frente gera um erro visual amarelo.
*   **Contaminação:** Energia vermelha sobrepõe a azul e invalida núcleos.
*   **Limites:** O jogador perde por falta de movimentos (Power) ou falta de tempo (60s timer).
*   **Falha Conclusiva (Perma-Death por Tentativa):** O sistema de reversão automática foi removido. Se o robô for destruído ou desativado, o jogador transiciona diretamente para a tela de falha.
    *   **Perigos Físicos (Esmagamento/Explosão):** Causam a perda de 1 Unidade/Vida. O sistema sinaliza a perda com uma **vinheta vermelha pulsante** na tela e o selo **"FALHA"** nos monitores de transição durante o respawn.
    *   **Falha de Sistema (Fim de Energia):** Não consome vidas, mas interrompe a operação instantaneamente.
*   **Esteiras Dinâmicas:** Podem operar de forma contínua ou ser controladas por **Canais de Comunicação**. Esteiras ligadas a botões param de mover objetos e interrompem sua animação (neon apagado) quando o sinal do canal é interrompido, permitindo a criação de quebra-cabeças de temporização e fluxo.

## 6. Ferramentas de Desenvolvimento
### Level Editor (editor.html)
Uma ferramenta WYSIWYG (What You See Is What You Get) que permite a criação intuitiva de níveis.
*   **Interface Industrial Refatorada:** O editor agora utiliza um sistema de **barra de ferramentas dupla**. Abaixo do cabeçalho principal, uma linha horizontal (`sub-toolbar`) agrupa a seleção de **Camadas** (Base, Overlays, Blocos) e **Ferramentas** (Pincel, Borracha, Quadrado, Linha e Seleção), maximizando o espaço vertical da sidebar para a paleta de tiles.
*   **High-Fidelity Rendering:** Utiliza a mesma classe `GameState` e `Graphics` do jogo para mostrar o fluxo de energia real durante a edição.
*   **Edição em Lote (Multi-Edit):** Suporte avançado para configuração de múltiplos objetos. Ao selecionar uma área e clicar com o **Botão do Meio**, o editor identifica todos os alvos interativos (Portas, Botões, Núcleos, Chão Quântico) e permite alterar canais, amperagem ou comportamento de todos simultaneamente através de um painel de propriedades contextual.
*   **Área de Transferência:** Suporte para copiar e colar áreas do mapa via `Ctrl+C` e `Ctrl+V`.
*   **Sincronização Direta (Local Server):** O editor utiliza um servidor Node.js local para permitir o salvamento com apenas um clique (Auto-Save), eliminando a necessidade de janelas de diálogo do sistema operacional.
*   **Sistema de Backup e Rotação:** Antes de cada salvamento, o servidor cria automaticamente uma cópia de segurança em `levels_backup/`. O sistema mantém apenas os últimos 15 backups, deletando os mais antigos automaticamente para otimizar o espaço.
*   **Integração Nativa:** Salva diretamente no arquivo `js/levels.js` através de requisições POST para o servidor local.

## 7. Level Selector (js/levelSelector.js)
O Level Selector é uma tela de seleção de níveis no estilo retro CRT industrial, acessível durante o jogo via tecla `Escape`.
*   **Estado Global:** Mantém progresso por nível (estrelas, desbloqueado, completado) no objeto `LevelSelector.progress[]`.
*   **Acesso:** Abre via `Escape` durante gameplay (pause menu). O fluxo normal dos níveis é linear (1→2→3→etc) sem retornar ao seletor automaticamente.
*   **Renderização:** Renderiza diretamente no Canvas principal (640x480) com fundo industrial roxo escuro, grid de circuito, efeito CRT (scanlines, vignette, ruído).
*   **Sistema de Capítulos:** Os níveis são organizados em **Capítulos** (definidos pelo array global `CHAPTERS` em `levels.js`). Cada capítulo possui seu próprio **mapa de circuito independente** (`chapterMaps[]`), com nós posicionados proceduralmente a partir de `x=130`. Ao alternar capítulos (`Q/E`), o mapa inteiro é substituído instantaneamente. Os capítulos são gerenciáveis pelo Editor de Níveis.
*   **Animação de Desbloqueio de Setor:** Quando todos os níveis de um capítulo são completados, o sistema detecta automaticamente (`_checkChapterUnlock`) e agenda uma animação cinematográfica. Ao reabrir o Level Selector, um overlay escuro com partículas elétricas convergindo ao centro é exibido, seguido de um flash de energia e o texto "SETOR DESBLOQUEADO" com o nome do novo capítulo. Após ~4s (ou skip por tecla), o mapa transiciona automaticamente para o novo setor.
*   **Caminho de Circuito:** Nós conectados por traços de circuito industriais com roteamento 'Manhattan' (segmentos horizontais e verticais com ângulos de 90 graus), utilizando a mesma estética dos fios do jogo (bordas pretas, corpo de metal, núcleo colorido e faixa de destaque), incluindo animação de fluxo de energia nos caminhos completos.
*   **Nós:** Fontes de energia (Cores) que mudam de estado visual: Verde (Completado), Ciano (Selecionado) e 'Desligado' (Bloqueado). Nós bloqueados possuem o núcleo totalmente escuro (#0a0a0a) e sem brilho central, indicando falta de energia. Toda a interface evita o uso de emojis para manter a pureza estética industrial.
*   **Robô Seletor:** Mini versão do robô do jogo posicionado acima do nó selecionado com animação de bob.
*   **Navegação Lateral (Sidebar):** Possui 4 categorias industriais acessíveis via Teclas `W/S` ou `Seta Cima/Baixo`:
    *   **DADOS:** Categoria principal que exibe o mapa de circuitos e um painel de **Estatísticas Globais** (Movimentos totais, Tempo de sincronia acumulado, Falhas do sistema/mortes e Amperes sincronizados totais).
    *   **FERRAMENTAS / ENERGIA / SISTEMA:** Categorias bloqueadas (Offline) na versão atual, emitindo um sinal sonoro de erro ao serem selecionadas.
*   **Input Contextual:**
    *   `W / S` (ou `Up/Down`): Navega verticalmente pelos itens da sidebar.
    *   `A / D` (ou `Left/Right`): Navega horizontalmente pelos nós de níveis (ativo apenas quando 'DADOS' está selecionado).
    *   `Q / E`: Alterna entre os **Capítulos** do jogo, saltando para o primeiro nível do capítulo anterior/seguinte.
    *   `Enter`: Ação exclusiva da barra lateral. No item **DADOS**, alterna a exibição do painel de estatísticas. Nos itens bloqueados, emite o sinal sonoro de erro.
    *   `Space`: Confirma a seleção do nível selecionado no mapa (ativo apenas em **DADOS**).
    *   `Escape`: Fecha o seletor.
*   **Integração:** O game loop principal (`main.js`) desvia completamente para o renderizador do Level Selector quando `LevelSelector.active === true`.

## 8. Result Screen (js/resultScreen.js)
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

### D. Audio System (js/audio.js)
O sistema de áudio é baseado puramente na Web Audio API, gerando sons de forma procedural (sintetizadores):
*   **Sound Effects (SFX):** Utiliza osciladores (sine, square, sawtooth, triangle) e buffers de ruído branco com filtros bi-quadrados para criar sons industriais (moagem de metal, explosões, fluxos elétricos).
*   **Dynamic Hum:** Um sistema de zumbido elétrico contínuo que altera sua frequência e taxa de "crackles" (estalidos) dinamicamente com base no progresso da energia e estado de contaminação do circuito.
*   **Layered Megaman Synth/Rock System:** Um sistema de música unificado com tempo dinâmico e intensidades fixas para diferentes estados do jogo:
    *   **Menu (Intensity 0):** Mesma melodia do jogo (SAME SONG), porém em tempo mais lento (100 BPM). Há uma ausência completa da bateria pesada e dos baixos, deixando a música ser carregada apenas pelo sintetizador agudo e pequenos acompanhamentos etéreos, gerando um tom focado e de suspense prévio.
    *   **In-Level (Intensity 2):** Versão de alta energia (140 BPM) com bateria de rock rápida (kicks pulsantes, hi-hats contínuos e snares de impacto) e a mesma melodia heróica em sintetizador overdriven (Metal Lead) apoiada pelos graves, evocando clássicos de ação em estilo moderno (sem usar sons 8-bit).
    *   **Seamless Continuity:** A trilha nunca para durante a transição; ela apenas alterna a instrumentação, enquanto o *Hum* elétrico e o *Timer* do jogo são pausados para garantir foco total na navegação.
    *   **Unit Recovery:** Ao iniciar qualquer nível, a integridade do robô é restaurada (3 Vidas/Unidades), permitindo uma nova chance de resolver o puzzle sem penalidades acumuladas de fases anteriores.
*   **Efeitos Mecânicos Locais:** Inclui sons específicos para engrenagens de esteiras (`playConveyorGear`), abertura pneumática de portas (`playDoorOpen`), batidas de porta, colisões metálicas e **cliques táteis de botões** (`buttonClick`).
*   **Audio Quântico Especializado:**
    *   **Quantum Hum:** Zumbido elétrico que diferencia interações. Emite um tom leve e agudo (800Hz) ao caminhar sobre o chão quântico, e um tom **grave e denso (400Hz)** ao tentar empurrar blocos contra a barreira ativa, reforçando a percepção de massa e resistência.
    *   **Toggle Rise/Fall:** Efeitos de "rise up" (ascendente) ao ativar a barreira e "descend" (queda de frequência) ao desativá-la, simulando o carregamento e desligamento de grandes bobinas de indução industrial.
*   **Ilusão de Aceleração (Escala de Shepard):** As esteiras utilizam um sistema de Escala de Shepard (`updateConveyorShepard`), que cria uma ilusão auditiva de tom ascendente infinito enquanto o robô ou blocos estão em movimento. Isso intensifica a sensação de velocidade e perigo industrial contínuo, gerado procedimentalmente via Web Audio API.
