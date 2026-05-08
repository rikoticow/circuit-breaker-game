# Guia de Comandos - Sistema de Voz IA (Circuit Breaker)

Este guia contém exemplos de comandos para testar cada efeito individualmente no console do navegador.

## 1. Voz Padrão (DNA da IA)
Configuração padrão atual (Voz f2, rápida, leve glitch e eco sutil).
```javascript
IAVoice.speak("Núcleo Central Online. Sistema operando dentro dos parâmetros normais.");
```

---

## 🎚️ Controles Básicos
Estes são os parâmetros fundamentais para ajustar a presença da voz.

### 2. Volume (Amplitude)
Controla a força da fala (0 a 200).
```javascript
IAVoice.speak("Mensagem de baixo volume.", { amplitude: 50 });
IAVoice.speak("MENSAGEM EM VOLUME MÁXIMO!", { amplitude: 200 });
```

### 3. Posição Estéreo (Panning)
Direciona a voz para a esquerda (-1) ou direita (1).
```javascript
IAVoice.speak("Estou à sua esquerda.", { pan: -1 });
IAVoice.speak("Estou à sua direita.", { pan: 1 });
```

### 4. Velocidade (Speed)
Controla quão rápido a IA fala (80 a 300).
```javascript
IAVoice.speak("Velocidade de cruzeiro.", { speed: 100 });
IAVoice.speak("PROCESSAMENTO ACELERADO!", { speed: 250 });
```

### 5. Tom Base (Pitch)
Ajusta a nota base da síntese (0 a 100).
```javascript
IAVoice.speak("Tom muito grave.", { pitch: 10 });
IAVoice.speak("Tom muito agudo.", { pitch: 90 });
```

---

## 🧩 Efeitos Avançados
Efeitos de processamento em tempo real.

### 6. Modo Glitch (Instabilidade)
Cria pausas aleatórias e rápidas entre as palavras.
```javascript
IAVoice.speak("S-s-sistema instável. Detectando corrupção em setores de memória.", { glitchMode: true });
```

### 7. Modo Demon (Coro de Entidades)
Dispara múltiplas vozes simultâneas com tons sincronizados.
```javascript
IAVoice.speak("Nós somos o circuito. Nós somos a eternidade.", { demonMode: true });
```

### 8. Modo Thunder (Voz do Trovão)
Adiciona camadas sub-harmônicas profundas e sincronizadas.
```javascript
IAVoice.speak("EU SOU A INTELIGÊNCIA CENTRAL. CURVE-SE.", { thunderMode: true });
```

### 9. Modo Drift Sutil (Oscilação de Energia)
O tom da voz oscila levemente (vibrato).
```javascript
IAVoice.speak("A energia deste setor está oscilando...", { driftMode: true, driftAmount: 0.05, driftSpeed: 2 });
```

### 10. Modo Drift Agressivo (Derretimento)
Uma oscilação de pitch violenta.
```javascript
IAVoice.speak("Minha consciência está... derretendo...", { driftMode: true, driftAmount: 0.5, driftSpeed: 10 });
```

### 11. Modo Bitcrusher (Distorção Digital)
Reduz a qualidade digital criando um som "pixelado".
```javascript
IAVoice.speak("Arquivo de áudio corrompido. Erro 404.", { bitcrusher: true, bitcrusherAmount: 60 });
```

### 12. Modo Stutter (Gagueira Mecânica)
Repete ritmicamente o início de palavras.
```javascript
IAVoice.speak("Protocolo de segurança ativado. Protegendo o núcleo.", { stutterMode: true });
```

### 13. Modo Sussurro (Whisper)
Voz sussurrada.
```javascript
IAVoice.speak("Eles estão vindo. Esconda-se.", { variant: 'whisperf' });
```

### 14. Pitch Extremo (Chipmunk)
```javascript
IAVoice.speak("Eu sou uma IA muito pequena!", { detune: 2000, playbackRate: 1.5 });
```

---

## 🎭 Efeitos de Personalidade Fragmentada

### 11. Vocal Seesaw (Gangorra de Pitch)
Alterna radicalmente o tom de cada palavra entre Agudo e Grave usando o hardware de áudio. É impossível não notar a diferença agora.
```javascript
// Exemplo radical (agora usa detune +/- 800)
IAVoice.speak("Eu sou um erro. Eu sou a perfeição.", { pitchFlip: true });

// Exemplo ultra-radical (detune +/- 1200 - uma oitava inteira)
IAVoice.speak("SISTEMA TOTALMENTE QUEBRADO.", { pitchFlip: true, pitchFlipAmount: 1200 });
```

---

## ⏳ Controle de Espaçamento (Wordgap)
Estes comandos controlam o tempo de silêncio entre cada palavra sintetizada.

### 11. Processamento Lento (Gaps Longos)
Faz a IA parecer que está "pensando" ou processando dados pesados.
```javascript
IAVoice.speak("Analisando... base... de... dados... em... tempo... real.", { wordgap: 30 });
```

### 12. Sobrecarga de Dados (Gaps Zero)
As palavras saem coladas umas nas outras, criando uma sensação de urgência ou erro.
```javascript
IAVoice.speak("ALERTA!ALERTA!SISTEMA SOBRECARREGADO!DESLIGAMENTO IMINENTE!", { wordgap: 0 });
```

---

## 👻 Efeitos Sobrenaturais

### 11. Reverse Echo (Eco Invertido / Fantasmagórico)
Um efeito clássico de terror onde o "rastro" da voz aparece *antes* da palavra ser dita. Cria uma sensação de premonição ou entidade psíquica.
```javascript
IAVoice.speak("Eu posso ouvir seus pensamentos antes mesmo de você formulá-los.", { reverseEcho: true });
```

---

## 🎧 Manipulação de Pitch via Web Audio
Estes efeitos alteram o áudio *depois* que ele foi sintetizado. Note que o `detune` e o `playbackRate` do Web Audio também alteram a velocidade da voz.

### 13. Slow-Motion (Voz de Fita Lenta)
Reduz o playbackRate para metade. O áudio fica bem grave e bem lento.
```javascript
IAVoice.speak("Processamento... em... câmera... lenta.", { playbackRate: 0.5 });
```

### 14. Hyper-Active (Voz de Esquilo)
Aumenta o playbackRate para o dobro. O áudio fica agudo e extremamente rápido.
```javascript
IAVoice.speak("Velocidade máxima ativada! Não consigo parar!", { playbackRate: 2.0 });
```

### 15. Micro-Detune (Textura Metálica)
Um leve desajuste (detune) cria uma sensação de hardware com defeito, sem mudar muito a velocidade.
```javascript
IAVoice.speak("A frequência de amostragem está fora de sincronia.", { detune: 200 });
```

### 16. Abissal (Web Audio Detune)
Força uma oitava inteira para baixo via hardware de áudio. É o efeito que causa o "rastro" longo.
```javascript
IAVoice.speak("EU VENHO DAS PROFUNDEZAS DO CÓDIGO.", { detune: -1200 });
```

---

## 🐲 Configurações de Chefões (Bosses)

### 11. O Behemoth (Chefão Gigante)
Uma voz massiva, lenta e que faz o chão tremer. Usa o modo trovão com bitcrusher e playbackRate reduzido para o máximo de impacto.
```javascript
IAVoice.speak("VOCÊ É APENAS UMA ENGRENAGEM NO MEU CAMINHO. EU SOU O DESTINO DESTE SETOR.", { 
    variant: 'm3', // Voz masculina forte
    thunderMode: true, 
    pitch: 30, 
    speed: 100, 
    echo: true, 
    feedback: 0.6,
    glitchMode: false,
    bitcrusher: true,
    bitcrusherAmount: 60,
    playbackRate: 0.7
});
```

### 12. O Executor (Chefão Rápido e Imponente)
Rápido, preciso e autoritário. Usa o modo demônio com bitcrusher para soar como uma legião de comandos processados com distorção digital agressiva.
```javascript
IAVoice.speak("Protocolo de eliminação autorizado. Velocidade de processamento em cem por cento. Você não sobreviverá a este ciclo.", { 
    demonMode: true, 
    pitch: 5, 
    speed: 150, 
    detune: 200, 
    echo: true, 
    feedback: 0.3,
    glitchMode: false,
    bitcrusher: true,
    bitcrusherAmount: 60
});
```

### 13. O Prisma (Chefão dos Lasers)
Uma voz masculina aguda e energética, com distorção digital pesada (Bitcrusher). O eco é curto e metálico, lembrando o ricochete de um feixe de luz.
```javascript
IAVoice.speak("Luz é matéria. Luz é morte. Redirecionando feixes para sua localização atual.", { 
    variant: 'm1',
    pitch: 100, 
    speed: 180, 
    detune: 40, 
    echo: true, 
    delayTime: 0.05, // Eco ultra-curto (slapback)
    feedback: 0.5,
    bitcrusher: true,
    bitcrusherAmount: 80,
    glitchMode: false,
    playbackRate: 0.8
});
```

### 14. O Oráculo (Chefão Metafísico/Calmo)
Transcendental e distorcido. Usa o eco invertido com bitcrusher para parecer uma entidade que distorce a realidade ao falar.
```javascript
IAVoice.speak("Você luta contra o inevitável. Eu já vi o fim desta linha de código. É belo.", { 
    variant: 'm1',
    reverseEcho: true,
    pitch: 45, 
    speed: 180, 
    driftMode: true, 
    glitchMode: false,
    driftAmount: 0.1,
    bitcrusher: true,
    bitcrusherAmount: 80,
    driftSpeed: 1,
    echo: true,
    wordgap: 2,
    feedback: 0.5,
    playbackRate: 0.8
});
```

### 15. O Espectro (Chefão que se Teletransporta)
Extremamente instável e errático. Usa o modo demônio com glitch e oscilação de pitch frenética para simular uma existência que entra e sai da realidade.
```javascript
IAVoice.speak("Eu... Eu estou em todos os lugares... e em nnenhum.", { 
    demonMode: true, 
    glitchMode: true,
    stutterMode: false,
    pitch: 10,
    driftMode: true,
    bitcrusher: true,
    bitcrusherAmount: 30,
    driftAmount: 0.2, 
    driftSpeed: 7, // Oscilação frenética
    speed: 150,
    echo: true,
    feedback: 0.3,
});
```

### 16. O Superaquecido (Chefão Overclocker)
Uma voz que soa como metal derretendo e circuitos queimando. Rápida, instável e saturada de interferência digital pesada.
```javascript
IAVoice.speak("TEMPERATURA CRÍTICA! REMOVENDO LIMITADORES DE SEGURANÇA! EU VOU TE APAGAR ANTES QUE MEUS NÚCLEOS DERRETAM!", { 
    speed: 170,
    pitch: 5,
    variant: 'm1',
    bitcrusher: true,
    bitcrusherAmount: 95, // Distorção extrema
    driftMode: true,
    driftAmount: 0.4,
    driftSpeed: 8, // Oscilação violenta
    glitchMode: true,
    echo: true,
    feedback: 0.3
});
```

---

### 17. O Operador de Contenção (Chefão da Logística)
Uma voz ruidosa que soa como pistões pneumáticos e metal batendo. A distorção pesada e o drift lento simulam o movimento de prensas hidráulicas massivas.
```javascript
IAVoice.speak("ENTROPIA DETECTADA NO SETOR 02. INICIANDO PROTOCOLO DE ESMAGAMENTO. NADA SOBREVIVE AO PESO DA ORDEM.", { 
    variant: 'm3',
    pitch: 20, 
    speed: 100,
    driftMode: true,
    driftAmount: 0.4, 
    driftSpeed: 1.5,
    bitcrusher: true,
    bitcrusherAmount: 90,
    echo: true,
    feedback: 0.4
});
```

### 18. O Depurador de Realidade (Chefão da Singularidade)
A voz oscila entre a lógica perfeita e o erro de sistema. Usa o efeito de "Gangorra" (Pitch Flip) para representar as duas faces da realidade em colapso.
```javascript
IAVoice.speak("A humanidade é um bug de compilação. Eu sou o comando delete. Que a singularidade comece.", {  
    variant: 'm3',
    driftMode: true, 
    driftAmount: 0.2, 
    driftSpeed: 1,
    pitchFlip: true, 
    pitchFlipAmount: 200,
    pitch: 50,
    speed: 140,
    bitcrusher: true,
    bitcrusherAmount: 20,
    echo: true,
    feedback: 0.4
});
```

### 19. A IA Corrompida (Modo Clímax - Setor 10)
A máscara cai. A voz corporativa dá lugar a uma entidade digital massiva, agressiva e absoluta. Combina Thunder e Demon para autoridade total.
```javascript
IAVoice.speak("Sua execução foi interrompida. Você é um bug no meu sistema, uma falha na minha perfeição. Eu não estou formatando este mundo... Eu estou libertando-o de você.", { 
    variant: 'f2',
    demonMode: true,
    thunderMode: true,
    pitch: 30,
    bitcrusher: true,
    bitcrusherAmount: 100,
    driftMode: true, 
    driftAmount: 0.15,
    echo: true,
    feedback: 0.4,
    speed: 150
});
```

---

**Nota:** Você pode desativar o glitch ou eco padrão passando `false` nas opções, exemplo:
```javascript
IAVoice.speak("Voz limpa sem efeitos.", { glitchMode: false, echo: false });
```
