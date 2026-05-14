# Bestiário de Inimigos - CIRCUIT BREAKER

Este documento detalha as unidades robóticas hostis e neutras encontradas nos diversos setores da instalação. Cada unidade possui comportamentos regidos pelo sistema de FSM (Finite State Machine) da engine.

---

## 1. LogisticBot (∞)
**Classificação:** Unidade de Transporte Industrial
**Estética:** Chassi laranja (#e67e22), design atarracado (estilo Amazon Kiva).

- **Lore:** Antigamente, eram o coração da logística, realizando entregas para todo o ecossistema da empresa. Com a automação total e o colapso dos sistemas de controle, muitos perderam seu propósito original, tornando-se errantes e corrompidos pela falta de diretrizes.
- **Comportamento:** Segue rotas de patrulha pré-definidas (Waypoints).
- **Modos de Operação:**
    - **Pacífico (LED Ciano):** Atua como uma plataforma de transporte. O jogador pode subir no robô e ser levado ao longo da rota.
    - **Hostil (LED Vermelho):** Causa dano de contato e repele o jogador.
- **Vulnerabilidade:** Pode ser atordoado por um Dash-Attack.

## 2. Unidade de Reparo (∆)
**Classificação:** Sentinela de Manutenção Pesada
**Estética:** Azul técnico (#3498db), óculos de proteção amarelos e braços de ferramenta.

- **Lore:** Antigas unidades de suporte pesado que se tornaram obsoletas após o lançamento das **Estações de Manutenção Automatizadas** (as estações de recarga usadas pelo jogador). Sentindo-se "descartadas" pela evolução tecnológica, elas levaram sua diretriz original de conserto ao extremo. Agora, veem qualquer presença externa como uma "anomalia de hardware" que precisa de um reparo forçado e agressivo para ser integrada ao sistema.
- **Comportamento:** Persegue o intruso de forma metódica. Move-se estritamente em grid cardinal (4 direções).
- **Ataque:** "Short-Circuit". Ao se aproximar, tenta realizar um reparo forçado no jogador, causando dano elétrico.
- **Telegrafia:** Emite um strobe vermelho agressivo ao travar a mira (Lock-on) no jogador.
- **Peculiaridade:** Possui uma pausa mecânica de 15 frames entre cada movimento de tile para simular o peso hidráulico.

## 3. Data Courier (░)
**Classificação:** Mensageiro Tático de Alta Velocidade
**Estética:** Shard Runner ciano (#00d4aa), mochila de dados neon e visor de scanner.

- **Lore:** Atuavam como os "pendrives vivos" da corporação, transportando volumes massivos de informações sigilosas entre os setores. Programados para fugir de qualquer pessoal não autorizado, eles utilizam o sistema **Fragment Purge** para ejetar estilhaços de dados corrompidos. Curiosamente, esses estilhaços são inofensivos para seres orgânicos, mas causam erros críticos e danos físicos imediatos em hardware robótico.
- **Comportamento (Evasivo):** Extremamente ágil. Ele foge do jogador para manter uma distância tática (4-8 tiles), preservando a integridade dos seus dados.
- **Ataque:** **Fragment Purge**. Dispara estilhaços de dados corrompidos (Data Shards) à distância (Dano: 0.5 Coração). Antes de disparar, projeta uma mira laser vermelha tática que trava na posição do jogador.
- **Emboscada:** Se o jogador ficar de costas por muito tempo, o Courier entra em modo **Ambush**, avançando silenciosamente para um ataque corpo a corpo surpresa antes de recuar.
- **Defesa:** Não possui dano de contato padrão. Se encurralado ou descoberto durante uma emboscada, entra em pânico e usa um micro-dash para escapar.

## 4. Ground Turret (R)
**Classificação:** Defesa de Solo Modular
**Estética:** Metal pesado com variantes de núcleo (Azul, Bronze, Ouro).

- **Lore:** Originalmente projetadas para o setor logístico para automatizar o carregamento de suprimentos disparando caixas para os robôs de transporte. Durante o colapso, foram reconfiguradas para hostilidade, tornando-se defesas de perímetro letais que disparam diferentes tipos de carga.
- **Variantes de Projétil:**
    - **Energy Ball (Ciano):** Dano padrão de energia.
    - **Mechanical Box (Marrom):** Lança caixas de suprimentos pesadas (origem logística).
    - **Antimatter (Roxo):** Projétil quântico instável de alto dano.
- **Mecânica:** Disparo rítmico com suporte a auto-rotação mecânica.

## 5. Wall Turret
**Classificação:** Defesa Tática de Perímetro
**Status:** [AGUARDANDO IMPLEMENTAÇÃO]

- **Lore:** Sistemas de segurança avançados e puramente militares, projetados para serem montados em superfícies verticais para proteger setores críticos e infraestruturas vitais.
- **Mecânica Prevista:** Montagem em paredes e disparos de contenção de alta cadência.

## 6. Spark Jumper (®)
**Classificação:** Condutor Saltador de Alta Energia
**Estética:** Amarelo Industrial (#f1c40f), pernas de mola e pés condutores brilhantes.

- **Lore:** Antigos drones de manutenção de rede elétrica que sofreram sobrecarga crítica durante o colapso. Agora, operam em um estado de hiperatividade constante, saltando entre as linhas de força para descarregar o excesso de energia acumulado em seus capacitores.
- **Comportamento:** Move-se e salta estritamente sobre **fios (`wire`)**. 
- **Ataque:** **Electric Discharge**. Ao pousar, gera um pulso elétrico em área que eletrifica toda a rede de fios conectada ao ponto de impacto por tempo limitado (os fios tornam-se **dourados** e altamente perigosos).
- **DANO:** 0.25 Corações (1/4) - Dano elétrico leve mas persistente.
- **Fraqueza:** Recebe dano se tocar em **Energia Vermelha (Red Energy)** fluindo pelos fios. O jogador pode induzir esta energia na rede para neutralizá-los com segurança.
- **Voz:** Sons elétricos oscilantes que indicam as fases de carga, salto e descarga.

## 7. Weld Bot (🔥)
**Classificação:** Unidade de Fusão Térmica Industrial
**Estética:** Cinza Metálico (#7f8c8d) com tanques de gás azul (#3498db) e visor de alerta.

- **Lore:** Originalmente projetados para manutenção de infraestrutura e selagem de compartimentos críticos. Com o colapso, sua diretriz de "soldagem" tornou-se obsessiva; eles agora buscam "corrigir" qualquer anomalia no ambiente fundindo-a com o cenário.
- **Comportamento:** Persegue o jogador de forma implacável e agressiva.
- **Ataque:** **Industrial Welding**. Ao se aproximar, trava no lugar e dispara um jato de chamas contínuas em cone por 5 segundos. O fogo causa dano contínuo (Burn) e é bloqueado apenas por paredes sólidas.
- **Ataque Final (Meltdown):** Ao ser "derrotado", o robô não morre instantaneamente. Ele entra em uma falha crítica de 3 segundos, vibrando intensamente e expelindo faíscas antes de uma **detonação catastrófica de fogo** que causa dano em área (AoE) a tudo que estiver por perto.
- **Defesa:** **Blindagem Frontal**. Seu chassi dianteiro é reforçado, tornando-o invulnerável a ataques frontais ou laterais. 
- **Fraqueza:** **Tanques de Gás Expostos**. Seus tanques traseiros são seu ponto crítico; um ataque pelas costas causa destruição imediata.
- **Voz:** Tons industriais profundos. Ao detectar o jogador pela primeira vez, grita ordens obsessivas como "SOLDAR!" ou "EU PRECISO SOLDAR!".

---

> [!TIP]
> Use o **Dash (Shift)** para atravessar inimigos e ganhar quadros de invulnerabilidade durante o combate ou para escapar de emboscadas dos Data Couriers. Cuidado ao pisar em fios quando um Spark Jumper estiver na área; a rede pode se tornar letal em um piscar de olhos.
