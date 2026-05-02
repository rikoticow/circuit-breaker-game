# Relatório de Arquitetura - CIRCUIT BREAKER

Este documento descreve a estrutura base da engine do jogo e as diretrizes de implementação para manter a pureza do design industrial e performance.

## 1. Sistema de Lasers (Mecânica Central)
Os lasers são processados em duas fases:
- **Lógica (game.js):** O método `updateEmitters` traça o percurso do laser recursivamente. Ele identifica colisões e categoriza o `targetNode` (WALL, DOOR, PLAYER, PRISM, CATALYST, EMITTER, BLOCK).
- **Renderização (lasers.js):** O método `drawLaser` utiliza os dados do percurso para desenhar o feixe.

### Diretriz de Minimalismo Visual:
- **Design do Feixe:** Feixe sólido com borda roxa e núcleo branco. Sem brilho externo (Outer Glow).
- **Instabilidade Vibracional:** O laser possui um jitter (vibração) senoidal de 0.3px e pulsação de largura, criando um visual de energia contida e estável.
- **Mixagem:** Utiliza `lighter` (Add) para sobreposição de feixes.

## 2. Sistema de Partículas e Feedback Visual
- **Whitelist de Emissão:** Partículas de impacto são restritas a `WALL`, `DOOR` e `PLAYER`. Prismas e componentes técnicos não emitem partículas de impacto ou rotação.
- **Estética Industrial:** Partículas não utilizam gradientes ou sombras, mantendo o visual pixel-perfect.

## 3. Infraestrutura de Áudio (audio/core.js)
- **Master Control:** Utiliza um `GainNode` mestre (`musicGain`) que normaliza o volume global em 50% para garantir clareza sonora.
- **Síntese Procedural:** Instrumentos e efeitos (como o zumbido dos emissores) são gerados em tempo real, permitindo controle dinâmico de volume e pitch sem carregar assets pesados.
- **Mapeamento por Setor:** O sistema de música é mapeado por capítulos (setores), permitindo transições fluidas entre áreas narrativas.

## 4. Sistema de Diálogos e Rich Text (dialogue.js)
O sistema utiliza `Tippy.js` para renderização de HUDs holográficos.

### Configuração e Comportamento:
- **Posicionamento Dinâmico (`follow`):** O HUD persegue o robô em tempo real com **Dirty Checking** (recalcula apenas se o movimento for > 0.1px).
- **Rich Text Multi-Parâmetro:** Suporta tags complexas como `[arcane:intensidade:cor1:cor2]` via parser colon-aware.
- **Prioridade de Cor:** Efeitos como `arcane` e `highlight` (que requer texto preto) sobrepõem a tag estática `[color]`.
- **Efeitos Persistentes:** O efeito `crypt` utiliza um loop global probabilístico para scrambling de texto sem impacto no reflow do DOM.
- **Exceção de Sincronia (Melt):** O efeito `melt` utiliza delays aleatórios e uma sequência de falha (blink de alta frequência) para um visual orgânico de colapso.

## 5. Sistemas de Hazards e Triggers
- **Industrial Blackout:** Sistema de iluminação baseada em triggers de zona (⚡) que controlam a visibilidade do setor.
- **Security Alerts:** Sistema de detecção sonora e visual que reage a invasões ou falhas de sistema.
- **Solar Vortex (Portais):** Sistema de canais de entrelaçamento quântico com sincronia de cores baseada em canais numéricos.
- **Pits (Abismos):** Lógica de queda com animação de overshoot restaurada, garantindo movimento fluído sem pixel-snapping.

## 6. Diretrizes de Performance
- **Minimização de Context:** Evitar `save()` e `restore()` excessivos.
- **Geometria Simples:** Renderização baseada em caminhos `lineTo` e formas geométricas puras.
- **Carga de Assets:** Prioridade para geração procedural sobre arquivos externos.
