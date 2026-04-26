# Relatório de Arquitetura - CIRCUIT BREAKER

Este documento descreve a estrutura técnica e os sistemas fundamentais da engine de Circuit Breaker, um jogo de puzzle industrial baseado em lógica de circuitos e manipulação de energia.

## 1. Visão Geral do Sistema
A engine foi construída utilizando Vanilla JavaScript (ES6+), Canvas 2D API para renderização e Web Audio API para som procedural. O foco é em um loop de jogo determinístico baseado em "ticks" de estado de jogo e propagação de energia.

## 2. Core Engine (js/game.js)
O coração do jogo reside na classe `GameState`.

- **Gerenciamento de Estado**: Controla se o jogo está em `MENU`, `PLAYING`, `GAMEOVER`, `WINNING` ou `RESULT`.
- **Sistema de Propagação de Energia (Amperagem)**: 
    - Implementa uma lógica de rastreamento de fluxo recursivo (`trace`).
    - **Cálculo de Amps**: Cada bloco amplificador (`>`, `<`, `^`, `v`) soma +1 Amp ao fluxo.
    - **Contaminação**: Fontes vermelhas (`X`) infectam todo o circuito conectado, impedindo a vitória.
    - **Relés de Energia**: Núcleos satisfeitos se tornam novas fontes, permitindo circuitos em cascata.
- **Mecânica de Movimento**:
    - Movimentação baseada em grid com interpolação visual (`visualX`, `visualY`).
    - Sistema de Undo/Redo persistente (`historyStack`).
    - Consumo de energia por movimento/rotação.
- **Sistema de Colisão**:
    - Suporte a empurrar cadeias de blocos.
    - Interação com portas (`D`), botões (`_`, `P`), esteiras (`(`, `)`, `[`, `]`) e chãos quânticos (`?`).

## 3. Sistema Gráfico (js/graphics.js)
Objeto `Graphics` responsável por toda a parte visual.

- **Renderização em Camadas**: Chão -> Wires/Trails -> Entidades -> Overlays (Paredes/Teto) -> Partículas.
- **Estética Industrial/CRT**:
    - Efeito de scanlines e vinheta via Canvas.
    - Filtro de glitch/flicker para estados de erro ou reversão.
    - Partículas procedurais para fumaça, faíscas e destroços.
- **Animações Dinâmicas**:
    - Interpolação suave para movimento de robô e blocos.
    - Rotação visual com suavização (Lerp de ângulos).
    - Raios/Lightning para indicar fluxo de energia entre blocos.
    - Transições de porta cinemáticas entre níveis.

## 4. Áudio Procedural (js/audio.js)
Sistema `AudioSys` utilizando Web Audio API.

- **Trilha Sonora Adaptativa (Inspirada em Megaman)**:
    - Música baseada em sequenciador de tempo (`tempo`, `step`).
    - Dual-BPM: 90 BPM no menu (atmosfera pesada) e 140 BPM no jogo (ação).
    - Instrumentação dinâmica: Chugs de guitarra/synth que aumentam de complexidade conforme o progresso no nível.
- **Efeitos de Som (SFX)**:
    - Sons gerados por osciladores: movimentos metálicos, rotações hidráulicas, explosões e ativação de núcleos.

## 5. Level Selector (js/levelSelector.js)
Menu de seleção estilo CRT inspirado em terminais antigos.

- **Arquitetura de Capítulos**: Divisão do jogo em Setores Industriais.
- **Navegação Não-Linear**: Mapa de nós conectados por trilhas de circuito.
- **Persistência**: Integração com `localStorage` para salvar progresso, estrelas e estatísticas por nível.

## 6. Editor de Níveis (editor.html + js/editor.js)
Ferramenta integrada para construção de conteúdo.

- **Backend (editor_server.js)**: Servidor Node.js simples para salvar alterações diretamente no arquivo `js/levels.js` e criar backups.
- **Modo de Teste**: Permite testar o nível instantaneamente dentro do editor sem perder o estado da edição.
- **Ferramentas de Edição**: Pincel, Retângulo, Linha, Seleção/Copiar/Colar e reordenamento de níveis via Drag & Drop.

## 7. Formato de Dados (js/levels.js)
Os níveis são definidos como objetos contendo:
- `map`: Grid base (Paredes, chão, jogador).
- `blocks`: Localização e direção inicial dos amplificadores.
- `overlays`: Fios e conexões estáticas.
- `links`: Mapeamento lógico entre botões e portas.
- `time` (Battery) e `timer` (Global): Limites de recursos do jogador.

---
*Este relatório deve ser mantido atualizado a cada mudança estrutural na engine.*
