# Guia de Construção de Mapas: CIRCUIT BREAKER

Este guia descreve como criar e editar níveis para o jogo no arquivo `js/levels.js`.

## 📐 Estrutura do Grid
*   **Tamanho Padrão:** 20 colunas x 15 linhas.
*   **Coordenadas:** (0,0) é o canto superior esquerdo.

## 🔣 Dicionário de Símbolos

### Estrutura e Jogador
*   `#` : **Parede** (Obstáculo intransponível).
*   ` ` : **Chão** (Espaço vazio para caminhar e empurrar blocos).
*   `@` : **Ponto de Início** do Jogador (Robô).

### ⚡ Fontes de Energia (Emitem em todas as direções)
*   `B` : **Fonte Azul** (Energia Limpa).
*   `X` : **Fonte Vermelha** (Energia Corrompida - Causa Game Over se chegar ao núcleo).

### 🎯 Núcleos Alvo (Objetivos)
*   `T` : **Núcleo Verde Standard** (Exige 1 Amp para abrir).
*   `1` a `9` : **Núcleo Verde com Requisito** (O número indica quantos Amplificadores a energia deve atravessar antes de chegar nele).

### 🔌 Fios e Conexões (Caminhos Fixos)
*   `H` : Cano Horizontal (━)
*   `V` : Cano Vertical (┃)
*   `+` : Cruzamento (╋)
*   `L` : Curva Superior Direita (┗)
*   `J` : Curva Superior Esquerda (┛)
*   `C` : Curva Inferior Esquerda (┓)
*   `F` : Curva Inferior Direita (┏)

**Junções em T:**
*   `u` : Direita / Esquerda / Cima (┻)
*   `d` : Direita / Esquerda / Baixo (┳)
*   `l` : Cima / Baixo / Esquerda (┫)
*   `r` : Cima / Baixo / Direita (┣)

### 📦 Blocos Amplificadores (Empurráveis e Rotacionáveis)
Os blocos aumentam a carga da energia em +1 Amp.
*   `>` : Apontando para a Direita
*   `<` : Apontando para a Esquerda
*   `^` : Apontando para Cima
*   `v` : Apontando para Baixo

---

## ⚙️ Mecânicas Importantes

### 1. Sistema de Relé (Relay)
Quando um núcleo (T ou 1-9) recebe a carga necessária, ele se torna uma **Fonte de Energia** para os fios conectados a ele. 
*   **Válvula Unidirecional:** Um núcleo nunca envia energia de volta pelo caminho de onde ela veio. Isso evita loops infinitos.

### 2. Lógica de Amperagem (Amps)
*   A energia começa com **0 Amps**.
*   Cada **Bloco Amplificador** pelo qual a energia passa soma **+1 Amp** ao fluxo.
*   Os Núcleos Alvo só abrem se a carga recebida for **maior ou igual** ao seu número (ex: Núcleo `3` precisa de um fluxo que passou por pelo menos 3 blocos).

### 3. Contaminação Vermelha
*   Se energia de uma **Fonte Vermelha (X)** atingir qualquer parte de um circuito conectado a um núcleo, o circuito fica "Contaminado".
*   Núcleos contaminados não abrem e bloqueiam a vitória.

### 4. Cores de Feedback (Triângulos e Fios)
*   **Branco:** Inativo.
*   **Amarelo:** Alerta de Contramão (Energia tentando entrar pela frente do bloco).
*   **Azul Oceano:** Energizado (Fluxo ativo, mas ainda não completou o objetivo).
*   **Ciano Vibrante:** Validado! Circuito completo e objetivo atingido.

### 5. Consumo de Energia (Power)
*   O robô tem uma barra de **Power** na parte inferior.
*   Cada **movimento** ou **rotação** consome exatamente **1 unidade** de Power.
*   Se o Power chegar a zero, o robô explode.

### 6. Limite de Tempo
*   Existe um cronômetro regressivo de **60 segundos** global.
*   Você deve vencer o nível antes que o tempo acabe, independente de quanto Power ainda tenha.

---

## 💡 Dicas de Design
1.  **Gargalos:** Use Junções em T para criar decisões onde o jogador precisa escolher qual caminho energizar primeiro.
2.  **Relés em Cadeia:** Crie fases onde um núcleo abre caminho para energizar o próximo, como uma reação em cadeia.
3.  **Contaminação Tática:** Use fontes vermelhas perto de caminhos óbvios para forçar o jogador a criar rotas mais complexas.
