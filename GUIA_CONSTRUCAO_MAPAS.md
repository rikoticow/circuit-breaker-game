# 🏗️ Guia de Construção de Mapas - Circuit Breaker

Este guia define as regras e padrões para a criação de novos níveis e setores na engine.

## 📐 Estrutura do JSON do Nível
Todo nível é um objeto JavaScript exportado em `js/levels.js` contendo:
*   **Metadata:** `id`, `name`, `sector` (A, B, C, Logística, Óptica), `difficulty`.
*   **Camadas:**
    1.  `map`: Matriz de caracteres definindo a estrutura base (chão, abismos, paredes, fiação, spawns).
    2.  `overlays`: Elementos visuais superiores (portas, sombras, cabos suspensos, botões de piso).
*   **Links:** Metadados para conexões lógicas, transições e rótulos holográficos.

---

## 🔣 Dicionário de Símbolos

### 🏗️ Estrutura e Ambiente (`map`)
*   `#` : **Parede Padrão** (Sólida, bloqueia laser).
*   `W` : **Teto/Parede Superior** (Estética de profundidade).
*   ` ` (Espaço) : **Chão de Cobre** (Padrão do setor).
*   `a`, `b`, `c`, `t` : **Variantes de Chão** (Estético: Laboratório, Industrial, High-Tech, Óptico).
*   `A`, `I`, `Y` : **Estruturas de Setor** (Paredes decorativas específicas).
*   `f`, `i`, `k`, `j`, `h`, `m`, `q` : **Paredes Técnicas/Animadas** (Terminais, grades, painéis, energia ou óptica).
*   `G` : **Vidro Técnico** : Sólido para entidades, mas permeável para lasers.
*   `*` : **Abismo (Pit)** : Causa queda e morte (gatilha Reverse).
*   `@` : **Ponto de Início (Spawn)**.
*   `0` : **Zona Proibida** : Obstáculo sólido e absoluto (bloqueia movimento e lasers).
*   `Z` : **Núcleo Quebrado** : Obstáculo sólido com animação de fumaça.
*   `S` : **Sucata (Scrap)** : Moeda industrial coletável.
*   `o`, `,` : **Piso Logístico** : Metal e Tátil Antiderrapante.
*   `{` : **Estante de Caixas** : Parede industrial com pilhas de caixas amarelas (Setor Logística).
*   `~` : **Estante de Sucata** : Parede industrial com peças de robô, orbes e componentes (Setor Logística).
*   `}` : **Teto Industrial (Logística)**.
*   `&` : **Chão de Realidade** : Chão multicolorido com LEDs pulsantes (Setor Realidade).
*   `=` : **Teto de Realidade** : Teto modular com neon arco-íris (Setor Realidade).
*   `:` : **Parede de Realidade** : Parede modular com painéis multicoloridos.
*   `;` : **Conduíte de Realidade** : Parede com tubos de dados multicoloridos.
*   `π` : **Parede Setor de Processamento** : Servidores e conduítes ciano pulsantes.
*   `Ω` : **Teto Setor de Processamento** : Estrutura modular com processador central.
*   `Σ` : **Chão Setor de Processamento** : Placas de CPU com bus de dados.
*   `"` : **Parede Setor Quântico** : Metal pesado com circuitos roxos.
*   `!` : **Marcador de Rótulo** : Define a posição de um holograma de texto (configurado nos `links`).

### 🔌 Fiação e Energia (`map` ou `overlays`)
*   `B` : **Fonte Azul** (Energia Estável).
*   `X` : **Fonte Vermelha** (Energia Corrompida - Causa Dano).
*   **Cabos de Energia (Wires):**
    *   `H`, `V` : Retas (Horizontal/Vertical).
    *   `L`, `J`, `F`, `C` : Curvas/Cantos.
    *   `+` : Cruzamento de cabos.
    *   `u`, `d`, `l`, `r` : Terminações (Ponta de cabo Up/Down/Left/Right).
*   **Mecanismos de Carga:**
    *   `T` : **Núcleo Alvo** (Abre conexões quando recebe energia).
    *   `1`-`9` : **Núcleos de Carga** : Exigem X Amplificadores para validar.
    *   `Q` : **Catalisador** : Dispara laser em 4 direções quando alimentado.
    *   `K` : **Estação de Carregamento** : Checkpoint automático quando energizada.
    *   `$` : **Terminal de Loja** : Ponto de troca de sucata por upgrades.

### ⚙️ Mecanismos de Chão e Movimento (`overlays`)
*   `_` : **Placa de Pressão** : Ativa canal enquanto algo estiver sobre ela.
*   `(`, `)`, `[`, `]` : **Esteiras (Conveyors)** : Movem entidades na direção (Left, Right, Up, Down).
*   `n`, `s`, `e`, `w` : **Botões de Gravidade** : Alteram a gravidade da sala (North, South, East, West).
*   `D` / `U` : **Portas** : `D` é porta lógica, `U` é saída de nível.
*   `?` : **Piso Quântico** : Chão que aparece/desaparece via sinais lógicos.
*   `p` / `y` : **Cubo de Fase** : Blocos que alternam entre sólido e intangível (LUNAR / SOLAR).
*   `%` : **Alternador de Singularidade** : Alterna a fase Solar/Lunar ao ser interagido.
*   `M` : **Prisma de Refração** : Reflete lasers em 90 graus (direção ajustável via `dir`).
*   `E` : **Emissor Laser** : Fonte contínua de laser quando alimentado.
*   `O` : **Portal** : Teleporta entidades entre canais de mesma cor.

---

## 🛡️ Símbolos Disponíveis para Expansão
Ao criar novos sistemas mecânicos, utilize esta lista de caracteres livres para evitar conflitos com a engine:

*   **Letras Seguras:** `g` (minúsculo), `R` (maiúsculo - usar com cautela).
*   **Símbolos ASCII:** `-`, `/`, `\`, `'`, `` ` ``.
*   **Unicode Técnicos (UTF-8):** `∞`, `◊`, `∆`, `■`, `░`, `▒`, `▓`.

> [!IMPORTANT]
> Nunca utilize `u`, `d`, `l`, `r` ou `P`, pois são vitais para o sistema de fiação e botões.

---

## 💡 Regras de Ouro
1.  **Exploração:** Use portas `U` com `exitTo` para interconectar setores ao Hub.
2.  **Persistência:** O estado de alavancas e blocos é salvo automaticamente.
3.  **Dificuldade:** Introduza novas mecânicas em salas isoladas antes de combiná-las.
