# Relatório de Arquitetura: Projeto Circuit Breaker

Este documento descreve a estrutura técnica, mecânicas e sistemas do motor de jogo **Circuit Breaker**, um puzzle industrial construído com Vanilla JS e Canvas 2D.

## 1. Visão Geral
*   **Nome do Projeto:** Circuit Breaker
*   **Estética:** Industrial Retro (estilo Mega Man, NES/SNES), com foco em alta fidelidade mecânica e resposta visual ("Juice").
*   **Tecnologia:** HTML5 Canvas, Web Audio API, JavaScript (ESM).
*   **Objetivo:** Restaurar a energia de "Target Cores" conectando fontes de energia (Blue/Red Sources) através de Wires e Blocos condutores rotativos.

## 2. Sistemas Principais

### A. Mecânica de Energia (js/game.js - `updateEnergy`)
*   **Fluxo Unidirecional:** A energia flui de fontes para saídas seguindo a orientação dos componentes.
*   **Cores de Energia:**
    *   **Blue (Ocean):** Energia pura e validada que ativa sistemas.
    *   **Red:** Energia contaminada (de Red Sources) que bloqueia a ativação de núcleos.
    *   **Yellow:** Indica uma conexão inválida ou em curto (ex: entrando pelo lado errado de um bloco).
*   **Validadores de Saída:** O sistema verifica se há um componente válido no final do caminho antes de "energizar" visualmente a linha (sistema de Ocean blue).

### B. Gráficos e Renderização (js/graphics.js)
*   **Pipeline de Desenho:**
    1.  Chão e Map Tiles (Piso industrial com grade).
    2.  Wires (Linhas de transmissão com estados visualmente distintos).
    3.  Entidades (Blocos, Fontes, Núcleos, Portas).
    4.  Efeitos de Partículas e Trilhas.
    5.  HUD (Interface do usuário).
*   **Sistemas de Partículas:**
    *   **Sparks:** Faíscas elétricas quando núcleos são ativados ou blocos rotacionados.
    *   **Smoke:** Puffs de fumaça ao caminhar ou empurrar blocos.
    *   **Trail Segments:** Trilhas de pneus deixadas pelo robô que se degradam suavemente.
*   **Portas Pneumáticas:** Portas que possuem animações de abertura/fechamento suaves e efeitos de impacto físico (Slam).
    *   **Estado de Enguiço (Jammed):** Portas quebradas possuem uma animação persistente de falha mecânica, onde o anteparo oscila nervosamente tentando fechar. O visual inclui **rachaduras estruturais** no metal, faíscas elétricas **douradas/amarelas** concentradas saindo pelas bordas e ruídos de metal moendo, indicando o dano severo.
    *   **Botões (_):** Sensores de pressão no chão que ativam portas quando o robô ou um bloco está sobre eles.
*   **Filtro de Matéria (Barreira de Indução):**
    *   **Chão Quântico (`?`):** Piso especial de indução. Possui dois estados visuais claros:
        *   **Ativo (Barreira):** Cor roxa vibrante com grade digital pulsante e bits de energia em movimento. Bloqueia caixas (matéria bruta) mas permite a passagem do Robô.
        *   **Desativado (Energizado):** Cor **branca** com pulso leve e marcadores angulares. Indica que o sistema foi energizado/aberto, permitindo a livre circulação de caixas.
    *   **Botão Roxo (`P`):** Sensores de pressão dedicados que controlam o estado das barreiras de indução no mesmo canal (`channel`). Quando pressionados, desativam a barreira (mudando-a de roxo para branco).


### C. Main Loop (js/main.js)
*   **Física e Interpolação:** O robô e os blocos usam interpolação linear e molas (spring physics) para garantir que o movimento pareça fluido e "suculento", mesmo em um grid 32x32.
*   **Câmera Dinâmica:** Segue o jogador com um sistema de *Dead Zone* e *Soft Zone*, suavizando o acompanhamento e focando na direção do movimento.

### D. Audio Engine (js/audio.js)
*   **Sintetizador Web Audio:** Todos os sons são gerados procedimentalmente ou via buffers de ruído, garantindo zero latência e pegada de memória mínima.
*   **Trilha Sonora Adaptativa (Inspirada em Mega Man):**
    *   **Dual-Tempo:** 90 BPM no menu (ambiente/pesado) e 140 BPM no jogo (ação/rock).
    *   **Seamless Continuity:** A trilha nunca para durante a transição; ela apenas alterna a instrumentação, enquanto o *Hum* elétrico e o *Timer* do jogo são pausados para garantir foco total na navegação.
    *   **Unit Recovery:** Ao iniciar qualquer nível, a integridade do robô é restaurada (3 Vidas/Unidades), permitindo uma nova chance de resolver o puzzle sem penalidades acumuladas de fases anteriores.
*   **Efeitos Mecânicos Locais:** Inclui sons específicos para engrenagens de esteiras (`playConveyorGear`), abertura pneumática de portas (`playDoorOpen`), batidas de porta, colisões metálicas e **cliques táteis de botões** (`buttonClick`).
*   **Audio Quântico Especializado:**
    *   **Quantum Hum:** Zumbido elétrico que diferencia interações. Emite um tom leve e agudo (800Hz) ao caminhar sobre o chão quântico, e um tom **grave e denso (400Hz)** ao tentar empurrar blocos contra a barreira ativa, reforçando a percepção de massa e resistência.
    *   **Toggle Rise/Fall:** Efeitos de "rise up" (ascendente) ao ativar a barreira e "descend" (queda de frequência) ao desativá-la, simulando o carregamento e desligamento de grandes bobinas de indução industrial.
*   **Ilusão de Aceleração (Escala de Shepard):** As esteiras utilizam um sistema de Escala de Shepard (`updateConveyorShepard`), que cria uma ilusão auditiva de tom ascendente infinito enquanto o robô ou blocos estão em movimento. Isso intensifica a sensação de velocidade e perigo industrial contínuo, gerado procedimentalmente via Web Audio API.

## 3. Estrutura de Arquivos
```text
/
├── index.html          # Ponto de entrada e layout básico
├── style.css           # Estilização CRT e Industrial
├── main.js             # Orquestrador do loop e entrada
├── js/
│   ├── game.js         # Lógica de estado e energia
│   ├── graphics.js     # Motor de renderização Canvas
│   ├── audio.js        # Motor de som adaptativo
│   ├── levels.js       # Definição dos mapas e puzzles
│   ├── editor.js       # Interface do Editor de Níveis
│   ├── levelSelector.js# Menu de seleção de fases
│   └── resultScreen.js # Tela de estatísticas pós-fase
└── relatorio_arquitetura.md # Este documento
```

---
*Este relatório deve ser atualizado sempre que uma nova mecânica core ou alteração estrutural for implementada.*
