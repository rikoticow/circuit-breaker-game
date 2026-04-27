# 💬 Sistema de Diálogos: Rich Text e Gatilhos

O sistema de diálogos do **CIRCUIT BREAKER** utiliza o motor **Tippy.js** para renderização de HUDs industriais com suporte a efeitos de máquina de escrever e formatação dinâmica.

## 1. Códigos de Rich Text (Tags)

Você pode inserir códigos especiais diretamente no texto para controlar o ritmo, o som e a aparência da fala.

| Tag | Descrição | Exemplo |
| :--- | :--- | :--- |
| `[pause:ms]` | Pausa a digitação por X milissegundos. | `Olá... [pause:500] Alguém aí?` |
| `[speed:ms]` | Altera a velocidade de escrita (ms por caractere). | `[speed:100] Muito lento... [speed:20] Rápido!` |
| `[color:hex]` | Altera a cor do texto a partir deste ponto. | `Atenção: [color:#ff0000]ERRO CRÍTICO!` |
| `[sfx:type]` | Altera o tipo de voz (blip). | `[sfx:ia] Voz robótica... [sfx:human] Voz humana.` |

### Formatação HTML Nativa
O sistema também suporta HTML padrão para estilo:
- `<b>Negrito</b>` -> **Negrito**
- `<i>Itálico</i>` -> *Itálico*
- `<u>Sublinhado</u>` -> <u>Sublinhado</u>

---

## 2. Configurações de Comportamento

Cada diálogo pode ser configurado com comportamentos de controle e exibição:

- **Modo Automático (`autoDismiss: true`)**: A caixa desaparece sozinha após o tempo definido em `dismissDelay`.
- **Modo Manual (`autoDismiss: false`)**: O texto termina e exibe um indicador "PRESS ENTER". O jogo fica pausado/travado até o jogador fechar a mensagem.
- **Bloqueio de Movimento (`lockPlayer: true`)**: O robô não pode se mover enquanto o diálogo estiver ativo.

---

## 3. Exemplos de Uso (JSON no Editor)

```json
{
  "text": "[speed:50]Iniciando protocolos de segurança...[pause:1000]\n[color:#00f0ff]CONEXÃO ESTABELECIDA.",
  "icon": "ai",
  "trigger": "start",
  "autoDismiss": false,
  "lockPlayer": true
}
```

## 4. Estética HUD Industrial
As caixas de diálogo seguem o padrão visual do jogo:
- **Scanlines**: Efeito de linhas de monitor CRT.
- **Neon Glow**: Brilho ciano para IA e Branco/Verde para Central.
- **Blink Cursor**: Cursor piscante ao final do texto.
- **Audio Blips**: Sons gerados via Web Audio API baseados no conteúdo do texto.
