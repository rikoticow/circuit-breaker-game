# Relatrio de Arquitetura - CIRCUIT BREAKER

Este documento descreve a estrutura base da engine do jogo e as diretrizes de implementao para manter a pureza do design industrial e performance.

## 1. Sistema de Lasers (Mecnica Central)
Os lasers so processados em duas fases:
- **Lgica (game.js):** O mtodo `updateEmitters` traa o percurso do laser recursivamente. Ele identifica colises e categoriza o `targetNode` (WALL, DOOR, PLAYER, PRISM, CATALYST, EMITTER, BLOCK).
- **Renderizao (lasers.js):** O mtodo `drawLaser` utiliza os dados do percurso para desenhar o feixe.

### Diretriz de Minimalismo Visual:
- **Efeito Vegas:** Removido. O laser deve ser um feixe slido com borda roxa e ncleo branco.
- **Transparncia e Mixagem:** Utiliza `lighter` (Add) e opacidade reduzida (~0.5 - 0.8).
- **Animao de Linha (Novo):** Implementada "Instabilidade Vibracional Suave". A linha possui um jitter (vibrao) senoidal muito sutil (0.3px) e pulsa levemente a largura, criando um visual de energia contida e estvel sem distrair o jogador.
- **Glow:** O brilho externo (Outer Glow) foi eliminado para manter a clareza industrial.

## 2. Sistema de Partculas (Graphics.spawnParticle)
O sistema de partculas  centralizado em `particles.js`. 

### Regras de Emisso (Whitelist):
Para evitar rudo visual, partculas de impacto de laser agora seguem uma **Whitelist**:
- **Permitido:** Apenas impactos contra Paredes (`WALL`), Portas (`DOOR`) e o Jogador (`PLAYER`).
- **Proibido:** Prismas, Catalisadores, Emissores e blocos tcnicos no devem emitir partculas ao serem atingidos pelo laser.
- **Movimentao:** Objetos do tipo `PRISM` no emitem fascas ao serem movidos ou lanados.

## 3. Componentes ticos
- **Prismas:** Refletem lasers em 90 graus. No emitem partculas (nem no impacto, nem ao rotar).
- **Catalisadores:** Ativam sistemas eltricos ao serem energizados. Feedback visual puramente geomtrico.

## 4. Performance
- O uso de `context.save()` e `restore()` deve ser minimizado dentro de loops.
- Partculas no utilizam gradientes radiais ou `shadowBlur`.
- A renderizao de lasers  baseada em caminhos de linhas simples (`lineTo`).
