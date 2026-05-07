# RelatÃƒÂ³rio de Arquitetura - CIRCUIT BREAKER

Este documento descreve a estrutura base da engine do jogo e as diretrizes de implementaÃƒÂ§ÃƒÂ£o para manter a pureza do design industrial e performance.

## 1. Sistema de Lasers (MecÃƒÂ¢nica Central)
Os lasers sÃƒÂ£o processados em duas fases:
- **LÃƒÂ³gica (game.js):** O mÃƒÂ©todo `updateEmitters` traÃƒÂ§a o percurso do laser recursivamente. Ele identifica colisÃƒÂµes e categoriza o `targetNode` (WALL, DOOR, PLAYER, PRISM, CATALYST, EMITTER, BLOCK).
- **RenderizaÃƒÂ§ÃƒÂ£o (lasers.js):** O mÃƒÂ©todo `drawLaser` utiliza os dados do percurso para desenhar o feixe.

### Diretriz de Minimalismo Visual:
- **Design do Feixe:** Feixe sÃƒÂ³lido com borda roxa e nÃƒÂºcleo branco. Sem brilho externo (Outer Glow).
- **Instabilidade Vibracional:** O laser possui um jitter (vibraÃƒÂ§ÃƒÂ£o) senoidal de 0.3px e pulsaÃƒÂ§ÃƒÂ£o de largura, criando um visual de energia contida e estÃƒÂ¡vel.
- **Mixagem:** Utiliza `lighter` (Add) para sobreposiÃƒÂ§ÃƒÂ£o de feixes.

## 2. Sistema de PartÃƒÂ­culas e Feedback Visual
- **Whitelist de EmissÃƒÂ£o:** PartÃƒÂ­culas de impacto sÃƒÂ£o restritas a `WALL`, `DOOR` e `PLAYER`. Prismas e componentes tÃƒÂ©cnicos nÃƒÂ£o emitem partÃƒÂ­culas de impacto ou rotaÃƒÂ§ÃƒÂ£o.
- **EstÃƒÂ©tica Industrial:** PartÃƒÂ­culas nÃƒÂ£o utilizam gradientes ou sombras, mantendo o visual pixel-perfect.

## 3. Infraestrutura de Ãƒï¿½udio (audio/core.js)
- **Master Control:** Utiliza um `GainNode` mestre (`musicGain`) que normaliza o volume global em 50% para garantir clareza sonora.
- **SÃƒÂ­ntese Procedural:** Instrumentos e efeitos (como o zumbido dos emissores) sÃƒÂ£o gerados em tempo real, permitindo controle dinÃƒÂ¢mico de volume e pitch sem carregar assets pesados.
- **Mapeamento por Setor:** O sistema de mÃƒÂºsica ÃƒÂ© mapeado por capÃƒÂ­tulos (setores), permitindo transiÃƒÂ§ÃƒÂµes fluidas entre ÃƒÂ¡reas narrativas.
- **SÃƒÂ­ntese de Voz do RobÃƒÂ´:** O robÃƒÂ´ possui um sistema de comunicaÃƒÂ§ÃƒÂ£o procedural baseado em osciladores de onda variÃƒÂ¡vel (triangle, sawtooth, sine) e sementes aleatÃƒÂ³rias determinÃƒÂ­sticas. A "voz" reage ao estado do jogador:
    - `neutral`: InteraÃƒÂ§ÃƒÂµes e falas aleatÃƒÂ³rias durante a exploraÃƒÂ§ÃƒÂ£o.
    - `damage`: Tons mais agudos e rÃƒÂ¡pidos (glitchy) ao receber impacto.
    - `heal`: Tons harmÃƒÂ´nicos e ascendentes ao recuperar energia.
    - `dead`: Tons graves e lentos de desligamento (shutdown).
- **Gerenciamento de Contexto (Autoplay):** Para conformidade com polÃ­ticas de autoplay do navegador, o sistema de Ã¡udio e voz suspende emissÃµes atÃ© a primeira interaÃ§Ã£o do usuÃ¡rio. O motor silencia avisos e tentativas de reproduÃ§Ã£o durante o carregamento inicial (init) para evitar poluiÃ§Ã£o no console e interrupÃ§Ã£o da lÃ³gica de jogo.

## 4. Sistema de DiÃƒÂ¡logos e Rich Text (dialogue.js)
O sistema utiliza `Tippy.js` para renderizaÃƒÂ§ÃƒÂ£o de HUDs hologrÃƒÂ¡ficos.

### ConfiguraÃƒÂ§ÃƒÂ£o e Comportamento:
- **Posicionamento DinÃƒÂ¢mico (`follow`):** O HUD persegue o robÃƒÂ´ em tempo real com **Dirty Checking** (recalcula apenas se o movimento for > 0.1px).
- **Rich Text Multi-ParÃƒÂ¢metro:** Suporta tags complexas como `[arcane:intensidade:cor1:cor2]` via parser colon-aware.
- **Prioridade de Cor:** Efeitos como `arcane` e `highlight` (que requer texto preto) sobrepÃƒÂµem a tag estÃƒÂ¡tica `[color]`.
- **Efeitos Persistentes:** O efeito `crypt` utiliza um loop global probabilÃƒÂ­stico para scrambling de texto sem impacto no reflow do DOM.
- **ExceÃƒÂ§ÃƒÂ£o de Sincronia (Melt):** O efeito `melt` utiliza delays aleatÃƒÂ³rios e uma sequÃƒÂªncia de falha (blink de alta frequÃƒÂªncia) para um visual orgÃƒÂ¢nico de colapso.

## 5. Sistemas de Hazards e Triggers
- **Industrial Blackout:** Sistema de iluminaÃƒÂ§ÃƒÂ£o baseada em triggers de zona (Ã¢Å¡Â¡) que controlam a visibilidade do setor.
- **Security Alerts:** Sistema de detecÃƒÂ§ÃƒÂ£o sonora e visual que reage a invasÃƒÂµes ou falhas de sistema.
- **Solar Vortex (Portais):** Sistema de canais de entrelaÃƒÂ§amento quÃƒÂ¢ntico com sincronia de cores baseada em canais numÃƒÂ©ricos.
- **Pits (Abismos):** LÃƒÂ³gica de queda com animaÃƒÂ§ÃƒÂ£o de overshoot restaurada, garantindo movimento fluÃƒÂ­do sem pixel-snapping.

## 6. Diretrizes de Performance
- **Bake de Background:** Elementos estÃ¡ticos (chÃ£o, abismos, tetos e paredes nÃ£o-animadas) sÃ£o prÃ©-renderizados em um `bgCanvas` offscreen no carregamento do nÃ­vel.
- **MinimizaÃ§Ã£o de IteraÃ§Ã£o:** Apenas tiles animados (como terminais de computador) sÃ£o processados e desenhados individualmente no loop principal.
- **MinimizaÃ§Ã£o de Context:** Evitar `save()` e `restore()` excessivos.
- **Carga de Assets:** Prioridade para geraÃƒÂ§ÃƒÂ£o procedural sobre arquivos externos.

## 7. ProgressÃ£o e SobrevivÃªncia (Adventure Puzzle)
A engine foi migrada de um modelo de "Level-Based Puzzle" para um "Adventure Puzzle" focado em exploraÃ§Ã£o e sobrevivÃªncia.

### Sistema de HP (Zelda-Style):
- **CoraÃ§Ãµes e Quartos:** O HP Ã© medido em quartos de coraÃ§Ã£o (estÃ©tica hexagonal industrial). 3 coraÃ§Ãµes iniciais = 12 HP.
- **Dano e Invulnerabilidade:** Hazards (lasers, esmagamento) causam dano parcial em vez de morte instantÃ¢nea. ApÃ³s dano, o robÃ´ ganha i-frames curtos (20 frames) com feedback visual de **flash branco (over-brightness)** e **emissÃ£o de faÃ­scas**. Durante este perÃ­odo, o movimento Ã© bloqueado para impedir que o jogador atravesse barreiras de laser ou ignore o knockback.
- **Mecanismo de Reverse:** A morte (0 HP ou queda em buraco) gatilha o rewind quÃ¢ntico. Durante este estado (REVERSING), o jogo retrocede pelo `undoStack` em velocidade tripla atÃ© o `lastCheckpointIndex`.
- **Checkpoints DinÃ¢micos:** O checkpoint Ã© atualizado automaticamente sempre que o robÃ´ entra ou permanece sobre uma EstaÃ§Ã£o de Carregamento (`K` ou spawn `@`) que esteja energizada. Isso garante que o jogador nunca perca progresso alÃ©m da Ãºltima estaÃ§Ã£o visitada.
- **SincronizaÃ§Ã£o de Estado:** O mÃ©todo `applyState` garante a paridade total de todas as entidades dinÃ¢micas (blocks, prisms, quantum cubes, conveyors, portals, zoneTriggers) e estados globais (HP, isSolarPhase, remoteSignals). Isso impede que gatilhos de disparo Ãºnico sejam reativados incorretamente apÃ³s um undo ou que sinais remotos permaneÃ§am ativos apÃ³s uma morte.
- **SincronizaÃ§Ã£o Visual:** O sistema forÃ§a a reconciliaÃ§Ã£o de `visualX/Y` e `fallTimer` em cada frame do reverse para evitar que objetos fiquem transparentes ou "fantasmas" (sÃ³lidos mas invisÃ­veis). Blocos dentro de portais sÃ£o renderizados como hologramas (`drawLimboHologram`) para manter a continuidade visual.
- **Callback de ConclusÃ£o:** Ao finalizar o reverse, o sistema executa `onReverseComplete`, que reseta o estado de morte e restaura o controle ao jogador.

### NavegaÃƒÂ§ÃƒÂ£o e Terminais:
- **NavegaÃƒÂ§ÃƒÂ£o entre Salas:** Portas podem possuir destinos (exitTo). O robÃƒÂ´ deve navegar fisicamente entre setores.
- **Desbloqueio de SaÃƒÂ­da:** A validaÃƒÂ§ÃƒÂ£o de todos os NÃƒÂºcleos Alvo libera o canal de saÃƒÂ­da, mas **nÃƒÂ£o abre a porta automaticamente**.
- **Porta de SaÃƒÂ­da (U):** Possuem um **LED de Status**:
    - `Vermelho`: Bloqueada (Canal nÃƒÂ£o alimentado).
    - `Verde`: Desbloqueada (Canal alimentado).
- **SequÃƒÂªncia de SaÃƒÂ­da:** O jogador deve interagir (`E/EspaÃƒÂ§o`) com uma porta verde. Isso gatile uma sequÃƒÂªncia: A porta abre, o robÃƒÂ´ entra, a porta se fecha (sem causar dano por esmagamento) e sÃƒÂ³ entÃƒÂ£o a transiÃƒÂ§ÃƒÂ£o de nÃƒÂ­vel ocorre.
- **Porta de SaÃƒÂ­da (U):** Um novo tipo de entidade foi adicionado. Portas representadas por `U` no editor (ou no canal 99) possuem faixas de perigo **verdes** em vez de amarelas para sinalizar o fim do setor.
- **ConfiguraÃƒÂ§ÃƒÂ£o de Destino:** AtravÃƒÂ©s do editor, ÃƒÂ© possÃƒÂ­vel definir a propriedade `exitTo` em portas de saÃƒÂ­da para criar hubs e caminhos nÃƒÂ£o lineares.
- **Timer Opcional:** O cronÃƒÂ´metro nÃƒÂ£o ÃƒÂ© mais obrigatÃƒÂ³rio por padrÃƒÂ£o. NÃƒÂ­veis podem ser explorados sem pressÃƒÂ£o de tempo, a menos que um timer seja explicitamente definido para desafios especÃƒÂ­ficos.
- **RelatÃƒÂ³rio de OperaÃƒÂ§ÃƒÂ£o:** O Result Screen foi removido do fluxo obrigatÃƒÂ³rio. Ao cruzar uma porta de saÃƒÂ­da, o jogo realiza a transiÃƒÂ§ÃƒÂ£o de portÃƒÂ¡o e carrega o prÃƒÂ³ximo setor instantaneamente para manter a fluidez da aventura.
- **Portas PrÃƒÂ©-Abertas (Initial State):** Portas (D) e SaÃƒÂ­das (U) suportam o flag `initOpen` via metadados de links (`_init`). Quando ativo, a porta inicia no estado `OPEN` e ignora sinais lÃƒÂ³gicos de fechamento, permitindo criar caminhos permanentemente abertos ou salas de entrada sem requisitos.

### Sistema de Progresso e Habilidades (game_progress.js):
- **Desbloqueio de Habilidades:** MÃ³dulos que expandem as capacidades do robÃ´:
    - `grab`: Agarrar blocos (MÃ³dulo MagnÃ©tico).
    - `multi_push`: Empurrar mÃºltiplos blocos (HidrÃ¡ulica).
    - `manipulate_prisms`: Rotacionar prismas (Ã“ptica AvanÃ§ada).
    - `rotate_emitters`: Girar canhÃµes laser.
    - `singularity_interaction`: Alternar Fases Solares/Lunares atravÃ©s do **Alternador de Singularidade (`%`)**.
    - `portal_travel`: Atravessar portais sem colapso (Viagem Entre-Portais).
    - `sideways_transmission`: Cubos transmitem energia para os lados (DifusÃ£o Lateral).
    - `run`: Aumento de velocidade de deslocamento (MÃ³dulo de Sobrecarga).
- **Gatilhos de ConcessÃ£o:** AtravÃ©s do sistema de triggers (âš¡), Ã© possÃ­vel conceder habilidades ao jogador (`grant_ability`) ou aumentar a vida mÃ¡xima (`increase_max_hp`).
- **PersistÃªncia:** O sistema `GameProgress` mantÃ©m o estado das habilidades adquiridas, permitindo que o jogador progrida e acesse novas Ã¡reas (Metroidvania-lite).
- **InicializaÃ§Ã£o Segura:** O sistema garante que as propriedades de habilidades (`abilities`), sinais (`completionSignals`) e estados (`levelStates`) sejam instanciadas por padrÃ£o, prevenindo erros de referÃªncia (`TypeError`) durante o ciclo de carregamento prematuro do `GameState`.
- **Sinais Globais (Global Signals):** Permite que aÃ§Ãµes em um nÃ­vel (ex: puxar uma alavanca) alterem permanentemente o estado de outro nÃ­vel (ex: abrir uma porta no Hub). O sistema `GameProgress.addSignal(channel)` gerencia essa persistÃªncia cross-level. BotÃµes (levers/pads) podem ser configurados como **Globais**, sincronizando seu estado fÃ­sico com o registro persistente do progresso.
- **SincronizaÃ§Ã£o de Economia:** O valor de `scrapTotal` em `GameProgress` Ã© a fonte Ãºnica de verdade para a economia do jogo, sincronizando-se automaticamente com o `GameState` e o `ShopSystem` para evitar divergÃªncias de saldo.
- **Feedback de Falha:** Tentar usar uma habilidade nÃ£o adquirida resulta em feedback visual (visor vermelho), sinal sonoro de negado (Negative Blip) ou falha catastrÃ³fica (morte em portais sem o mÃ³dulo adequado).
- **MecÃ¢nica de Knockback:** Receber dano resulta em um impacto fÃ­sico que sempre empurra o robÃ´ para a direÃ§Ã£o oposta Ã  que ele estÃ¡ olhando (recoil). O sistema utiliza um atraso intencional de frames (`knockbackDelay`) para permitir que a animaÃ§Ã£o mostre o robÃ´ atingindo o perigo antes de ser expelido. Caso o caminho esteja bloqueado, o sistema utiliza a posiÃ§Ã£o anterior (`prevX/Y`) como salvaguarda para garantir o isolamento de zonas bloqueadas.

## 8. Economia e Upgrades (Shop System)
- **Sucata (Scrap):** Moeda industrial coletada nos nÃ­veis. O total Ã© persistido globalmente em `GameProgress.scrapTotal`.
- **Terminais de Troca ($):** Localizados principalmente no Hub, permitem ao jogador trocar sucata por upgrades permanentes. Atuam como blocos sÃ³lidos intransponÃ­veis (colisÃ£o tipo computador).
- **Upgrades DisponÃ­veis:** ExpansÃ£o de bateria (HP Max), ReduÃ§Ã£o de Recuo, MÃ³dulos de Radar e Overclock de CPU.

## 9. Estrutura de Mundo (Hub & Nexus)
- **Nexus Central (Hub):** Um nÃ­vel central (50x50+) que serve como ponto de conexÃ£o entre todos os setores.
- **Gating de ProgressÃ£o:** O acesso a novos setores Ã© controlado por:
    - **Portais Verdes (U):** Portas de transiÃ§Ã£o que levam a nÃ­veis especÃ­ficos.
    - **Canais QuÃ¢nticos:** Algumas portas do Hub sÃ³ abrem quando sinais globais especÃ­ficos sÃ£o ativados em missÃµes externas.

## 10. Controles e InteraÃ§Ã£o
- **Comandos Principais:**
    - `WASD / Setas`: Movimento.
    - `EspaÃ§o / E`: Interagir (Ativar botÃµes, girar canhÃµes).
    - `Q`: Agarrar/Soltar Cubos (MÃ³dulo MagnÃ©tico).
    - `Shift`: Correr/Sprint (MÃ³dulo de Sobrecarga - se desbloqueado).
    - `Z`: Desfazer (Undo).
    - `R`: Reiniciar/Reverter (Reverse).

## 11. Arquitetura de Ciclo de Vida (Game Loop)
A engine utiliza um sistema de **Fixed Timestep** com acumulador para garantir paridade de simulaÃƒÂ§ÃƒÂ£o em qualquer hardware.

### Funcionamento:
- **FrequÃƒÂªncia de AtualizaÃƒÂ§ÃƒÂ£o (TPS):** A lÃƒÂ³gica do jogo (`updateGameLogic`) roda a **60 Ticks por Segundo** constantes. Isso impede que a fÃƒÂ­sica ou mecÃƒÂ¢nicas de tempo (como timers de recarga ou velocidade do robÃƒÂ´) variem em monitores de alta frequÃƒÂªncia (144Hz+).
- **Desacoplamento de RenderizaÃƒÂ§ÃƒÂ£o:** O loop de desenho (`renderGameVisuals`) ÃƒÂ© executado via `requestAnimationFrame`, aproveitando a fluidez mÃƒÂ¡xima do monitor do usuÃƒÂ¡rio sem afetar a velocidade real da simulaÃƒÂ§ÃƒÂ£o.
- **ProteÃƒÂ§ÃƒÂ£o contra "Spiral of Death":** O acumulador possui um teto de 100ms por frame para evitar que o jogo tente recuperar milhares de frames perdidos caso a aba fique em segundo plano ou sofra um engasgo severo de performance.

## 12. PersistÃªncia de Mundo (World Persistence)
O jogo utiliza um sistema de snapshots de instÃ¢ncia para garantir que o progresso dentro de cada setor seja mantido ao navegar pelo Nexus.

### Funcionamento do Snapshot:
- **Captura (`captureLevelState`):** Ao sair de um nÃ­vel (atravÃ©s de uma porta de saÃ­da ou transiÃ§Ã£o), o sistema gera um snapshot contendo:
    - Estado de todos os botÃµes e alavancas.
    - Estado das portas (abertas, fechadas ou quebradas).
    - PosiÃ§Ã£o atual de todos os blocos mÃ³veis e prismas.
    - Registro de sucatas coletadas e diÃ¡logos disparados.
- **Armazenamento:** Os dados sÃ£o salvos em `GameProgress.levelStates`, indexados pelo ID do nÃ­vel.
- **AplicaÃ§Ã£o (`applyLevelState`):** Ao reentrar em um nÃ­vel, o sistema reconstrÃ³i o ambiente a partir do snapshot antes do primeiro frame de renderizaÃ§Ã£o.

### ProteÃ§Ã£o de Reset (R):
- O sistema distingue entre **NavegaÃ§Ã£o** (ir para outra sala) and **ReversÃ£o** (morte ou reset manual).
- O estado de uma fase sÃ³ Ã© gravado permanentemente ao **mudar** de nÃ­vel. 
- Se o jogador usar a reversÃ£o quÃ¢ntica (`R`), o jogo carrega o estado persistente "limpo" (ou o Ãºltimo snapshot salvo ao entrar na sala), permitindo que ele tente resolver o puzzle novamente caso tenha se prendido.

## 13. NÃ­veis de RecepÃ§Ã£o e Conectividade
- **NÃ­veis de RecepÃ§Ã£o:** Cada setor (capÃ­tulo) possui um nÃ­vel de "RecepÃ§Ã£o" vazio que serve de interface entre o Hub e as missÃµes do setor.
- **Portas de Retorno:** Todos os nÃ­veis de recepÃ§Ã£o devem obrigatoriamente possuir uma porta `U` (SaÃ­da) com `exitTo` apontando de volta para o Hub (`NEXUS CENTRAL (HUB)`).
- **World Labels DinÃ¢micos (|):** O sistema de mapas utiliza o marcador `|` para posicionar rÃ³tulos de mundo hologrÃ¡ficos. O texto exibido Ã© definido na camada de eventos (`links`) atravÃ©s da propriedade `${x},${y}_label`.
    - **Escala Visual:** Renderizados com fonte **20px**, permitindo que o texto transborde as fronteiras do tile (32x32) para mÃ¡xima legibilidade sem sacrificar a resoluÃ§Ã£o.
    - **Proximidade:** Os rÃ³tulos utilizam um efeito de fade-in por proximidade (raio de 4 tiles para inÃ­cio, 2 tiles para opacidade total).
    - **EstÃ©tica:** Renderizados com blending aditivo (`lighter`) e brilho externo (`shadowBlur`) para reforÃ§ar a natureza hologrÃ¡fica.
- **IntegraÃ§Ã£o com Editor:** O editor de fases e o modo de teste suportam nativamente a renderizaÃ§Ã£o de Terminais de Loja (`$`) e RÃ³tulos de Mundo (`|`). O editor utiliza uma simulaÃ§Ã£o de lÃ³gicas simplificadas (`rebuildMock`) para garantir que o preview visual seja 100% fiel ao comportamento em jogo.

## 14. Fluxo de ConfiguraÃ§Ã£o de Portais (Editor)
O editor de fases implementa um fluxo especializado para gerenciar a conectividade entre setores e o posicionamento preciso do jogador.

### Mecanismo de SeleÃ§Ã£o de Spawn:
- **Propriedades Estendidas:** Portas de saÃ­da (`U`) podem armazenar metadados de destino adicionais via sistema de `links`:
    - `exitTo`: Nome ou Ã­ndice do nÃ­vel de destino.
    - `spawnX` / `spawnY`: Coordenadas especÃ­ficas onde o robÃ´ aparecerÃ¡ no mapa de destino.
- **Interface Visual (`spawn_selector.js`):** O editor fornece uma prÃ©via em tempo real do setor de destino dentro de um overlay modal, permitindo a visualizaÃ§Ã£o da geometria e entidades do destino sem sair do contexto de ediÃ§Ã£o.
    - **Alta Fidelidade de RenderizaÃ§Ã£o:** O sistema de preview foi refatorado para realizar uma renderizaÃ§Ã£o multi-camada (Base, Overlay e Blocos) idÃªntica ao motor de jogo. Ele utiliza uma lÃ³gica de "mini-mock" para pre-processar estados complexos como direÃ§Ãµes de esteiras, canais de portais, e estados de fiaÃ§Ã£o, garantindo paridade visual de 1:1.
    - **ConfirmaÃ§Ã£o Visual de Spawn:** O usuÃ¡rio seleciona o destino e clica diretamente no mapa para definir o ponto de entrada exato. O sistema exibe um marcador visual (ðŸ“�) e um highlight semitransparente no tile selecionado para feedback imediato e confiÃ¡vel.
- **Fallback AutomÃ¡tico:** Caso nenhuma coordenada de spawn seja definida manualmente, o motor de jogo (`game.js`) utiliza o ponto de spawn padrÃ£o (`@`) definido no arquivo do mapa de destino.
- **ExecuÃ§Ã£o em Jogo:** Durante a transiÃ§Ã£o de nÃ­vel (`loadLevel`), o sistema verifica a existÃªncia de `customSpawn`. Se presente, as coordenadas de `@` no mapa original sÃ£o ignoradas em favor dos metadados do portal, permitindo entradas mÃºltiplas no mesmo setor.

## 15. Sistema de HUD Modernizado (Canvas HUD)
O sistema de HUD foi totalmente integrado ao pipeline de renderizaÃ§Ã£o do Canvas principal, abandonando elementos DOM em favor de uma estÃ©tica de terminal de alta performance ("Green Tech").

### Layout e EstÃ©tica Industrial:
- **CoraÃ§Ãµes QuÃ¢nticos (Top-Left):** Utiliza hexÃ¡gonos procedurais divididos em 4 quadrantes ("Corte de Pizza"). Cada quadrante representa 1/4 de HP, preenchendo no sentido Top-Left -> Top-Right -> Bottom-Left -> Bottom-Right. Possui linhas divisÃ³rias internas para clareza visual e um sistema de **Damage Flash** (brilho branco por 30 frames) para feedback imediato. Posicionados com margem de 60px.
- **Ã�rea Contextual Central (Top-Center):** EspaÃ§o dinÃ¢mico que alterna entre informaÃ§Ãµes narrativas e operacionais:
    - **SequÃªncia de Entrada:** Exibe o nome do nÃ­vel em destaque com efeito glitch por 2 segundos, deslizando para cima para dar lugar ao monitor de missÃ£o.
    - **Monitor de MissÃ£o:** Agrupa o `Timer` (com destaque em fundo verde e texto preto para alta legibilidade) e a barra de `AMPS` (segmentos visuais representando a carga dos nÃºcleos). O conjunto Ã© centralizado dinamicamente.
- **Contador de Sucata (Top-Right):** Exibe apenas o total coletado (`game.scrapCollected`) ao lado de um Ã­cone de engrenagem em rotaÃ§Ã£o constante. O Ã­cone possui um ajuste de alinhamento visual de +2px para compensar a linha de base da fonte VT323.
- **Minimalismo de Dados:** Removido o formato "x/y" para sucatas, focando apenas no progresso acumulado para reduzir o ruÃ­do visual.

## 16. PersistÃªncia do Editor (Editor Core)
O motor do editor foi refinado para garantir que a intenÃ§Ã£o do designer seja preservada fielmente no arquivo `levels.js`.

### SincronizaÃ§Ã£o de Dados:
- **Force Sync no Salvamento:** O botÃ£o de salvar dispara obrigatoriamente um `rebuildMock()`, garantindo que valores em campos de texto (como Nome ou Timer) que ainda nÃ£o perderam o foco (blur) sejam capturados.
- **LÃ³gica de Timer:** O parÃ¢metro `timer` agora aceita o valor `0` (Infinito/Desativado), corrigindo o bug onde o servidor de salvamento sobrescrevia valores zerados pelo padrÃ£o de 60 segundos.
- **Grid de Canais:** O sistema de seleÃ§Ã£o de canais foi expandido para suportar atÃ© **50 canais individuais** sem perda de performance. A interface foi otimizada com cÃ©lulas de 18px e feedback visual de uso (`in-use`) para facilitar a gestÃ£o de redes complexas de lasers e portas.
- **Limpeza de Propriedades:** Propriedades redundantes como `time` (estÃ¡tica) foram removidas da serializaÃ§Ã£o para manter o arquivo de nÃ­veis limpo e focado em dados de gameplay.

## 17. Vidro TÃ©cnico e Ã“ptica Procedural (G/g)
O Vidro TÃ©cnico Ã© um elemento estrutural especializado que interage com o sistema de lasers.

### Comportamento FÃ­sico e LÃ³gico:
- **ColisÃ£o:** Atua como uma parede sÃ³lida para o jogador e blocos mÃ³veis (`G` e `g`).
- **Ã“ptica:** Enquanto o Vidro TÃ©cnico (`G`) Ã© puramente estrutural e transparente, a Parede Ã“ptica (`g`) inclui componentes laboratoriais como lentes de aumento e conduÃ­tes de vidro pulsantes.
- **DetecÃ§Ã£o de Hit:** O motor de fÃ­sica (`game.js`) mantÃ©m um set dinÃ¢mico (`glassWallsHit`) que registra quais tiles de vidro estÃ£o sendo atravessados por lasers em cada frame.

### RenderizaÃ§Ã£o e EstÃ©tica:
- **Camada de Desenho:** Vidros sÃ£o renderizados no **Pass 2.07** do loop principal (apÃ³s os lasers), permitindo um efeito de translucidez e brilho sobreposto.
- **AnimaÃ§Ã£o Procedural:** Utiliza o mÃ©todo `drawGlassWall`, que gera reflexos diagonais mÃ³veis (animated sweeps) para simular brilho de superfÃ­cie.
- **Feedback de Energia:** Quando um vidro estÃ¡ no percurso de um laser, ele emite um **brilho ciano (glow)** em sua borda, indicando conduÃ§Ã£o de energia Ã³ptica.

## 18. PadronizaÃ§Ã£o de SÃ­mbolos e Conflitos de Camadas
Para eliminar ambiguidades no interpretador de mapas, o sistema de sÃ­mbolos foi refinado.

### ResoluÃ§Ã£o de Conflitos:
- **RÃ³tulos HologrÃ¡ficos:** O sÃ­mbolo utiliza o caractere **`!`** (exclamaÃ§Ã£o). Anteriormente em conflito com o Alternador de Singularidade, este Ãºltimo foi movido para `%`, consolidando o `!` exclusivamente para textos hologrÃ¡ficos. O sÃ­mbolo `|` foi liberado.
- **Singularity Switcher:** Utiliza o sÃ­mbolo `%` na camada de *Overlay*, permitindo que o sÃ­mbolo `!` seja usado exclusivamente para RÃ³tulos de Mundo (Labels).
- **DiferenciaÃ§Ã£o por Camada:** A engine agora prioriza `oc` (overlayChar) para interativos de piso e `c` (mapChar) para estruturas, mas mantÃ©m a verificaÃ§Ã£o cruzada para garantir retrocompatibilidade onde aplicÃ¡vel.
## 19. EstÃ©tica High-Tech e Setor Modular (h/m)
O Setor High-Tech introduz uma estÃ©tica inspirada em ficÃ§Ã£o cientÃ­fica clÃ¡ssica (estilo Star Wars), focada em superfÃ­cies metÃ¡licas escuras e iluminaÃ§Ã£o neon ciano.

### Detalhes TÃ©cnicos e Visuais:
- **PainÃ©is Modulares (`h`):** Utiliza uma base cinza-azulada profunda (`#0a1014`) com recuos geomÃ©tricos. 
    - **VariaÃ§Ãµes Procedurais:** Inclui portas de dados circulares, cabeamento exposto ("greebles") e painÃ©is de luz branca/ciano tÃ­picos de infraestruturas espaciais avanÃ§adas.
- **Troncos de Energia (`m`):** Paredes com tubulaÃ§Ãµes centrais maciÃ§as que exibem um nÃºcleo de energia pulsante. Utiliza `shadowBlur` dinÃ¢mico para simular a irradiaÃ§Ã£o de energia atravÃ©s do invÃ³lucro metÃ¡lico.
- **Teto Composto Procedural (`Y`):** Teto estrutural Green Tech com conectividade inteligente. Paleta verde industrial (`#060a08`, `#0f1a14`) com molduras grossas e sutis, LEDs de diagnÃ³stico verdes (`#00bb88`), e parafusos de canto. Sistema de bitmask (1:Up, 2:Right, 4:Down, 8:Left) para supressÃ£o automÃ¡tica de bordas internas.
- **Teto Bronze Procedural (`#`):** Teto padrÃ£o com conectividade modular. Paleta bronze/cobre escura (`#1a1820`, `#20202b`) com chanfros metÃ¡licos quentes (`rgba(255, 240, 200, 0.08)`), sulcos internos em tom bronze, e rebites de canto. Utiliza o mesmo sistema de bitmask procedural, permitindo que blocos adjacentes de `#` formem placas unificadas com bordas suprimidas.
- **IntegraÃ§Ã£o de Performance:** Todos os tetos procedurais (`#`, `Y`, `N`) sÃ£o processados no pipeline de prÃ©-renderizaÃ§Ã£o (`bakeBackground`) com cÃ¡lculo de mÃ¡scara de vizinhanÃ§a, mantendo apenas LEDs piscantes como camadas dinÃ¢micas.

## 20. Registro de SÃ­mbolos e Disponibilidade
Para sustentar a expansÃ£o modular do jogo, foi estabelecido um inventÃ¡rio rigoroso de caracteres para evitar sobreposiÃ§Ã£o de funÃ§Ãµes.

### Estado Atual do InventÃ¡rio:
- **Estruturas TÃ©cnicas Expandidas:** Os caracteres `h` e `m` foram integrados para a estÃ©tica "High-Tech", servindo como paredes estruturais com variaÃ§Ãµes de painÃ©is e tubulaÃ§Ãµes de energia.
- **DiferenciaÃ§Ã£o de RÃ³tulos:** O sÃ­mbolo `!` Ã© o padrÃ£o para Ã¢ncoras hologrÃ¡ficas (Labels), enquanto `%` Ã© reservado para o Alternador de Singularidade. O sÃ­mbolo `|` estÃ¡ livre para uso futuro.
- **Mapeamento NumÃ©rico:** Os caracteres `1` a `9` sÃ£o reservados para **NÃºcleos de Carga (Targets)** com requisitos especÃ­ficos, enquanto `0` Ã© o sÃ­mbolo universal para **Zonas Proibidas** (bloqueio absoluto).
- **LaboratÃ³rio Ã“ptico:** Os caracteres `g` (Parede Ã“ptica) e `t` (ChÃ£o Ã“ptico) foram integrados para a estÃ©tica de laboratÃ³rio de precisÃ£o, apresentando elementos iridescentes e superfÃ­cies de vidro.
- **EspaÃ§o Livre:** Outras opÃ§Ãµes disponÃ­veis para novos sistemas incluem `u`, `w` (conflito com fiaÃ§Ã£o a evitar), alÃ©m de sÃ­mbolos como `&`, `=` e `-`.
- **Setor LogÃ­stico:** Os caracteres `o` (ChÃ£o), `{` (Parede) e `}` (Teto) foram integrados para a estÃ©tica de armazÃ©m industrial e logÃ­stica.
- **Setores EspecÃ­ficos:**
    - `x`, `z`, `q`: Agrupados no **Setor: Compilador** (Estrutura Lab/Transcendental).
    - `?`, `Q`, `O`, `.`, `'`, `"`, `|`: Agrupados no **Setor: QuÃ¢ntico** (MecÃ¢nicas AvanÃ§adas e MÃ­stico-Tecnologia).
    - `N`: Teto Ã“ptico Procedural (Setor Ã“ptico).

## 21. Setor: Compilador (ResignificaÃ§Ã£o de Ativos)
O Setor Compilador centraliza ativos de alta tecnologia com estÃ©tica laboratorial e transcendental.

### Detalhes Visuais e Comportamento:
- **ChÃ£o Compilador (`z`):** Vidro Iridescente. Piso tÃ©cnico que apresenta uma camada de brilho mÃ³vel ("sheen") com shift de matiz senoidal. Ã‰ um tile passÃ¡vel que herda a estÃ©tica de laboratÃ³rios assÃ©pticos avanÃ§ados.
- **Parede Compilador (`q`):** Parede Transcendental. SuperfÃ­cie roxa profunda com um nÃ³ central pulsante e linhas de grade que emitem brilho etÃ©reo. Atua como barreira sÃ³lida e possui animaÃ§Ã£o procedural baseada no tempo do motor.
- **Teto Compilador (`x`):** MatÃ©ria Cristalizada (Voronoi). Teto estrutural com estÃ©tica de fragmentos geomÃ©tricos ametista. Utiliza o algoritmo de Voronoi para criar um padrÃ£o de cristalizaÃ§Ã£o Ãºnico baseado na semente do nÃ­vel.

## 22. Setor: QuÃ¢ntico (Estrutura)
Este setor agrupa a base estrutural para ambientes quÃ¢nticos.

### Elementos:
- **Abismo de VÃ¡cuo (`.`):** Variante mecÃ¢nica do buraco tradicional com estÃ©tica de estrelas.
- **ChÃ£o QuÃ¢ntico RÃºnico (`'`):** ArdÃ³sia azul profunda com runas pulsantes.
- **Parede de Circuito Sagrado (`"`):** Paredes com mandalas rotativas e bordas douradas.
- **Teto QuÃ¢ntico Mandala (`|`):** Teto com anÃ©is dourados e nÃºcleos de energia.

## 23. MecÃ¢nicas QuÃ¢nticas (Overlay)
Agrupamento de objetos interativos de manipulaÃ§Ã£o dimensional.

### Elementos e Comportamento:
- **ChÃ£o QuÃ¢ntico (`?`):** Piso que permite travessia sobre abismos.
- **Catalisador (`Q`):** Ponto de controle para feixes de laser.
- **Portal QuÃ¢ntico (`O`):** Sistema de teletransporte.

## 24. Setor Ã“ptico (LaboratÃ³rio de PrecisÃ£o)
O Setor Ã“ptico foca em uma estÃ©tica de laboratÃ³rio "Aseptic-Glass", utilizando iridescÃªncia e transparÃªncia como temas centrais.

### Elementos Visuais e Procedurais:
- **Parede Ã“ptica (`g`):** Apresenta quatro variantes principais:
    - **Painel Liso:** SuperfÃ­cie de metal polido com juntas tÃ©cnicas sutis (base para Ã¡reas limpas).
    - **Lente/Viewport:** Janelas circulares com reflexos dinÃ¢micos.
    - **ConduÃ­tes de Vidro:** Tubos verticais com lÃ­quido fluorescente que pulsa em cores variÃ¡veis.
    - **Gauge de Laser:** Mostradores digitais que exibem feixes de laser decorativos sincronizados com o tempo do motor.
- **ChÃ£o Ã“ptico (`t`):** Piso tÃ©cnico azulado (`hsl(210, 30%, 85%)`) com grade hexagonal iridescente. Utiliza um gradiente linear mÃ³vel (`animated sheen`) com matiz variÃ¡vel e saturaÃ§Ã£o total para simular superfÃ­cies polidas sob iluminaÃ§Ã£o de precisÃ£o. A grade tÃ©cnica azul (`rgba(0, 150, 255, 0.1)`) reforÃ§a a estÃ©tica de laboratÃ³rio avanÃ§ado. Todos os tiles do setor sÃ£o registrados como estruturais (`isStructural`), garantindo que se comportem como barreiras sÃ³lidas e superfÃ­cies caminhÃ¡veis estÃ¡veis.
- **Teto Ã“ptico Procedural (`N`):** Teto estrutural com conectividade inteligente. Apresenta uma estÃ©tica de molduras aninhadas em tons de ciano e azul profundo, com cantos chanfrados e uma moldura intermediÃ¡ria pontilhada. O sistema de mÃ¡scara procedural remove bordas internas automaticamente quando tiles do mesmo tipo sÃ£o adjacentes, criando estruturas contÃ­nuas de laboratÃ³rio.

## 25. Setor: LaboratÃ³rio (AssÃ©ptico)
O Setor LaboratÃ³rio utiliza uma estÃ©tica limpa, estÃ©ril e futurista, com predominÃ¢ncia de tons brancos e cinzas.

### Elementos:
- **Teto AssÃ©ptico Procedural (`A`):** Teto estrutural com conectividade modular massiva. Paleta branco-cinza (`hsl(210, 5%, 82%)`) com chanfros de profundidade industriais (2px). Possui barras divisÃ³rias centrais extra-largas (16px) com sulco profundo 3D, suprimidas em conexÃµes entre tiles iguais. Inclui rebites de canto gigantes (6px) para estÃ©tica brutalista.
- **ChÃ£o AssÃ©ptico (`a`):** Piso limpo com variaÃ§Ã£o de padrÃµes antiderrapantes e desgastes sutis.
- **Parede LaboratÃ³rio (`f`):** Parede metÃ¡lica off-white com trilhos de luz ciano integrados.
## 26. Setor: LogÃ­stica (Warehouse)
O Setor LogÃ­stica utiliza uma estÃ©tica industrial de armazÃ©m, com paleta de amarelos, cinzas e tons azulados.

### Elementos:
- **ChÃ£o Placas Metal (`o`):** Piso de placas de aÃ§o cinza escuro com rebites nos cantos e sulcos de encaixe industriais.
- **ChÃ£o TÃ¡til Amarelo (`,`):** Piso antiderrapante (piso tÃ¡til) em tons vibrantes de amarelo e laranja. Possui padrÃµes procedurais de relevos circulares (bolinhas) e barras lineares com efeito 3D (luz e sombra), imitando sinalizaÃ§Ãµes de acessibilidade e seguranÃ§a industrial.
- **Parede Estantes com Caixas (`{`):** Estrutura de prateleiras industriais de aÃ§o (racks) organizando pilhas de caixas amarelas. Possui vigas verticais e horizontais detalhadas com parafusos e realces metÃ¡licos. Inclui variaÃ§Ãµes procedurais com diferentes empilhamentos e uma variaÃ§Ã£o de **estante vazia**, criando um visual de armazÃ©m realista e dinÃ¢mico.
- **Parede Estantes com Sucata (`~`):** VariaÃ§Ã£o da estante industrial contendo componentes tecnolÃ³gicos diversos em vez de caixas. Inclui orbes energÃ©ticos (azuis e verdes), peÃ§as do robÃ´ protagonista desmanteladas (cabeÃ§a com visor azul e corpo laranja, braÃ§os articulados), roldanas metÃ¡licas (pulleys), emissores laser e fragmentos de blocos amplificadores. As peÃ§as do robÃ´ utilizam a paleta de cores caracterÃ­stica (Laranja `#e67e22`, Azul `#2980b9` e Amarelo `#f1c40f`).
- **Teto LogÃ­stico Procedural (`}`):** Grade de vigas estruturais amarelas com conectividade inteligente via bitmask, criando uma rede de suporte industrial contÃ­nua.

## 27. Gerador de Masmorras Procedural (Ultimate Dungeon Lab)
O editor integra um sistema de gerao procedural para criao rpida de layouts complexos e randomized.

### Algoritmos:
- **Particionamento Grid (Estruturado):** Divide o mapa em cÃ©lulas e posiciona salas com jitter (caos) e preenchimento variÃ¡vel. O algoritmo agora reserva uma **margem de 2 tiles** nas bordas para garantir espaÃ§o para as paredes de perspectiva e centraliza a grade perfeitamente.
- **Aleatrio Livre (Orgnico):** Posiciona salas de forma catica, utilizando gravidade central para agrupar o layout. Ideal para cavernas ou setores degradados.

### IntegraÃ§Ã£o de Setores DinÃ¢mica:
O gerador utiliza o objeto `SECTOR_THEMES` para mapear automaticamente os sÃ­mbolos base (ChÃ£o, Parede, Teto). Novas adiÃ§Ãµes de setores no motor sÃ£o automaticamente listadas no editor:
- **ConfiguraÃ§Ã£o Centralizada:** Cada tema define seu trio de tiles (`floor`, `wall`, `ceil`).
- **Preview em Tempo Real:** O editor agora atualiza o mapa instantaneamente conforme os sliders sÃ£o movidos, permitindo "escriturar" o layout antes de aplicar permanentemente.

### Regras de Perspectiva (3/4):
Para manter a coerÃªncia visual do motor:
- **Paredes no Topo:** O gerador posiciona tiles de "Parede" apenas em espaÃ§os vazios que estejam **diretamente acima** de um chÃ£o. Isso cria a face frontal da parede visÃ­vel ao jogador.
- **TransiÃ§Ã£o Direta:** Laterais e partes inferiores das salas transitam diretamente para o Teto ou Vazio, sem faces de parede, respeitando a perspectiva top-down 3/4.

### Entidades Automticas:
- **Player (@):** Posicionado na primeira sala gerada.
- **Sucata (S):** Distribuda aleatoriamente em salas.
- **Alvos (T):** Posicionados como objetivos em salas remotas.
- **Rtulos (!):** Gerados com nomes de setores dinmicos para facilitar a navegao.

### Ps-Processamento:
- **ErosÃ£o:** Um filtro de ruÃ­do que remove tiles de quina para criar formatos mais orgÃ¢nicos e menos retangulares.
- **Conectividade:** Caminhos (CORRIDOR) sÃ£o esculpidos entre salas para garantir que o nÃ­vel seja navegÃ¡vel.

## 28. Sistema de Descoberta (Fog of War)
O jogo suporta um sistema de exploraÃ§Ã£o onde o mapa inicia escuro e Ã© revelado conforme o jogador se move.

### Funcionamento:
- **MÃ¡scara de Visibilidade:** O `GameState` mantÃ©m um `Set` de coordenadas `discovered`.
- **RevelaÃ§Ã£o por Sala:** Quando o jogador entra nos limites de uma sala (definida no `levelData.rooms`), todos os tiles daquela sala sÃ£o revelados instantaneamente.
- **RevelaÃ§Ã£o por Proximidade:** Para corredores e Ã¡reas fora de salas, existe um raio de visÃ£o fixo (2 tiles) que revela o caminho conforme o jogador avanÃ§a.
- **RenderizaÃ§Ã£o:** Um pass de renderizaÃ§Ã£o (`Pass 0.5`) desenha retÃ¢ngulos pretos (`#000000`) sobre qualquer tile que nÃ£o esteja no `Set` de descoberta.
- **IntegraÃ§Ã£o Procedural:** O gerador de masmorras exporta automaticamente as coordenadas das salas para o sistema de descoberta.


## 29. Setor: Nexus Central (Hub)
O Nexus Central atua como o ponto de confluÃªncia do mundo de Circuit Breaker, unindo os diversos setores tecnolÃ³gicos em uma estrutura massiva de suporte e transiÃ§Ã£o.

### EstÃ©tica e Atmosfera:
- **Visual Industrial Pesado:** O Nexus utiliza uma paleta de tons metÃ¡licos oxidados, cimento e detalhes em ciano pulsante.
- **MecÃ¢nica VisÃ­vel:** Engrenagens, pistÃµes e vÃ¡lvulas de vapor sÃ£o elementos decorativos centrais, reforÃ§ando a ideia de uma mÃ¡quina viva.
- **Ambiente de Suspense:** A iluminaÃ§Ã£o Ã© baixa (Penumbra), com focos de luz tÃ©cnica que revelam a magnitude da estrutura.

## 29. Sistema de Ã�udio: Crono Nexus (MÃºsica Procedural)
O Nexus Central introduz um sistema de mÃºsica procedural altamente dinÃ¢mico, desenhado para evoluir com a exploraÃ§Ã£o do jogador.

### Camadas Sonoras e Intensidade:
O sistema utiliza trÃªs nÃ­veis de intensidade (`musicIntensity`) que alteram o BPM e a complexidade instrumental:
1.  **Intensidade 0 (Penumbra - 85 BPM):** Foco em ambiÃªncia e mistÃ©rio. Utiliza o `VoidPad_Nexus` para criar um colchÃ£o sonoro sombrio e pistÃµes ocasionais.
2.  **Intensidade 1 (MÃ¡quinas Ativas - 110 BPM):** Introduz percussÃ£o mecÃ¢nica (Tech Bass e Radar Blips) e a melodia principal (`MysticLead`), simbolizando a reativaÃ§Ã£o dos sistemas do Hub.
3.  **Intensidade 2 (Salto Temporal - 135 BPM):** Camada de aÃ§Ã£o total. Adiciona Arpeggios cibernÃ©ticos (`CyberArp`), guitarras de aÃ§Ã£o (`ActionChug`) e snares industriais, preparando o jogador para desafios de alta velocidade.

### Instrumentos Procedurais (Zero Assets):
- **Void Pad:** SÃ­ntese de ondas senoidais e dente-de-serra filtradas para ambiÃªncia espacial.
- **Steam Vent:** RuÃ­do branco com modulaÃ§Ã£o de filtro bandpass para simular escapes de vapor.
- **Piston:** Onda triangular com wave-shaping para percussÃ£o metÃ¡lica profunda.
- **Mystic Lead:** Melodia lÃ­mpida e etÃ©rea que guia o tema principal do jogo.

## 30. Setor: Realidade (Multicolor Neon)
O Setor Realidade Ã© uma distorÃ§Ã£o estÃ©tica da arquitetura High-Tech, onde a lÃ³gica de cores estÃ¡tica Ã© substituÃ­da por um espectro dinÃ¢mico de neon.

### EstÃ©tica e RenderizaÃ§Ã£o:
- **Hue-Shifting Procedural:** Ao contrÃ¡rio dos outros setores, a iluminaÃ§Ã£o do Realidade utiliza um sistema de `hsl()` baseado no tempo (`Date.now()`), semente do nÃ­vel e coordenadas locais. Isso cria um efeito de luzes pulsantes que percorrem o espectro visÃ­vel.
- **Tiles Estruturais:**
    - `&`: ChÃ£o multicolorido seguindo o design modular High-Tech, mas com LEDs dinÃ¢micos de espectro completo.
    - `=`: Teto modular com bitmasking de conectividade e luzes neon.
    - `:`: Parede modular com painÃ©is de luz arco-Ã­ris.
    - `;`: Parede de conduÃ­te com animaÃ§Ã£o de fluxo de dados multicolorido.
- **Sincronia Visual:** A renderizaÃ§Ã£o Ã© otimizada para o sistema de `bakeBackground`, mas os componentes neon sÃ£o marcados como animados para garantir que o efeito multicolorido permaneÃ§a fluido durante o gameplay.

## 31. Setor: QuÃ¢ntico (Industrial-TecnolÃ³gico)
O Setor QuÃ¢ntico combina tecnologia de ponta com uma estÃ©tica industrial pesada, utilizando uma paleta de azul profundo, gunmetal e destaque em **Roxo Neon (#bf00ff)**.

### EstÃ©tica e RenderizaÃ§Ã£o:
- **Industrial QuÃ¢ntico:** O design foca em infraestrutura de processamento, painÃ©is de dados e conduÃ­tes de energia.
- **Tiles Estruturais:**
    - `'`: ChÃ£o QuÃ¢ntico de Dados. Base de metal pesado com marcaÃ§Ãµes tÃ©cnicas e sÃ­mbolos de dados pulsantes (0/1/X).
    - `"`: Parede de Circuito Industrial. Placas metÃ¡licas com rebites, trilhos de energia e painÃ©is de acesso modulares que variam proceduralmente.
    - `|`: Teto QuÃ¢ntico (Neural Grid). Rede de conduÃ­tes de energia roxa que se conectam via bitmask, formando uma malha tÃ©cnica funcional.
- **VariaÃ§Ã£o AtmosfÃ©rica:** O setor utiliza o caractere `.` (Abismo de VÃ¡cuo) como base espacial, apresentando nÃ©voas galÃ¡cticas pÃºrpuras.

## 32. Setor: Processamento (Processamento LogÃ­stico Cyan)
O Setor de Processamento (rebatizado como **Processamento LogÃ­stico**) utiliza uma estÃ©tica industrial de armazÃ©m e triagem de dados, replicando a estrutura do Setor LogÃ­stico, mas com uma paleta exclusiva de **Ciano (#00ffff)** e **Teal Escuro**, agora com uma ampla variedade de cores secundÃ¡rias para componentes.

### EstÃ©tica e RenderizaÃ§Ã£o:
- **Variedade CromÃ¡tica (Acentos TÃ©cnicos):** O setor quebra o monocromatismo atravÃ©s de componentes coloridos nas estantes:
    - **Ã‚mbar/Laranja:** Orbs de energia e componentes de processamento de alta prioridade.
    - **PÃºrpura/Vermelho:** Amplificadores de sinal e LEDs de alerta crÃ­ticos (nas estantes e suportes).
    - **Branco/Prata:** CarcaÃ§as metÃ¡licas de braÃ§os robÃ³ticos e placas de circuito.
- **Tiles Estruturais:**
    - `Î£`: Parede Industrial SÃ³lida (LogÃ­stica). Estrutura metÃ¡lica de alta resistÃªncia em tons de gunmetal, apresentando reforÃ§os verticais (ribbing) e bandas tÃ©cnicas horizontais. Serve como a base estrutural sÃ³lida para o setor de processamento.
    - `Ïƒ`: Piso Perfurado LogÃ­stico (Grating). Inspirado em grades metÃ¡licas industriais, apresenta slots de perfuraÃ§Ã£o verticais e uma "DelimitaÃ§Ã£o LogÃ­stica" automÃ¡tica (faixas amarelas #ffcc00) em todas as bordas que fazem contato com paredes ou vÃ¡cuo.
    - `Ï€`: Parede de Estantes Multicolor (Item-Heavy). Racks verticais que organizam itens tÃ©cnicos variados (orbs, sucata, cabeÃ§as robÃ³ticas, braÃ§os) com cores diversificadas. MantÃ©m os LEDs de diagnÃ³stico piscantes nos suportes verticais para sensaÃ§Ã£o de atividade.
    - `Î©`: Teto de Vigas Estruturais (EstÃ¡tico). Estrutura pesada de vigas com braÃ§adeiras, sobre uma grade tÃ©cnica de fundo. Diferente de outros setores, o teto Ã© visualmente fixo (sem pulsaÃ§Ã£o) para reforÃ§ar a rigidez estrutural.
- **Identidade Visual:** Alinhado ao Setor LogÃ­stico (`~`, `o`, `u`), mas refinado para uma estÃ©tica de "FÃ¡brica TÃ©cnica Viva", onde o ciano serve como a "energia vital" do ambiente, contrastada por componentes de hardware de mÃºltiplas cores.

## 33. LanÃ§adores de ProjÃ©teis Modulares (R)
O sistema de lanÃ§adores permite o disparo rÃ­tmico de projÃ©teis configurÃ¡veis para criar desafios de tempo e precisÃ£o.

### Arquitetura e ConfiguraÃ§Ã£o:
- **Classe Base Abstrata:** O sistema utiliza uma hierarquia de heranÃ§a onde a `LauncherFactory` instancia subclasses especÃ­ficas (Energy, Mechanical, Void) com base nos metadados.
- **Data-Driven (Links):** O comportamento de cada lanÃ§ador Ã© definido por chaves de link no formato `${x},${y}_launcher`:
    - `type`: Define o arquÃ©tipo visual e letalidade (`box`, `antimatter`, `energy`).
    - `fireRate`: Intervalo de disparo calculado em frames.
    - `speed`: Velocidade do projÃ©til (padrÃ£o: 4.0).
    - `initialDelay`: Atraso inicial em frames para padrÃµes rÃ­tmicos.
    - `autoRotate`: Define o comportamento de rotaÃ§Ã£o automÃ¡tica apÃ³s cada disparo (0: desligado, 4: eixos cardinais, 8: eixos cardinais + diagonais).
    - `rotateDir`: Sentido da rotaÃ§Ã£o (`CW` para HorÃ¡rio, `CCW` para Anti-horÃ¡rio).
- **TrajetÃ³ria de PrecisÃ£o:** Suporta rotaÃ§Ã£o suave em 360 graus, com disparo nativo em atÃ© 8 direÃ§Ãµes (45Â° de intervalo) quando em modo de autorrotaÃ§Ã£o.
- **Grade de Canais:** Integrado ao sistema global de canais (0-49).

### Arquetipos e Balanceamento:
- **ENERGY (Azul):** Turreta de titÃ¢nio escovado. Dano: `ENERGY_HIT` (4 quarters / 1 coraÃ§Ã£o). Visual: Plasma azul.
- **MECHANICAL (Ouro/Marrom):** Turreta de ferro pesado. Dano: `MECHANICAL_HIT` (2 quarters / 0.5 coraÃ§Ã£o). Visual: Caixa de PapelÃ£o (Cardboard Box).
- **VOID (Roxo):** Turreta de cromo negro. Dano: `VOID_HIT` (12 quarters / 3 coraÃ§Ãµes). Visual: NÃºcleo instÃ¡vel.

### RenderizaÃ§Ã£o e EstÃ©tica:
- **Design Circular de Placas MetÃ¡licas:** As turretas utilizam gradientes metÃ¡licos e texturas de placas sobrepostas (plates), fugindo do visual minimalista preto para uma estÃ©tica industrial pesada e rica em detalhes (rebites, pistÃµes cromados).
- **ColisÃ£o DinÃ¢mica:** LanÃ§adores sÃ£o tratados como entidades fÃ­sicas independentes da grade estÃ¡tica do mapa. Eles bloqueiam o movimento do jogador e de blocos (via `isTilePassable`), mas preservam o caractere de piso original abaixo deles no `game.map`, permitindo que o sistema de `bakeBackground` renderize o cenÃ¡rio corretamente sob a turreta.
- **Feedback de Carga Industrial:** A intensidade luminosa dos lanÃ§adores (status lights) aumenta linearmente de 0 a 100% conforme o progresso do disparo, sem pulsaÃ§Ã£o ou piscadas, garantindo um feedback claro e nÃ£o frenÃ©tico.
- **IntegraÃ§Ã£o com Editor:** O editor exibe o modelo real e a direÃ§Ã£o de disparo no painel lateral. Atua preferencialmente como um Overlay para manter a integridade do piso.

### ImplementaÃ§Ã£o de ReferÃªncia:
A fase **"CORREDOR DE CADÃŠNCIA"** serve como demonstraÃ§Ã£o tÃ©cnica, validando o balanceamento de letalidade e os 5 padrÃµes rÃ­tmicos.

## 34. Sistema de Inimigos AutÃ´nomos (âˆž)

O sistema de inimigos utiliza uma arquitetura modular baseada em estados (FSM) e contratos abstratos para permitir a expansÃ£o de arquÃ©tipos letais autÃ´nomos.

### Arquitetura e Contrato:
- **Classe Base Abstrata (`EnemyBase`):** Define o contrato rÃ­gido para todos os inimigos, gerenciando atributos protegidos (`_health`, `_speed`, `_damage`) e o loop de decisÃ£o via FSM.
- **Finite State Machine (FSM):** Os inimigos operam em estados discretos:
    - `PATROL`: MovimentaÃ§Ã£o padrÃ£o em rota.
    - `STUNNED`: Estado de choque apÃ³s receber dano ou colidir com o jogador.
- **Data-Driven Logic:** Inimigos sÃ£o carregados do mapa atravÃ©s do caractere especial `âˆž`. Seus parÃ¢metros sÃ£o armazenados na chave `${x},${y}_enemy`:
    - `speed`: Velocidade de deslocamento (padrÃ£o: 2.0).
    - `damage`: Dano causado ao jogador (padrÃ£o: 1 unidade).
    - `loopType`: Define o comportamento ao fim da rota (`LOOP` para circular, `PING_PONG` para retroceder).
    - `moveStyle`: Define o ritmo de movimento (`CONTINUOUS` para fluxo ininterrupto, `PAUSE` para paradas em cada waypoint).
    - `pauseDuration`: Tempo de espera em segundos quando `moveStyle` estÃ¡ em `PAUSE`.

### Editor de Caminhos (Path Editor):
O editor de fases implementa um modo especializado para traÃ§ar rotas de patrulha com feedback visual rico:
- **AtivaÃ§Ã£o:** Clique com o BotÃ£o do Meio (MB3) sobre um LogisticBot ou atravÃ©s do botÃ£o "ðŸ—ºï¸� EDITAR ROTA" no painel de propriedades.
- **Feedback Visual (Highlight):** O robÃ´ sendo editado recebe um destaque pulsante (`#ff0055`) e o rÃ³tulo "EDITANDO ROTA" para indicar o estado ativo.
- **Cursor Especial:** No modo de ediÃ§Ã£o, o cursor se transforma em um quadrado tracejado exibindo o Ã­ndice do prÃ³ximo waypoint (ex: `+3`), diferenciando a ediÃ§Ã£o de rota da pintura de tiles comum.
- **EdiÃ§Ã£o:** Cliques esquerdos no grid adicionam waypoints. Cliques direitos removem waypoints existentes. A rota Ã© visualizada em tempo real com splines conectadas e marcadores numerados.
- **PersistÃªncia e Undo:** A lista de waypoints Ã© salva na chave `${x},${y}_path` no sistema de `links`. O sistema de Undo/Redo do editor agora suporta a reversÃ£o completa de rotas e propriedades de inimigos.

### ArquÃ©tipo: LogisticBot (Amazon Kiva Style):
- **Design Visual:** Inspirado em robÃ´s de logÃ­stica industrial, com chassi laranja (`#e67e22`), anel de rotaÃ§Ã£o preto e LEDs ciano pulsantes. Exibe o sÃ­mbolo `âˆž` no topo.
- **Comportamento de Patrulha:** Realiza movimentaÃ§Ã£o fluÃ­da seguindo a lista de waypoints. Utiliza interpolaÃ§Ã£o linear para movimento e rotaÃ§Ã£o.
- **InteraÃ§Ã£o Letal:** O toque no robÃ´ causa dano e joga o inimigo no estado `STUNNED`, permitindo ao jogador escapar.

### IntegraÃ§Ã£o com Engine:
- **PersistÃªncia e ReversÃ£o:** Os estados dos inimigos sÃ£o totalmente integrados ao `GameState.captureLevelState` e `applyLevelState`, suportando desfazer (Undo) e o retrocesso quÃ¢ntico (Rewind/Reverse).
- **Camada de RenderizaÃ§Ã£o:** Inimigos sÃ£o renderizados na camada de **Overlay**, acima de esteiras e fios, mas abaixo de partÃ­culas emissivas e do HUD.
- **FÃ¡brica de Entidades:** A `EnemyFactory` centraliza a criaÃ§Ã£o, garantindo que as propriedades de patrulha sejam injetadas corretamente no tempo de execuÃ§Ã£o.

## 35. Interface DinÃ¢mica do Editor (Drag & Persistence)

Para melhorar o fluxo de trabalho e evitar a oclusÃ£o do grid durante a ediÃ§Ã£o detalhada, o editor implementa um sistema de janelas flutuantes interativas.

### Janelas Draggables:
- **Painel de Propriedades:** A janela flutuante de propriedades pode ser arrastada livremente clicando e segurando no cabeÃ§alho superior ("PROPRIEDADES"). O cursor muda para `move` no hover e `grabbing` durante o arraste.
- **Modais e Overlays:** Modais de aviso do sistema e a janela de seleÃ§Ã£o de ponto de spawn (Spawn Picker) tambÃ©m suportam movimentaÃ§Ã£o por arraste em seus cabeÃ§alhos.
- **ImplementaÃ§Ã£o TÃ©cnica:** Utiliza o sistema `makeDraggable` em `editor_ui.js`, que neutraliza o alinhamento Flex (centralizado) original e converte a janela para posicionamento `fixed` apÃ³s o primeiro arraste, garantindo fluidez e evitando saltos visuais.

### PersistÃªncia de Layout:
- **Trava de Auto-Posicionamento:** O editor normalmente tenta posicionar a janela de propriedades prÃ³ximo ao tile selecionado para agilizar o acesso. No entanto, se o usuÃ¡rio arrastar a janela manualmente, uma flag `hasBeenDragged` Ã© ativada no `dataset` do elemento.
- **Respeito ao UsuÃ¡rio:** Uma vez ativada a flag de arraste, o editor interrompe o auto-reposicionamento, mantendo a janela onde o usuÃ¡rio a deixou atÃ© que o painel seja fechado, permitindo uma organizaÃ§Ã£o personalizada da Ã¡rea de trabalho.

## 36. Sistema de Inimigos (LogisticBot & Patrulha)
- **Herança e Abstração**: Implementada classe  + " " + `EnemyBase` + " \ + (Abstrata) para garantir que todos os inimigos sigam o mesmo contrato de FSM e Renderização.
- **Patrulha Orientada a Waypoints**: O sistema de patrulha utiliza um array de coordenadas para transições suaves, com suporte a + \ + `LOOP` + "\ +  e  + \ + `PING_PONG` + "\ + .
- **Configuração Data-Driven**: Atributos como velocidade, dano, estilo de movimento (contínuo vs. pausas) e duração de pausa são carregados dinamicamente dos metadados da fase ( + \ + `links` + "\ + ).
- **Herança e Abstração**: Implementada classe `EnemyBase` (Abstrata) para garantir que todos os inimigos sigam o mesmo contrato de FSM e Renderização.
- **Patrulha Orientada a Waypoints**: O sistema de patrulha utiliza um array de coordenadas para transições suaves, com suporte a `LOOP` e `PING_PONG`.
- **Configuração Data-Driven**: Atributos como velocidade, dano, estilo de movimento (contínuo vs. pausas) e duração de pausa são carregados dinamicamente dos metadados da fase (`links`).
- **Editor de Rotas**: Integrado ao Editor de Níveis, permitindo criar rotas complexas via cliques (MB3) e visualização em tempo real com indicadores de ordem de waypoint.
- **Persistência de Dados**: As rotas e configurações são salvas em objetos aninhados no campo `links` do JSON da fase, garantindo retrocompatibilidade e facilidade de edição manual se necessário.

- **Orientação Dinâmica**: Os robôs agora rotacionam suavemente (lerp) para a direção do movimento, baseando-se no ângulo calculado entre os waypoints.
- **Limpeza Visual**: Removidos elementos textuais e o símbolo de infinito do robô para um design mais limpo e focado na silhueta (estilo Amazon Kiva).
- **Visualização de Rota (Dashed Lines)**: Linhas pontilhadas aprimoradas no editor para indicar trajetórias, com diferentes padrões de traço para destacar o caminho selecionado.
- **Design Flat Detail**: Estética puramente geométrica composta por formas sólidas e cores contrastantes. Detalhes mecânicos (rebites, painéis e dissipadores) são representados por variações de tom da paleta, sem uso de sombras, gradientes ou contornos (`stroke`).
- **Estados Comportamentais (LogisticBot)**:
    - `Modo Agressivo`: Olhos vermelhos pulsantes com brilho emissivo. Causa dano ao jogador no impacto.
    - `Modo Pacífico`: Olhos ciano estáveis. Não causa dano.
    - `Mecânica de Transporte`: Quando em modo pacífico, o bot atua como uma plataforma móvel. Se o jogador colidir com o bot, ele é "encaixado" no chassi e transportado ao longo da rota. Durante o transporte, o jogador não deixa rastros de óleo/pneu no chão. Para descer, o jogador deve usar a tecla de interação (Espaço/E), o que encerra o transporte mantendo-o no tile atual (o tempo de segurança de 40 frames evita que o robô o capture novamente de imediato).
