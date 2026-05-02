# 💬 Sistema de Diálogos: Rich Text e Gatilhos

O sistema de diálogos do **CIRCUIT BREAKER** utiliza o motor **Tippy.js** para renderização de HUDs industriais com suporte a efeitos de máquina de escrever e formatação dinâmica via CSS Variables.

## 1. Códigos de Rich Text (Tags)

Você pode inserir códigos especiais diretamente no texto. O sistema utiliza um **Parser de Primeira Ocorrência**, permitindo que valores complexos sejam passados como parâmetros.

| Tag | Parâmetros | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `[pause:ms]` | `ms` | Pausa a digitação por X milissegundos. | `Olá... [pause:500] Alguém aí?` |
| `[speed:ms]` | `ms` | Altera a velocidade de escrita (ms por char). | `[speed:10] Rápido! [speed:50] Lento.` |
| `[color:hex]` | `#hex` | Altera a cor do texto (sofre override de efeitos). | `Atenção: [color:#ff0000]ERRO CRÍTICO!` |
| `[size:px]` | `px` | Altera o tamanho da fonte. | `[size:30]GRANDE [size:18]Normal.` |
| `[arcane]` | `int:c1:c2` | Aura mágica com pulso bicolor e vibração. | `[arcane:1:#ffff00:#0000ff]Magia!` |
| `[crypt]` | `int` | Glitch persistente. Texto embaralha continuamente. | `[crypt:2]DADO_CRIPTOGRAFADO[crypt:off]` |
| `[highlight]` | `#cor` | Tarja de marcador (sem fendas entre letras). | `[highlight:#00ffaa]SECRETO[highlight:off]` |
| `[melt]` | `int` | Sequência de falha (piscar rápido) + queda direta. | `[melt:1.5]Sistema falhando...` |
| `[wave]` | `int` | Letras flutuam em onda senoidal. | `[wave:3]Ondas magnéticas...` |
| `[pulse]` | `int` | Brilha e expande rítmicamente. | `[pulse:2]Alerta forte![pulse:off]` |
| `[reboot]` | `int` | Flicker de sistema (brilho/opacidade). | `[reboot:2]REINICIANDO...[reboot:off]` |
| `[pixel]` | `int` | Surge borrado e ganha definição pixelada. | `[pixel:2]Ajustando foco óptico.` |
| `[sketch]` | `int` | Efeito de desenho vibrante à mão. | `[sketch:2]Rascunho de memória...` |
| `[shake]` | `int` | Vibração de tela localizada no texto. | `[shake:5]AVISO SÍSMICO![shake:off]` |
| `[sfx:mode]` | `ia/human` | Altera o som da voz de digitação. | `[sfx:human]Oi [sfx:ia]Robô.` |
| `\n` | - | Quebra de linha manual. | `Linha 1\nLinha 2` |

> [!TIP]
> **Intensidade (int):** A maioria dos efeitos aceita um valor numérico (ex: `1`, `2.5`, `5`). 
> - `1` é o padrão de fábrica.
> - Valores maiores (ex: `5`) aumentam a força/velocidade dramaticamente.
> - Valores menores (ex: `0.2`) criam sutileza industrial.
> - **Atalho de Fechamento (BBCode):** Para desligar um efeito persistente, use a sintaxe de fechamento padrão: **`[/nome_da_tag]`** (ex: `[/arcane]`). É o método mais limpo e recomendado!

### Formatação HTML Nativa
- `<b>Negrito</b>` -> **Negrito**
- `<i>Itálico</i>` -> *Itálico*
- `<u>Sublinhado</u>` -> <u>Sublinhado</u>

---

## 2. Tags Avançadas e Sincronia

### 🌈 Efeito Arcane (Bicolor)
O `arcane` suporta até três parâmetros: `[arcane:intensidade:cor_interna:cor_aura]`.
- Se você definir cores, elas terão **prioridade absoluta** sobre qualquer tag `[color]` anterior.
- As cores pulsam suavemente entre a Cor 1 e a Cor 2.

### 🧩 Efeito Crypt (Persistência)
Ao contrário de outros sistemas, o `crypt` do CIRCUIT BREAKER é **persistente**. Enquanto a tag estiver aberta, o texto continuará "scrambling" (embaralhando) via um loop de animação global, mantendo a legibilidade parcial baseada na intensidade.

### 🖍️ Highlight Contínuo
O efeito `[highlight]` utiliza vedação por sombra horizontal. Isso garante que, mesmo que o texto seja quebrado em letras individuais, a tarja de cor pareça um bloco único e sólido. **Importante:** Força o texto para PRETO para garantir contraste.

---

## 3. Configurações de HUD e Posicionamento

Cada diálogo no `levels.js` possui metadados de exibição:

- **Modo Estático:** O diálogo aparece em posições fixas (`top`, `bottom`, `center`, `left`, `right`).
- **Modo Dinâmico (`follow`)**: O HUD persegue o robô pelo cenário. Utiliza *Dirty Checking* para mover o popper apenas quando há deslocamento real, otimizando a performance.
- **Auto-Fechar (`autoDismiss`)**: Fecha sozinho após a digitação.
- **Delay de Fechamento (`dismissDelay`)**: Tempo de espera (em ms) após o fim da escrita para fechar automaticamente.

---

## 4. Exemplos de JSON para o Editor

```json
{
  "text": "[speed:30][arcane:1.5:#00ffaa:#0055ff]SISTEMA ATIVO.\n[speed:60][crypt:1]Acesso restrito ao Setor 12.",
  "icon": "ia",
  "trigger": "start",
  "pos": "follow",
  "autoDismiss": true,
  "dismissDelay": 2000
}
```

---

## 5. Estética e Performance
- **GPU Accelerated:** Todos os efeitos de movimento (wave, shake, melt) utilizam `transform: translate3d`, garantindo 60fps estáveis.
- **Web Audio Sync:** Os "blips" de digitação são sincronizados com a tag `[speed]` ativa.
- **Additive Blending:** HUDs utilizam mixagem `lighter` para brilhar sobre o cenário industrial.
