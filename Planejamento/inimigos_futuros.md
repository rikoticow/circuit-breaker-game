# 🚀 Planejamento de Novos Inimigos: Circuit Breaker

Este documento detalha a visão técnica e mecânica para as próximas unidades inimigas a serem implementadas na engine. O foco é em comportamentos táticos que forcem o jogador a alternar entre stealth, parkour e combate estratégico.

---

## 1. Wall Turret (🧱)
**Sentinela de Parede**

*   **TIPO:** Estático / Embutido
*   **SÍMBOLO:** `▓`
*   **CAMADA:** Embedded na wall (Parede)
*   **VISUAL:**
    *   Semicírculo metálico saliente da parede.
    *   Canhão retrátil com 3 estados visuais: *Hidden* (Escondido), *Recharging* (Recarregando), *Firing* (Atirando).
    *   LED de status: Âmbar (Ready), Vermelho (Firing).
    *   Base hexagonal industrial.
*   **COMPORTAMENTO (FSM):**
    *   `IDLE` → `LOCKED` → `FIRE` → `COOLDOWN` → `IDLE`
    *   **Lock-on:** 1 segundo de mira (gira fisicamente em direção ao jogador).
    *   **Fire:** Dispara 1 projétil rápido na direção travada.
    *   **Cooldown:** 2 segundos de inatividade antes de buscar novo alvo.
    *   **Alcance (Range):** 6 tiles.
*   **DANO:** 1 coração (4 quarters).

---

## 2. Repair Unit (🔧)
**Unidade de Manutenção Corrompida**

*   **TIPO:** Mobile - Perseguição Lenta
*   **SÍMBOLO:** `∆`
*   **CAMADA:** Dynamic Entity (Mesma camada do LogisticBot)
*   **VISUAL:**
    *   Robô atarracado com braços articulados (+/- 45°).
    *   Óculos de proteção amarelos.
    *   Chave de fenda ou gaveta aberta na mão dominante.
    *   **Paleta:** Azul técnico (#3498db) com detalhes em #2980b9.
*   **COMPORTAMENTO (FSM):**
    *   `PATROL` → `LOCKED` → `APPROACH` → `REPAIR` → `COOLDOWN` → `PATROL`
    *   **PATROL:** Segue waypoints definidos (mesmo sistema do LogisticBot).
    *   **LOCKED:** Detecta o jogador em range de 4 tiles, para e executa um "scan" visual.
    *   **APPROACH:** Perseguição lenta (Velocidade: 0.3) após o lock.
    *   **REPAIR:** O toque é o ataque. "Consertar" o jogador causa curto-circuito.
    *   **COOLDOWN:** Fica parado por 2s após o contato.
    *   **Reset:** Retorna à patrulha se o jogador se afastar mais de 5 tiles.
*   **DANO:** 0.5 corações (2 quarters).
*   **VOZ:** "Anomalia detectada" / "Iniciando correção" / "Anomalia eliminada".
*   **VFX:** Scan verde → Faíscas no ataque → Piscar azul no cooldown.

---

## 3. Corruption Sweeper (🧹)
**Aspirador de Integridade**

*   **TIPO:** Mobile - Pattern / Charge
*   **SÍMBOLO:** `■`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Corpo cilíndrico grande (estilo aspirador industrial pesado).
    *   Filtros superiores pulsando em roxo (#9b59b6).
    *   Escovas rotativas animadas na base.
    *   Mangueira de sucção articulada na traseira.
*   **COMPORTAMENTO (FSM):**
    *   `PATROL` → `SWEEP` → `CHARGE` → `DRAIN` → `WEAK` → `PATROL`
    *   **PATROL:** Padrão de movimento em zigzag ou espiral pré-definido.
    *   **SWEEP:** Movimento normal (Velocidade: 1.0).
    *   **CHARGE:** Ao detectar o jogador em range de 3 tiles, acelera subitamente (Velocidade: 3.0).
    *   **DRAIN:** Colisão causa dano contínuo (drenagem de energia).
    *   **WEAK:** Após drenar com sucesso ou errar o charge, fica vulnerável por 3s (Parado).
*   **DANO:** 0.25 corações por tick (Mecânica: Drena 1 coração completo ao longo de 60 frames).
*   **VFX:** Rastro roxo ao carregar → Visual "desligado"/piscando no estado Weak.

---

## 4. Data Courier (📦)
**Mensageiro Reversivo**

*   **TIPO:** Mobile - Fuga / Emboscada
*   **SÍMBOLO:** `░`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Robô pequeno, magro e extremamente ágil.
    *   Mochila de dados com brilho ciano.
    *   Dois olhos de LED ciano.
    *   Pernas articuladas preparadas para corrida.
    *   **Paleta:** Ciano (#00d4aa) com detalhes em #00ffcc.
*   **COMPORTAMENTO (FSM):**
    *   `DELIVER` → `SNEAK` → `DETECT` → `EVADE` → `ATTACK` → `COOLDOWN` → `DELIVER`
    *   **DELIVER:** Move-se entre waypoints muito rápido (Velocidade: 2.0).
    *   **EVADE:** Se o jogador olhar para ele ou tentar se aproximar de frente, ele FOGE (corre para longe).
    *   **ATTACK:** Só ataca se o jogador estiver de costas (`player.backTurned`). Ele avança rapidamente para um golpe rápido.
    *   **IMPORTANTE:** Nunca ataca de frente. É um inimigo de flanqueamento.
*   **DANO:** 0.5 corações (2 quarters).
*   **MECÂNICA:** "Ataque por trás" - o dano só é validado se a direção de aproximação for a mesma que o jogador está olhando.
*   **VOZ:** "Entrega prioritária!" / "Rota comprometida!".

---

## 5. Brick Stack (🧱)
**Operário de Artilharia / Construtor**

*   **TIPO:** Mobile - Artillery / Builder
*   **SÍMBOLO:** `▒`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Robô operário com um guindaste/braço articulado sobre a cabeça.
    *   Capacete de obra amarelo (#f1c40f).
    *   Braço mecânico funcional para carregar e lançar blocos.
    *   **Paleta:** Laranja industrial (#f39c12).
*   **COMPORTAMENTO (FSM):**
    *   `PATROL` → `DETECT` → `THROW_ATTACK` → `THROW_BARRIER` → `COOLDOWN` → `PATROL`
    *   **THROW_ATTACK:** Lança um bloco diretamente no jogador (Linha reta).
        *   *Acerto:* Dano + Bloco se quebra.
        *   *Erro:* O bloco cai no chão e vira um obstáculo físico.
    *   **THROW_BARRIER:** Lança blocos em arco (parabólico) para cair ATRÁS do jogador, criando barreiras que bloqueiam a fuga ou o avanço.
*   **MECÂNICA DE BLOCO:**
    *   Os blocos criados são obstáculos (`blocksPlayer: true`).
    *   Não conduzem lasers (Diferente dos prismas/amplificadores).
    *   São permanentes até o reset da fase ou destruição (se implementado).
*   **FUNÇÃO TÁTICA:** Cria zonas de negação. O jogador é forçado a contornar as barreiras enquanto desvia dos ataques diretos.
*   **DANO:** 1 coração (Impacto direto).
*   **VOZ:** "Alvo identificado!" / "Lançando!" / "Barreira erguida!".

---

## 6. Weld Bot (🔥)
**Soldador de Combate**

*   **TIPO:** Mobile - Artillery / Flamer
*   **SÍMBOLO:** `£`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Robô soldador robusto com máscara de proteção pesada.
    *   Tocha de solda na mão (brilhando em laranja intenso).
    *   Mangueira de gás visível conectada às costas.
    *   **Paleta:** Cinza metálico (#7f8c8d) com detalhes em #e74c3c.
*   **COMPORTAMENTO (FSM):**
    *   `PATROL` → `DETECT` → `AIM` → `WELD` → `COOLDOWN` → `PATROL`
    *   **AIM:** Para e gira a tocha em direção ao jogador por 0.5s.
    *   **WELD:** Dispara um jato de fogo/faíscas em cone (3 tiles de comprimento) por 1s.
*   **MECÂNICA:**
    *   Dano contínuo por frame (0.25 hearts per tick).
    *   O jato de faíscas atravessa obstáculos baixos, mas é bloqueado por paredes.
*   **VOZ:** "Iniciando soldagem!" / "Faísca solta!" / "Área assegurada!".

---

## 7. Cable Snake (🐍)
**Capturador de Cabos**

*   **TIPO:** Mobile - Grappler
*   **SÍMBOLO:** `§`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Corpo cilíndrico composto por cabos elétricos trançados.
    *   Cabeça com sensores/olhos vermelhos.
    *   Cauda terminando em conectores/plugs industriais.
    *   **Paleta:** Preto fosco (#1a1a1a) com faíscas vermelhas.
*   **COMPORTAMENTO (FSM):**
    *   `PATROL` → `STRETCH` → `GRAB` → `WRAP` → `COOLDOWN` → `PATROL`
    *   **STRETCH:** Estende o corpo em direção ao jogador.
    *   **GRAB:** Se em range (2 tiles), lança um cabo "chicote" para agarrar.
    *   **WRAP:** Imobiliza o jogador por 2s enquanto causa dano contínuo.
*   **MECÂNICA:**
    *   O jogador fica totalmente imobilizado durante o Wrap.
    *   Não pode se soltar a menos que o inimigo seja derrotado ou o tempo acabe.
*   **VOZ:** "Cable detected!" / "Embrulhando!" / "Conexão estabelecida!".

---

## 8. Spark Jumper (⚡)
**Condutor Saltador**

*   **TIPO:** Mobile - Jumper / Conductor
*   **SÍMBOLO:** `®`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Robô pequeno e leve com molas visíveis nas pernas.
    *   Corpo com símbolo de raio estilizado.
    *   Pés condutores que brilham em azul elétrico.
    *   **Paleta:** Amarelo industrial (#f1c40f) com detalhes em ciano.
*   **COMPORTAMENTO (FSM):**
    *   `PATROL` → `CHARGE` → `JUMP` → `LAND` → `COOLDOWN` → `PATROL`
    *   **MECÂNICA DE TERRENO:** Só pode se mover ou saltar sobre tiles que contenham fios (`wire`). Se não houver fio adjacente, ele fica parado em espera.
    *   **JUMP:** Salta para uma posição aleatória com fio em um raio de 3 a 5 tiles.
    *   **LAND:** Ao pousar, libera uma descarga elétrica em área (Raio 1).
*   **DANO:** 0.5 hearts na descarga de pouso.
*   **VOZ:** "Carregando!" / "Saltando!" / "Descarga!".

---

## 9. Glitch Walker (👻)
**Entidade Instável**

*   **TIPO:** Mobile - Teleport
*   **SÍMBOLO:** `ʬ`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Robô com aparência corrupta e cristalina.
    *   Efeito de glitch visual constante (jitter/tremedeira).
    *   Partículas digitais/quadradas orbitando o corpo.
    *   **Paleta:** Roxo vibrante (#9b59b6) com ciano (#00ffcc).
*   **COMPORTAMENTO (FSM):**
    *   `PATROL` → `FADE` → `TELEPORT` → `FADE_IN` → `ATTACK` → `COOLDOWN` → `PATROL`
    *   **TELEPORT:** Desaparece e reaparece em uma posição aleatória (Raio 3-6 tiles).
    *   **REGRAS:** Nunca reaparece diretamente no campo de visão atual do jogador (tenta aparecer em ângulos cegos).
    *   **ATTACK:** Executa um ataque rápido imediatamente após o reaparecimento.
*   **DANO:** 0.5 hearts por ataque.
*   **VOZ:** "Glitch!" / "Teleportando!" / "Reaparecendo!".

---

## 10. Mine Layer (💣)
**Minador de Cerco**

*   **TIPO:** Mobile - Layer / Phaser (Atravessa paredes)
*   **SÍMBOLO:** `ϖ`
*   **CAMADA:** Dynamic Entity
*   **VISUAL:**
    *   Robô miniatura com sistema de esteiras.
    *   Depósito de minas volumoso nas costas.
    *   LED indicador: Verde (Pronto), Vermelho (Armando).
    *   **Paleta:** Verde floresta (#27ae60) com detalhes em vermelho.
*   **COMPORTAMENTO (FSM):**
    *   `PHASE_IN` → `PATROL` → `PHASE_OUT`
    *   **PHASE_IN/OUT:** Surge de uma parede aleatória, deixa minas e mergulha de volta na parede após 4s.
    *   **MINAS:** Deixa minas de proximidade no chão a cada 2 tiles de movimento.
    *   **MECÂNICA DE MINA:** Arma após 1s. Explode se o jogador entrar em distância < 0.5 tile.
*   **DANO:** 1 coração (Explosão).
*   **VOZ:** "Mina armada!" / "Retraindo!" / "Cerco completo!".

---

> [!NOTE]
> Todos os novos inimigos devem herdar da classe `EnemyBase` para garantir compatibilidade com o sistema de `takeDamage` e `FSM` já estabelecido para o `LogisticBot`.
