# RelatÃ³rio de Arquitetura - CIRCUIT BREAKER

Este documento descreve a estrutura base da engine do jogo e as diretrizes de implementaÃ§Ã£o para manter a pureza do design industrial e performance.

## 1. Sistema de Lasers (MecÃ¢nica Central)
Os lasers sÃ£o processados em duas fases:
- **LÃ³gica (game.js):** O mÃ©todo `updateEmitters` traÃ§a o percurso do laser recursivamente. Ele identifica colisÃµes e categoriza o `targetNode` (WALL, DOOR, PLAYER, PRISM, CATALYST, EMITTER, BLOCK).
- **RenderizaÃ§Ã£o (lasers.js):** O mÃ©todo `drawLaser` utiliza os dados do percurso para desenhar o feixe.

### Diretriz de Minimalismo Visual:
- **Design do Feixe:** Feixe sÃ³lido com borda roxa e nÃºcleo branco. Sem brilho externo (Outer Glow).
- **Instabilidade Vibracional:** O laser possui um jitter (vibraÃ§Ã£o) senoidal de 0.3px e pulsaÃ§Ã£o de largura, criando um visual de energia contida e estÃ¡vel.
- **Mixagem:** Utiliza `lighter` (Add) para sobreposiÃ§Ã£o de feixes.

## 2. Sistema de PartÃ­culas e Feedback Visual
- **Whitelist de EmissÃ£o:** PartÃ­culas de impacto sÃ£o restritas a `WALL`, `DOOR` e `PLAYER`. Prismas e componentes tÃ©cnicos nÃ£o emitem partÃ­culas de impacto ou rotaÃ§Ã£o.
- **EstÃ©tica Industrial:** PartÃ­culas nÃ£o utilizam gradientes ou sombras, mantendo o visual pixel-perfect.

## 3. Infraestrutura de Ã�udio (audio/core.js)
- **Master Control:** Utiliza um `GainNode` mestre (`musicGain`) que normaliza o volume global em 50% para garantir clareza sonora.
- **SÃ­ntese Procedural:** Instrumentos e efeitos (como o zumbido dos emissores) sÃ£o gerados em tempo real, permitindo controle dinÃ¢mico de volume e pitch sem carregar assets pesados.
- **Mapeamento por Setor:** O sistema de mÃºsica Ã© mapeado por capÃ­tulos (setores), permitindo transiÃ§Ãµes fluidas entre Ã¡reas narrativas.
- **SÃ­ntese de Voz do RobÃ´:** O robÃ´ possui um sistema de comunicaÃ§Ã£o procedural baseado em osciladores de onda variÃ¡vel (triangle, sawtooth, sine) e sementes aleatÃ³rias determinÃ­sticas. A "voz" reage ao estado do jogador:
    - `neutral`: InteraÃ§Ãµes e falas aleatÃ³rias durante a exploraÃ§Ã£o.
    - `damage`: Tons mais agudos e rÃ¡pidos (glitchy) ao receber impacto.
    - `heal`: Tons harmÃ´nicos e ascendentes ao recuperar energia.
    - `dead`: Tons graves e lentos de desligamento (shutdown).
- **Gerenciamento de Contexto (Autoplay):** Para conformidade com políticas de autoplay do navegador, o sistema de áudio e voz suspende emissões até a primeira interação do usuário. O motor silencia avisos e tentativas de reprodução durante o carregamento inicial (init) para evitar poluição no console e interrupção da lógica de jogo.

## 4. Sistema de DiÃ¡logos e Rich Text (dialogue.js)
O sistema utiliza `Tippy.js` para renderizaÃ§Ã£o de HUDs hologrÃ¡ficos.

### ConfiguraÃ§Ã£o e Comportamento:
- **Posicionamento DinÃ¢mico (`follow`):** O HUD persegue o robÃ´ em tempo real com **Dirty Checking** (recalcula apenas se o movimento for > 0.1px).
- **Rich Text Multi-ParÃ¢metro:** Suporta tags complexas como `[arcane:intensidade:cor1:cor2]` via parser colon-aware.
- **Prioridade de Cor:** Efeitos como `arcane` e `highlight` (que requer texto preto) sobrepÃµem a tag estÃ¡tica `[color]`.
- **Efeitos Persistentes:** O efeito `crypt` utiliza um loop global probabilÃ­stico para scrambling de texto sem impacto no reflow do DOM.
- **ExceÃ§Ã£o de Sincronia (Melt):** O efeito `melt` utiliza delays aleatÃ³rios e uma sequÃªncia de falha (blink de alta frequÃªncia) para um visual orgÃ¢nico de colapso.

## 5. Sistemas de Hazards e Triggers
- **Industrial Blackout:** Sistema de iluminaÃ§Ã£o baseada em triggers de zona (âš¡) que controlam a visibilidade do setor.
- **Security Alerts:** Sistema de detecÃ§Ã£o sonora e visual que reage a invasÃµes ou falhas de sistema.
- **Solar Vortex (Portais):** Sistema de canais de entrelaÃ§amento quÃ¢ntico com sincronia de cores baseada em canais numÃ©ricos.
- **Pits (Abismos):** LÃ³gica de queda com animaÃ§Ã£o de overshoot restaurada, garantindo movimento fluÃ­do sem pixel-snapping.

## 6. Diretrizes de Performance
- **Bake de Background:** Elementos estáticos (chão, abismos, tetos e paredes não-animadas) são pré-renderizados em um `bgCanvas` offscreen no carregamento do nível.
- **Minimização de Iteração:** Apenas tiles animados (como terminais de computador) são processados e desenhados individualmente no loop principal.
- **Minimização de Context:** Evitar `save()` e `restore()` excessivos.
- **Carga de Assets:** Prioridade para geraÃ§Ã£o procedural sobre arquivos externos.

## 7. Progressão e Sobrevivência (Adventure Puzzle)
A engine foi migrada de um modelo de "Level-Based Puzzle" para um "Adventure Puzzle" focado em exploração e sobrevivência.

### Sistema de HP (Zelda-Style):
- **Corações e Quartos:** O HP é medido em quartos de coração (estética hexagonal industrial). 3 corações iniciais = 12 HP.
- **Dano e Invulnerabilidade:** Hazards (lasers, esmagamento) causam dano parcial em vez de morte instantânea. Após dano, o robô ganha i-frames curtos (20 frames) com feedback visual de **flash branco (over-brightness)** e **emissão de faíscas**. Durante este período, o movimento é bloqueado para impedir que o jogador atravesse barreiras de laser ou ignore o knockback.
- **Mecanismo de Reverse:** A morte (0 HP ou queda em buraco) gatilha o rewind quântico. Durante este estado (REVERSING), o jogo retrocede pelo `undoStack` em velocidade tripla até o `lastCheckpointIndex`.
- **Checkpoints Dinâmicos:** O checkpoint é atualizado automaticamente sempre que o robô entra ou permanece sobre uma Estação de Carregamento (`K` ou spawn `@`) que esteja energizada. Isso garante que o jogador nunca perca progresso além da última estação visitada.
- **Sincronização de Estado:** O método `applyState` garante a paridade total de todas as entidades dinâmicas (blocks, prisms, quantum cubes, conveyors, portals, zoneTriggers) e estados globais (HP, isSolarPhase, remoteSignals). Isso impede que gatilhos de disparo único sejam reativados incorretamente após um undo ou que sinais remotos permaneçam ativos após uma morte.
- **Sincronização Visual:** O sistema força a reconciliação de `visualX/Y` e `fallTimer` em cada frame do reverse para evitar que objetos fiquem transparentes ou "fantasmas" (sólidos mas invisíveis). Blocos dentro de portais são renderizados como hologramas (`drawLimboHologram`) para manter a continuidade visual.
- **Callback de Conclusão:** Ao finalizar o reverse, o sistema executa `onReverseComplete`, que reseta o estado de morte e restaura o controle ao jogador.

### NavegaÃ§Ã£o e Terminais:
- **NavegaÃ§Ã£o entre Salas:** Portas podem possuir destinos (exitTo). O robÃ´ deve navegar fisicamente entre setores.
- **Desbloqueio de SaÃ­da:** A validaÃ§Ã£o de todos os NÃºcleos Alvo libera o canal de saÃ­da, mas **nÃ£o abre a porta automaticamente**.
- **Porta de SaÃ­da (U):** Possuem um **LED de Status**:
    - `Vermelho`: Bloqueada (Canal nÃ£o alimentado).
    - `Verde`: Desbloqueada (Canal alimentado).
- **SequÃªncia de SaÃ­da:** O jogador deve interagir (`E/EspaÃ§o`) com uma porta verde. Isso gatile uma sequÃªncia: A porta abre, o robÃ´ entra, a porta se fecha (sem causar dano por esmagamento) e sÃ³ entÃ£o a transiÃ§Ã£o de nÃ­vel ocorre.
- **Porta de SaÃ­da (U):** Um novo tipo de entidade foi adicionado. Portas representadas por `U` no editor (ou no canal 99) possuem faixas de perigo **verdes** em vez de amarelas para sinalizar o fim do setor.
- **ConfiguraÃ§Ã£o de Destino:** AtravÃ©s do editor, Ã© possÃ­vel definir a propriedade `exitTo` em portas de saÃ­da para criar hubs e caminhos nÃ£o lineares.
- **Timer Opcional:** O cronÃ´metro nÃ£o Ã© mais obrigatÃ³rio por padrÃ£o. NÃ­veis podem ser explorados sem pressÃ£o de tempo, a menos que um timer seja explicitamente definido para desafios especÃ­ficos.
- **RelatÃ³rio de OperaÃ§Ã£o:** O Result Screen foi removido do fluxo obrigatÃ³rio. Ao cruzar uma porta de saÃ­da, o jogo realiza a transiÃ§Ã£o de portÃ¡o e carrega o prÃ³ximo setor instantaneamente para manter a fluidez da aventura.
- **Portas PrÃ©-Abertas (Initial State):** Portas (D) e SaÃ­das (U) suportam o flag `initOpen` via metadados de links (`_init`). Quando ativo, a porta inicia no estado `OPEN` e ignora sinais lÃ³gicos de fechamento, permitindo criar caminhos permanentemente abertos ou salas de entrada sem requisitos.

### Sistema de Progresso e Habilidades (game_progress.js):
- **Desbloqueio de Habilidades:** Módulos que expandem as capacidades do robô:
    - `grab`: Agarrar blocos (Módulo Magnético).
    - `multi_push`: Empurrar múltiplos blocos (Hidráulica).
    - `manipulate_prisms`: Rotacionar prismas (Óptica Avançada).
    - `rotate_emitters`: Girar canhões laser.
    - `singularity_interaction`: Alternar Fases Solares/Lunares através do **Alternador de Singularidade (`%`)**.
    - `portal_travel`: Atravessar portais sem colapso (Viagem Entre-Portais).
    - `sideways_transmission`: Cubos transmitem energia para os lados (Difusão Lateral).
    - `run`: Aumento de velocidade de deslocamento (Módulo de Sobrecarga).
- **Gatilhos de Concessão:** Através do sistema de triggers (⚡), é possível conceder habilidades ao jogador (`grant_ability`) ou aumentar a vida máxima (`increase_max_hp`).
- **Persistência:** O sistema `GameProgress` mantém o estado das habilidades adquiridas, permitindo que o jogador progrida e acesse novas áreas (Metroidvania-lite).
- **Inicialização Segura:** O sistema garante que as propriedades de habilidades (`abilities`), sinais (`completionSignals`) e estados (`levelStates`) sejam instanciadas por padrão, prevenindo erros de referência (`TypeError`) durante o ciclo de carregamento prematuro do `GameState`.
- **Sinais Globais (Global Signals):** Permite que ações em um nível (ex: puxar uma alavanca) alterem permanentemente o estado de outro nível (ex: abrir uma porta no Hub). O sistema `GameProgress.addSignal(channel)` gerencia essa persistência cross-level. Botões (levers/pads) podem ser configurados como **Globais**, sincronizando seu estado físico com o registro persistente do progresso.
- **Sincronização de Economia:** O valor de `scrapTotal` em `GameProgress` é a fonte única de verdade para a economia do jogo, sincronizando-se automaticamente com o `GameState` e o `ShopSystem` para evitar divergências de saldo.
- **Feedback de Falha:** Tentar usar uma habilidade não adquirida resulta em feedback visual (visor vermelho), sinal sonoro de negado (Negative Blip) ou falha catastrófica (morte em portais sem o módulo adequado).
- **Mecânica de Knockback:** Receber dano resulta em um impacto físico que sempre empurra o robô para a direção oposta à que ele está olhando (recoil). O sistema utiliza um atraso intencional de frames (`knockbackDelay`) para permitir que a animação mostre o robô atingindo o perigo antes de ser expelido. Caso o caminho esteja bloqueado, o sistema utiliza a posição anterior (`prevX/Y`) como salvaguarda para garantir o isolamento de zonas bloqueadas.

## 8. Economia e Upgrades (Shop System)
- **Sucata (Scrap):** Moeda industrial coletada nos níveis. O total é persistido globalmente em `GameProgress.scrapTotal`.
- **Terminais de Troca ($):** Localizados principalmente no Hub, permitem ao jogador trocar sucata por upgrades permanentes. Atuam como blocos sólidos intransponíveis (colisão tipo computador).
- **Upgrades Disponíveis:** Expansão de bateria (HP Max), Redução de Recuo, Módulos de Radar e Overclock de CPU.

## 9. Estrutura de Mundo (Hub & Nexus)
- **Nexus Central (Hub):** Um nível central (50x50+) que serve como ponto de conexão entre todos os setores.
- **Gating de Progressão:** O acesso a novos setores é controlado por:
    - **Portais Verdes (U):** Portas de transição que levam a níveis específicos.
    - **Canais Quânticos:** Algumas portas do Hub só abrem quando sinais globais específicos são ativados em missões externas.

## 10. Controles e Interação
- **Comandos Principais:**
    - `WASD / Setas`: Movimento.
    - `Espaço / E`: Interagir (Ativar botões, girar canhões).
    - `Q`: Agarrar/Soltar Cubos (Módulo Magnético).
    - `Shift`: Correr/Sprint (Módulo de Sobrecarga - se desbloqueado).
    - `Z`: Desfazer (Undo).
    - `R`: Reiniciar/Reverter (Reverse).

## 11. Arquitetura de Ciclo de Vida (Game Loop)
A engine utiliza um sistema de **Fixed Timestep** com acumulador para garantir paridade de simulaÃ§Ã£o em qualquer hardware.

### Funcionamento:
- **FrequÃªncia de AtualizaÃ§Ã£o (TPS):** A lÃ³gica do jogo (`updateGameLogic`) roda a **60 Ticks por Segundo** constantes. Isso impede que a fÃ­sica ou mecÃ¢nicas de tempo (como timers de recarga ou velocidade do robÃ´) variem em monitores de alta frequÃªncia (144Hz+).
- **Desacoplamento de RenderizaÃ§Ã£o:** O loop de desenho (`renderGameVisuals`) Ã© executado via `requestAnimationFrame`, aproveitando a fluidez mÃ¡xima do monitor do usuÃ¡rio sem afetar a velocidade real da simulaÃ§Ã£o.
- **ProteÃ§Ã£o contra "Spiral of Death":** O acumulador possui um teto de 100ms por frame para evitar que o jogo tente recuperar milhares de frames perdidos caso a aba fique em segundo plano ou sofra um engasgo severo de performance.

## 12. Persistência de Mundo (World Persistence)
O jogo utiliza um sistema de snapshots de instância para garantir que o progresso dentro de cada setor seja mantido ao navegar pelo Nexus.

### Funcionamento do Snapshot:
- **Captura (`captureLevelState`):** Ao sair de um nível (através de uma porta de saída ou transição), o sistema gera um snapshot contendo:
    - Estado de todos os botões e alavancas.
    - Estado das portas (abertas, fechadas ou quebradas).
    - Posição atual de todos os blocos móveis e prismas.
    - Registro de sucatas coletadas e diálogos disparados.
- **Armazenamento:** Os dados são salvos em `GameProgress.levelStates`, indexados pelo ID do nível.
- **Aplicação (`applyLevelState`):** Ao reentrar em um nível, o sistema reconstrói o ambiente a partir do snapshot antes do primeiro frame de renderização.

### Proteção de Reset (R):
- O sistema distingue entre **Navegação** (ir para outra sala) and **Reversão** (morte ou reset manual).
- O estado de uma fase só é gravado permanentemente ao **mudar** de nível. 
- Se o jogador usar a reversão quântica (`R`), o jogo carrega o estado persistente "limpo" (ou o último snapshot salvo ao entrar na sala), permitindo que ele tente resolver o puzzle novamente caso tenha se prendido.

## 13. Níveis de Recepção e Conectividade
- **Níveis de Recepção:** Cada setor (capítulo) possui um nível de "Recepção" vazio que serve de interface entre o Hub e as missões do setor.
- **Portas de Retorno:** Todos os níveis de recepção devem obrigatoriamente possuir uma porta `U` (Saída) com `exitTo` apontando de volta para o Hub (`NEXUS CENTRAL (HUB)`).
- **World Labels Dinâmicos (|):** O sistema de mapas utiliza o marcador `|` para posicionar rótulos de mundo holográficos. O texto exibido é definido na camada de eventos (`links`) através da propriedade `${x},${y}_label`.
    - **Escala Visual:** Renderizados com fonte **20px**, permitindo que o texto transborde as fronteiras do tile (32x32) para máxima legibilidade sem sacrificar a resolução.
    - **Proximidade:** Os rótulos utilizam um efeito de fade-in por proximidade (raio de 4 tiles para início, 2 tiles para opacidade total).
    - **Estética:** Renderizados com blending aditivo (`lighter`) e brilho externo (`shadowBlur`) para reforçar a natureza holográfica.
- **Integração com Editor:** O editor de fases e o modo de teste suportam nativamente a renderização de Terminais de Loja (`$`) e Rótulos de Mundo (`|`). O editor utiliza uma simulação de lógicas simplificadas (`rebuildMock`) para garantir que o preview visual seja 100% fiel ao comportamento em jogo.

## 14. Fluxo de Configuração de Portais (Editor)
O editor de fases implementa um fluxo especializado para gerenciar a conectividade entre setores e o posicionamento preciso do jogador.

### Mecanismo de Seleção de Spawn:
- **Propriedades Estendidas:** Portas de saída (`U`) podem armazenar metadados de destino adicionais via sistema de `links`:
    - `exitTo`: Nome ou índice do nível de destino.
    - `spawnX` / `spawnY`: Coordenadas específicas onde o robô aparecerá no mapa de destino.
- **Interface Visual (`spawn_selector.js`):** O editor fornece uma prévia em tempo real do setor de destino dentro de um overlay modal, permitindo a visualização da geometria e entidades do destino sem sair do contexto de edição.
    - **Alta Fidelidade de Renderização:** O sistema de preview foi refatorado para realizar uma renderização multi-camada (Base, Overlay e Blocos) idêntica ao motor de jogo. Ele utiliza uma lógica de "mini-mock" para pre-processar estados complexos como direções de esteiras, canais de portais, e estados de fiação, garantindo paridade visual de 1:1.
    - **Confirmação Visual de Spawn:** O usuário seleciona o destino e clica diretamente no mapa para definir o ponto de entrada exato. O sistema exibe um marcador visual (📍) e um highlight semitransparente no tile selecionado para feedback imediato e confiável.
- **Fallback Automático:** Caso nenhuma coordenada de spawn seja definida manualmente, o motor de jogo (`game.js`) utiliza o ponto de spawn padrão (`@`) definido no arquivo do mapa de destino.
- **Execução em Jogo:** Durante a transição de nível (`loadLevel`), o sistema verifica a existência de `customSpawn`. Se presente, as coordenadas de `@` no mapa original são ignoradas em favor dos metadados do portal, permitindo entradas múltiplas no mesmo setor.

## 15. Sistema de HUD Modernizado (Canvas HUD)
O sistema de HUD foi totalmente integrado ao pipeline de renderização do Canvas principal, abandonando elementos DOM em favor de uma estética de terminal de alta performance ("Green Tech").

### Layout e Estética Industrial:
- **Corações Quânticos (Top-Left):** Utiliza hexágonos procedurais divididos em 4 quadrantes ("Corte de Pizza"). Cada quadrante representa 1/4 de HP, preenchendo no sentido Top-Left -> Top-Right -> Bottom-Left -> Bottom-Right. Possui linhas divisórias internas para clareza visual e um sistema de **Damage Flash** (brilho branco por 30 frames) para feedback imediato. Posicionados com margem de 60px.
- **Área Contextual Central (Top-Center):** Espaço dinâmico que alterna entre informações narrativas e operacionais:
    - **Sequência de Entrada:** Exibe o nome do nível em destaque com efeito glitch por 2 segundos, deslizando para cima para dar lugar ao monitor de missão.
    - **Monitor de Missão:** Agrupa o `Timer` (com destaque em fundo verde e texto preto para alta legibilidade) e a barra de `AMPS` (segmentos visuais representando a carga dos núcleos). O conjunto é centralizado dinamicamente.
- **Contador de Sucata (Top-Right):** Exibe apenas o total coletado (`game.scrapCollected`) ao lado de um ícone de engrenagem em rotação constante. O ícone possui um ajuste de alinhamento visual de +2px para compensar a linha de base da fonte VT323.
- **Minimalismo de Dados:** Removido o formato "x/y" para sucatas, focando apenas no progresso acumulado para reduzir o ruído visual.

## 16. Persistência do Editor (Editor Core)
O motor do editor foi refinado para garantir que a intenção do designer seja preservada fielmente no arquivo `levels.js`.

### Sincronização de Dados:
- **Force Sync no Salvamento:** O botão de salvar dispara obrigatoriamente um `rebuildMock()`, garantindo que valores em campos de texto (como Nome ou Timer) que ainda não perderam o foco (blur) sejam capturados.
- **Lógica de Timer:** O parâmetro `timer` agora aceita o valor `0` (Infinito/Desativado), corrigindo o bug onde o servidor de salvamento sobrescrevia valores zerados pelo padrão de 60 segundos.
- **Grid de Canais:** O sistema de seleção de canais foi expandido para suportar até **50 canais individuais** sem perda de performance. A interface foi otimizada com células de 18px e feedback visual de uso (`in-use`) para facilitar a gestão de redes complexas de lasers e portas.
- **Limpeza de Propriedades:** Propriedades redundantes como `time` (estática) foram removidas da serialização para manter o arquivo de níveis limpo e focado em dados de gameplay.

## 17. Vidro Técnico e Óptica Procedural (G/g)
O Vidro Técnico é um elemento estrutural especializado que interage com o sistema de lasers.

### Comportamento Físico e Lógico:
- **Colisão:** Atua como uma parede sólida para o jogador e blocos móveis (`G` e `g`).
- **Óptica:** Enquanto o Vidro Técnico (`G`) é puramente estrutural e transparente, a Parede Óptica (`g`) inclui componentes laboratoriais como lentes de aumento e conduítes de vidro pulsantes.
- **Detecção de Hit:** O motor de física (`game.js`) mantém um set dinâmico (`glassWallsHit`) que registra quais tiles de vidro estão sendo atravessados por lasers em cada frame.

### Renderização e Estética:
- **Camada de Desenho:** Vidros são renderizados no **Pass 2.07** do loop principal (após os lasers), permitindo um efeito de translucidez e brilho sobreposto.
- **Animação Procedural:** Utiliza o método `drawGlassWall`, que gera reflexos diagonais móveis (animated sweeps) para simular brilho de superfície.
- **Feedback de Energia:** Quando um vidro está no percurso de um laser, ele emite um **brilho ciano (glow)** em sua borda, indicando condução de energia óptica.

## 18. Padronização de Símbolos e Conflitos de Camadas
Para eliminar ambiguidades no interpretador de mapas, o sistema de símbolos foi refinado.

### Resolução de Conflitos:
- **Rótulos Holográficos:** O símbolo utiliza o caractere **`!`** (exclamação). Anteriormente em conflito com o Alternador de Singularidade, este último foi movido para `%`, consolidando o `!` exclusivamente para textos holográficos. O símbolo `|` foi liberado.
- **Singularity Switcher:** Utiliza o símbolo `%` na camada de *Overlay*, permitindo que o símbolo `!` seja usado exclusivamente para Rótulos de Mundo (Labels).
- **Diferenciação por Camada:** A engine agora prioriza `oc` (overlayChar) para interativos de piso e `c` (mapChar) para estruturas, mas mantém a verificação cruzada para garantir retrocompatibilidade onde aplicável.
## 19. Estética High-Tech e Setor Modular (h/m)
O Setor High-Tech introduz uma estética inspirada em ficção científica clássica (estilo Star Wars), focada em superfícies metálicas escuras e iluminação neon ciano.

### Detalhes Técnicos e Visuais:
- **Painéis Modulares (`h`):** Utiliza uma base cinza-azulada profunda (`#0a1014`) com recuos geométricos. 
    - **Variações Procedurais:** Inclui portas de dados circulares, cabeamento exposto ("greebles") e painéis de luz branca/ciano típicos de infraestruturas espaciais avançadas.
- **Troncos de Energia (`m`):** Paredes com tubulações centrais maciças que exibem um núcleo de energia pulsante. Utiliza `shadowBlur` dinâmico para simular a irradiação de energia através do invólucro metálico.
- **Teto Composto Procedural (`Y`):** Teto estrutural Green Tech com conectividade inteligente. Paleta verde industrial (`#060a08`, `#0f1a14`) com molduras grossas e sutis, LEDs de diagnóstico verdes (`#00bb88`), e parafusos de canto. Sistema de bitmask (1:Up, 2:Right, 4:Down, 8:Left) para supressão automática de bordas internas.
- **Teto Bronze Procedural (`#`):** Teto padrão com conectividade modular. Paleta bronze/cobre escura (`#1a1820`, `#20202b`) com chanfros metálicos quentes (`rgba(255, 240, 200, 0.08)`), sulcos internos em tom bronze, e rebites de canto. Utiliza o mesmo sistema de bitmask procedural, permitindo que blocos adjacentes de `#` formem placas unificadas com bordas suprimidas.
- **Integração de Performance:** Todos os tetos procedurais (`#`, `Y`, `N`) são processados no pipeline de pré-renderização (`bakeBackground`) com cálculo de máscara de vizinhança, mantendo apenas LEDs piscantes como camadas dinâmicas.

## 20. Registro de Símbolos e Disponibilidade
Para sustentar a expansão modular do jogo, foi estabelecido um inventário rigoroso de caracteres para evitar sobreposição de funções.

### Estado Atual do Inventário:
- **Estruturas Técnicas Expandidas:** Os caracteres `h` e `m` foram integrados para a estética "High-Tech", servindo como paredes estruturais com variações de painéis e tubulações de energia.
- **Diferenciação de Rótulos:** O símbolo `!` é o padrão para âncoras holográficas (Labels), enquanto `%` é reservado para o Alternador de Singularidade. O símbolo `|` está livre para uso futuro.
- **Mapeamento Numérico:** Os caracteres `1` a `9` são reservados para **Núcleos de Carga (Targets)** com requisitos específicos, enquanto `0` é o símbolo universal para **Zonas Proibidas** (bloqueio absoluto).
- **Laboratório Óptico:** Os caracteres `g` (Parede Óptica) e `t` (Chão Óptico) foram integrados para a estética de laboratório de precisão, apresentando elementos iridescentes e superfícies de vidro.
- **Espaço Livre:** Outras opções disponíveis para novos sistemas incluem `u`, `w` (conflito com fiação a evitar), além de símbolos como `&`, `=` e `-`.
- **Setor Logístico:** Os caracteres `o` (Chão), `{` (Parede) e `}` (Teto) foram integrados para a estética de armazém industrial e logística.
- **Setores Específicos:**
    - `x`, `z`, `q`: Agrupados no **Setor: Compilador** (Estrutura Lab/Transcendental).
    - `?`, `Q`, `O`, `.`, `'`, `"`, `|`: Agrupados no **Setor: Quântico** (Mecânicas Avançadas e Místico-Tecnologia).
    - `N`: Teto Óptico Procedural (Setor Óptico).

## 21. Setor: Compilador (Resignificação de Ativos)
O Setor Compilador centraliza ativos de alta tecnologia com estética laboratorial e transcendental.

### Detalhes Visuais e Comportamento:
- **Chão Compilador (`z`):** Vidro Iridescente. Piso técnico que apresenta uma camada de brilho móvel ("sheen") com shift de matiz senoidal. É um tile passável que herda a estética de laboratórios assépticos avançados.
- **Parede Compilador (`q`):** Parede Transcendental. Superfície roxa profunda com um nó central pulsante e linhas de grade que emitem brilho etéreo. Atua como barreira sólida e possui animação procedural baseada no tempo do motor.
- **Teto Compilador (`x`):** Matéria Cristalizada (Voronoi). Teto estrutural com estética de fragmentos geométricos ametista. Utiliza o algoritmo de Voronoi para criar um padrão de cristalização único baseado na semente do nível.

## 22. Setor: Quântico (Estrutura)
Este setor agrupa a base estrutural para ambientes quânticos.

### Elementos:
- **Abismo de Vácuo (`.`):** Variante mecânica do buraco tradicional com estética de estrelas.
- **Chão Quântico Rúnico (`'`):** Ardósia azul profunda com runas pulsantes.
- **Parede de Circuito Sagrado (`"`):** Paredes com mandalas rotativas e bordas douradas.
- **Teto Quântico Mandala (`|`):** Teto com anéis dourados e núcleos de energia.

## 23. Mecânicas Quânticas (Overlay)
Agrupamento de objetos interativos de manipulação dimensional.

### Elementos e Comportamento:
- **Chão Quântico (`?`):** Piso que permite travessia sobre abismos.
- **Catalisador (`Q`):** Ponto de controle para feixes de laser.
- **Portal Quântico (`O`):** Sistema de teletransporte.

## 24. Setor Óptico (Laboratório de Precisão)
O Setor Óptico foca em uma estética de laboratório "Aseptic-Glass", utilizando iridescência e transparência como temas centrais.

### Elementos Visuais e Procedurais:
- **Parede Óptica (`g`):** Apresenta quatro variantes principais:
    - **Painel Liso:** Superfície de metal polido com juntas técnicas sutis (base para áreas limpas).
    - **Lente/Viewport:** Janelas circulares com reflexos dinâmicos.
    - **Conduítes de Vidro:** Tubos verticais com líquido fluorescente que pulsa em cores variáveis.
    - **Gauge de Laser:** Mostradores digitais que exibem feixes de laser decorativos sincronizados com o tempo do motor.
- **Chão Óptico (`t`):** Piso técnico azulado (`hsl(210, 30%, 85%)`) com grade hexagonal iridescente. Utiliza um gradiente linear móvel (`animated sheen`) com matiz variável e saturação total para simular superfícies polidas sob iluminação de precisão. A grade técnica azul (`rgba(0, 150, 255, 0.1)`) reforça a estética de laboratório avançado. Todos os tiles do setor são registrados como estruturais (`isStructural`), garantindo que se comportem como barreiras sólidas e superfícies caminháveis estáveis.
- **Teto Óptico Procedural (`N`):** Teto estrutural com conectividade inteligente. Apresenta uma estética de molduras aninhadas em tons de ciano e azul profundo, com cantos chanfrados e uma moldura intermediária pontilhada. O sistema de máscara procedural remove bordas internas automaticamente quando tiles do mesmo tipo são adjacentes, criando estruturas contínuas de laboratório.

## 25. Setor: Laboratório (Asséptico)
O Setor Laboratório utiliza uma estética limpa, estéril e futurista, com predominância de tons brancos e cinzas.

### Elementos:
- **Teto Asséptico Procedural (`A`):** Teto estrutural com conectividade modular massiva. Paleta branco-cinza (`hsl(210, 5%, 82%)`) com chanfros de profundidade industriais (2px). Possui barras divisórias centrais extra-largas (16px) com sulco profundo 3D, suprimidas em conexões entre tiles iguais. Inclui rebites de canto gigantes (6px) para estética brutalista.
- **Chão Asséptico (`a`):** Piso limpo com variação de padrões antiderrapantes e desgastes sutis.
- **Parede Laboratório (`f`):** Parede metálica off-white com trilhos de luz ciano integrados.
## 26. Setor: Logística (Warehouse)
O Setor Logística utiliza uma estética industrial de armazém, com paleta de amarelos, cinzas e tons azulados.

### Elementos:
- **Chão Placas Metal (`o`):** Piso de placas de aço cinza escuro com rebites nos cantos e sulcos de encaixe industriais.
- **Chão Tátil Amarelo (`,`):** Piso antiderrapante (piso tátil) em tons vibrantes de amarelo e laranja. Possui padrões procedurais de relevos circulares (bolinhas) e barras lineares com efeito 3D (luz e sombra), imitando sinalizações de acessibilidade e segurança industrial.
- **Parede Estantes com Caixas (`{`):** Estrutura de prateleiras industriais de aço (racks) organizando pilhas de caixas amarelas. Possui vigas verticais e horizontais detalhadas com parafusos e realces metálicos. Inclui variações procedurais com diferentes empilhamentos e uma variação de **estante vazia**, criando um visual de armazém realista e dinâmico.
- **Parede Estantes com Sucata (`~`):** Variação da estante industrial contendo componentes tecnológicos diversos em vez de caixas. Inclui orbes energéticos (azuis e verdes), peças do robô protagonista desmanteladas (cabeça com visor azul e corpo laranja, braços articulados), roldanas metálicas (pulleys), emissores laser e fragmentos de blocos amplificadores. As peças do robô utilizam a paleta de cores característica (Laranja `#e67e22`, Azul `#2980b9` e Amarelo `#f1c40f`).
- **Teto Logístico Procedural (`}`):** Grade de vigas estruturais amarelas com conectividade inteligente via bitmask, criando uma rede de suporte industrial contínua.

## 27. Gerador de Masmorras Procedural (Ultimate Dungeon Lab)
O editor integra um sistema de gerao procedural para criao rpida de layouts complexos e randomized.

### Algoritmos:
- **Particionamento Grid (Estruturado):** Divide o mapa em células e posiciona salas com jitter (caos) e preenchimento variável. O algoritmo agora reserva uma **margem de 2 tiles** nas bordas para garantir espaço para as paredes de perspectiva e centraliza a grade perfeitamente.
- **Aleatrio Livre (Orgnico):** Posiciona salas de forma catica, utilizando gravidade central para agrupar o layout. Ideal para cavernas ou setores degradados.

### Integração de Setores Dinâmica:
O gerador utiliza o objeto `SECTOR_THEMES` para mapear automaticamente os símbolos base (Chão, Parede, Teto). Novas adições de setores no motor são automaticamente listadas no editor:
- **Configuração Centralizada:** Cada tema define seu trio de tiles (`floor`, `wall`, `ceil`).
- **Preview em Tempo Real:** O editor agora atualiza o mapa instantaneamente conforme os sliders são movidos, permitindo "escriturar" o layout antes de aplicar permanentemente.

### Regras de Perspectiva (3/4):
Para manter a coerência visual do motor:
- **Paredes no Topo:** O gerador posiciona tiles de "Parede" apenas em espaços vazios que estejam **diretamente acima** de um chão. Isso cria a face frontal da parede visível ao jogador.
- **Transição Direta:** Laterais e partes inferiores das salas transitam diretamente para o Teto ou Vazio, sem faces de parede, respeitando a perspectiva top-down 3/4.

### Entidades Automticas:
- **Player (@):** Posicionado na primeira sala gerada.
- **Sucata (S):** Distribuda aleatoriamente em salas.
- **Alvos (T):** Posicionados como objetivos em salas remotas.
- **Rtulos (!):** Gerados com nomes de setores dinmicos para facilitar a navegao.

### Ps-Processamento:
- **Erosão:** Um filtro de ruído que remove tiles de quina para criar formatos mais orgânicos e menos retangulares.
- **Conectividade:** Caminhos (CORRIDOR) são esculpidos entre salas para garantir que o nível seja navegável.

## 28. Sistema de Descoberta (Fog of War)
O jogo suporta um sistema de exploração onde o mapa inicia escuro e é revelado conforme o jogador se move.

### Funcionamento:
- **Máscara de Visibilidade:** O `GameState` mantém um `Set` de coordenadas `discovered`.
- **Revelação por Sala:** Quando o jogador entra nos limites de uma sala (definida no `levelData.rooms`), todos os tiles daquela sala são revelados instantaneamente.
- **Revelação por Proximidade:** Para corredores e áreas fora de salas, existe um raio de visão fixo (2 tiles) que revela o caminho conforme o jogador avança.
- **Renderização:** Um pass de renderização (`Pass 0.5`) desenha retângulos pretos (`#000000`) sobre qualquer tile que não esteja no `Set` de descoberta.
- **Integração Procedural:** O gerador de masmorras exporta automaticamente as coordenadas das salas para o sistema de descoberta.


## 29. Setor: Nexus Central (Hub)
O Nexus Central atua como o ponto de confluência do mundo de Circuit Breaker, unindo os diversos setores tecnológicos em uma estrutura massiva de suporte e transição.

### Estética e Atmosfera:
- **Visual Industrial Pesado:** O Nexus utiliza uma paleta de tons metálicos oxidados, cimento e detalhes em ciano pulsante.
- **Mecânica Visível:** Engrenagens, pistões e válvulas de vapor são elementos decorativos centrais, reforçando a ideia de uma máquina viva.
- **Ambiente de Suspense:** A iluminação é baixa (Penumbra), com focos de luz técnica que revelam a magnitude da estrutura.

## 29. Sistema de Áudio: Crono Nexus (Música Procedural)
O Nexus Central introduz um sistema de música procedural altamente dinâmico, desenhado para evoluir com a exploração do jogador.

### Camadas Sonoras e Intensidade:
O sistema utiliza três níveis de intensidade (`musicIntensity`) que alteram o BPM e a complexidade instrumental:
1.  **Intensidade 0 (Penumbra - 85 BPM):** Foco em ambiência e mistério. Utiliza o `VoidPad_Nexus` para criar um colchão sonoro sombrio e pistões ocasionais.
2.  **Intensidade 1 (Máquinas Ativas - 110 BPM):** Introduz percussão mecânica (Tech Bass e Radar Blips) e a melodia principal (`MysticLead`), simbolizando a reativação dos sistemas do Hub.
3.  **Intensidade 2 (Salto Temporal - 135 BPM):** Camada de ação total. Adiciona Arpeggios cibernéticos (`CyberArp`), guitarras de ação (`ActionChug`) e snares industriais, preparando o jogador para desafios de alta velocidade.

### Instrumentos Procedurais (Zero Assets):
- **Void Pad:** Síntese de ondas senoidais e dente-de-serra filtradas para ambiência espacial.
- **Steam Vent:** Ruído branco com modulação de filtro bandpass para simular escapes de vapor.
- **Piston:** Onda triangular com wave-shaping para percussão metálica profunda.
- **Mystic Lead:** Melodia límpida e etérea que guia o tema principal do jogo.

## 30. Setor: Realidade (Multicolor Neon)
O Setor Realidade é uma distorção estética da arquitetura High-Tech, onde a lógica de cores estática é substituída por um espectro dinâmico de neon.

### Estética e Renderização:
- **Hue-Shifting Procedural:** Ao contrário dos outros setores, a iluminação do Realidade utiliza um sistema de `hsl()` baseado no tempo (`Date.now()`), semente do nível e coordenadas locais. Isso cria um efeito de luzes pulsantes que percorrem o espectro visível.
- **Tiles Estruturais:**
    - `&`: Chão multicolorido seguindo o design modular High-Tech, mas com LEDs dinâmicos de espectro completo.
    - `=`: Teto modular com bitmasking de conectividade e luzes neon.
    - `:`: Parede modular com painéis de luz arco-íris.
    - `;`: Parede de conduíte com animação de fluxo de dados multicolorido.
- **Sincronia Visual:** A renderização é otimizada para o sistema de `bakeBackground`, mas os componentes neon são marcados como animados para garantir que o efeito multicolorido permaneça fluido durante o gameplay.

## 31. Setor: Quântico (Industrial-Tecnológico)
O Setor Quântico combina tecnologia de ponta com uma estética industrial pesada, utilizando uma paleta de azul profundo, gunmetal e destaque em **Roxo Neon (#bf00ff)**.

### Estética e Renderização:
- **Industrial Quântico:** O design foca em infraestrutura de processamento, painéis de dados e conduítes de energia.
- **Tiles Estruturais:**
    - `'`: Chão Quântico de Dados. Base de metal pesado com marcações técnicas e símbolos de dados pulsantes (0/1/X).
    - `"`: Parede de Circuito Industrial. Placas metálicas com rebites, trilhos de energia e painéis de acesso modulares que variam proceduralmente.
    - `|`: Teto Quântico (Neural Grid). Rede de conduítes de energia roxa que se conectam via bitmask, formando uma malha técnica funcional.
- **Variação Atmosférica:** O setor utiliza o caractere `.` (Abismo de Vácuo) como base espacial, apresentando névoas galácticas púrpuras.

## 32. Setor: Processamento (Processamento Logístico Cyan)
O Setor de Processamento (rebatizado como **Processamento Logístico**) utiliza uma estética industrial de armazém e triagem de dados, replicando a estrutura do Setor Logístico, mas com uma paleta exclusiva de **Ciano (#00ffff)** e **Teal Escuro**, agora com uma ampla variedade de cores secundárias para componentes.

### Estética e Renderização:
- **Variedade Cromática (Acentos Técnicos):** O setor quebra o monocromatismo através de componentes coloridos nas estantes:
    - **Âmbar/Laranja:** Orbs de energia e componentes de processamento de alta prioridade.
    - **Púrpura/Vermelho:** Amplificadores de sinal e LEDs de alerta críticos (nas estantes e suportes).
    - **Branco/Prata:** Carcaças metálicas de braços robóticos e placas de circuito.
- **Tiles Estruturais:**
    - `Σ`: Parede Industrial Sólida (Logística). Estrutura metálica de alta resistência em tons de gunmetal, apresentando reforços verticais (ribbing) e bandas técnicas horizontais. Serve como a base estrutural sólida para o setor de processamento.
    - `σ`: Piso Perfurado Logístico (Grating). Inspirado em grades metálicas industriais, apresenta slots de perfuração verticais e uma "Delimitação Logística" automática (faixas amarelas #ffcc00) em todas as bordas que fazem contato com paredes ou vácuo.
    - `π`: Parede de Estantes Multicolor (Item-Heavy). Racks verticais que organizam itens técnicos variados (orbs, sucata, cabeças robóticas, braços) com cores diversificadas. Mantém os LEDs de diagnóstico piscantes nos suportes verticais para sensação de atividade.
    - `Ω`: Teto de Vigas Estruturais (Estático). Estrutura pesada de vigas com braçadeiras, sobre uma grade técnica de fundo. Diferente de outros setores, o teto é visualmente fixo (sem pulsação) para reforçar a rigidez estrutural.
- **Identidade Visual:** Alinhado ao Setor Logístico (`~`, `o`, `u`), mas refinado para uma estética de "Fábrica Técnica Viva", onde o ciano serve como a "energia vital" do ambiente, contrastada por componentes de hardware de múltiplas cores.

## 33. Lançadores de Projéteis Modulares (R)
O sistema de lançadores permite o disparo rítmico de projéteis configuráveis para criar desafios de tempo e precisão.

### Arquitetura e Configuração:
- **Classe Base Abstrata:** O sistema utiliza uma hierarquia de herança onde a `LauncherFactory` instancia subclasses específicas (Energy, Mechanical, Void) com base nos metadados.
- **Data-Driven (Links):** O comportamento de cada lançador é definido por chaves de link no formato `${x},${y}_launcher`:
    - `type`: Define o arquétipo visual e letalidade (`box`, `antimatter`, `energy`).
    - `fireRate`: Intervalo de disparo calculado em frames.
    - `speed`: Velocidade do projétil (padrão: 4.0).
    - `initialDelay`: Atraso inicial em frames para padrões rítmicos.
    - `autoRotate`: Define o comportamento de rotação automática após cada disparo (0: desligado, 4: eixos cardinais, 8: eixos cardinais + diagonais).
    - `rotateDir`: Sentido da rotação (`CW` para Horário, `CCW` para Anti-horário).
- **Trajetória de Precisão:** Suporta rotação suave em 360 graus, com disparo nativo em até 8 direções (45° de intervalo) quando em modo de autorrotação.
- **Grade de Canais:** Integrado ao sistema global de canais (0-49).

### Arquetipos e Balanceamento:
- **ENERGY (Azul):** Turreta de titânio escovado. Dano: `ENERGY_HIT` (4 quarters / 1 coração). Visual: Plasma azul.
- **MECHANICAL (Ouro/Marrom):** Turreta de ferro pesado. Dano: `MECHANICAL_HIT` (2 quarters / 0.5 coração). Visual: Caixa de Papelão (Cardboard Box).
- **VOID (Roxo):** Turreta de cromo negro. Dano: `VOID_HIT` (12 quarters / 3 corações). Visual: Núcleo instável.

### Renderização e Estética:
- **Design Circular de Placas Metálicas:** As turretas utilizam gradientes metálicos e texturas de placas sobrepostas (plates), fugindo do visual minimalista preto para uma estética industrial pesada e rica em detalhes (rebites, pistões cromados).
- **Colisão Dinâmica:** Lançadores são tratados como entidades físicas independentes da grade estática do mapa. Eles bloqueiam o movimento do jogador e de blocos (via `isTilePassable`), mas preservam o caractere de piso original abaixo deles no `game.map`, permitindo que o sistema de `bakeBackground` renderize o cenário corretamente sob a turreta.
- **Feedback de Carga Industrial:** A intensidade luminosa dos lançadores (status lights) aumenta linearmente de 0 a 100% conforme o progresso do disparo, sem pulsação ou piscadas, garantindo um feedback claro e não frenético.
- **Integração com Editor:** O editor exibe o modelo real e a direção de disparo no painel lateral. Atua preferencialmente como um Overlay para manter a integridade do piso.

### Implementação de Referência:
A fase **"CORREDOR DE CADÊNCIA"** serve como demonstração técnica, validando o balanceamento de letalidade e os 5 padrões rítmicos.
