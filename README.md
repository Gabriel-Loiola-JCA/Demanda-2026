# Estudo de Poltronas

Painel estático que lê um CSV de vendas de passagens e responde, com evidência, **quais poltronas vendem antes — e primeiro**. Reconstrói cada viagem, ordena as compras, desenha o mapa de calor sobre a planta do veículo e simula o ganho de um reajuste.

Roda inteiramente no navegador: **nenhum dado sai da máquina**. Sem back-end, sem build, sem dependências.

Criado por Gabriel Loiola.

---

## Como publicar no GitHub Pages

1. Crie o repositório e suba estes arquivos na raiz.
2. Em **Settings → Pages**, escolha `Deploy from a branch`, branch `main`, pasta `/ (root)`.
3. Pronto. O site abre em `https://<usuario>.github.io/<repo>/`.

Todos os caminhos são relativos (`./assets/...`), então o site funciona em subpasta sem ajuste. O arquivo `.nojekyll` impede o Jekyll de ignorar diretórios.

## Cache

`sw.js` é um service worker com estratégia *stale-while-revalidate*: a página abre instantaneamente do cache e se atualiza em segundo plano. Depois do primeiro acesso, funciona offline.

**A cada deploy, suba a versão** no topo do `sw.js`:

```js
const VERSION = 'v5.0.1';
```

O `activate` apaga sozinho os caches de versões anteriores. Sem isso, o navegador continua servindo a versão antiga.

## Estrutura

```
index.html                  markup e diálogos
assets/css/app.css          folha única, com tokens de tema
assets/js/engine.js         leitura de CSV, plantas, métricas, XLSX e PDF
assets/js/app.js            interface, estado, ajustes e gráficos
sw.js                       cache
manifest.webmanifest        instalação como app
```

## Cor

A interface é **neutra por decisão de projeto** — preto, branco e grafite. A cor fica reservada ao mapa de calor, que é o único lugar onde ela carrega significado.

Em **Ajustes** (engrenagem no cabeçalho) dá para configurar:

| Opção | O que faz |
|---|---|
| Escala do mapa | nove paletas, incluindo uma em cinza para impressão em P&B |
| Misturar duas cores | monte o degradê com duas cores próprias em vez de usar uma escala pronta |
| Inverter a intensidade | quem vende mais fica quase transparente, e a cor cheia marca as poltronas fracas — para caçar ociosidade em vez de confirmar campeãs |
| Sensibilidade | quanto a cor muda entre poltronas de valores próximos |
| Referência da escala | `0 → máximo`, `mínimo → máximo` ou `posição no ranking` |
| Marcar o top 5 | contorno neutro nas cinco poltronas do ranking ativo |
| Tingir a interface | opcional: botões e barras adotam a cor do mapa |
| Tema claro · brilho de fundo | aparência geral |
| Cor no PDF | desligado, o relatório sai em escala de cinza |

Tudo é gravado em `localStorage` e vale para os próximos estudos.

### Quando o mapa fica todo da mesma cor

É o caso comum de operação madura: quase toda poltrona vende em quase toda viagem, os valores se amontoam no topo e o degradê não tem o que separar. Duas saídas, ambas em **Ajustes → Escala**:

- **Referência `mínimo → máximo`** estica a escala entre o pior e o melhor valor do recorte, em vez de partir do zero.
- **Referência `posição no ranking`** ignora a distância entre os valores e distribui as cores pela ordem — a diferença visual fica sempre visível, mesmo que a diferença real seja pequena.

A **sensibilidade** aplica uma curva por cima de qualquer uma das três. Vale lembrar do custo: quanto mais se estica a escala, mais uma diferença irrelevante parece grande. Para decidir preço, olhe o número na tabela, não só a cor.

## Dados

O CSV precisa de **poltrona**, **data da venda** e algo que identifique a **viagem**. Colunas de serviço, classe, canal, origem/destino e receita são opcionais e ativam filtros, detecção de planta e a simulação de preço.

**A ordem das colunas não importa.** O motor localiza cada uma pelo nome do cabeçalho, tolerando acento, maiúscula, `º`, e separadores (`_`, `.`, `-`, `/`) — `Data Venda`, `data_venda` e `DATA DA VENDA` são a mesma coisa. Colunas desconhecidas são ignoradas sem reclamar.

Todo arquivo analisado entra no histórico automaticamente, e o painel pede um nome logo em seguida. Os estudos ficam em IndexedDB, no próprio navegador.

## Simulação

Dois modos: **percentual** sobre o preço médio pago, ou **valor fixo em reais** somado a cada bilhete. Em ambos, o painel mostra o ganho no recorte, a projeção em 1, 6 e 12 meses e a **margem de segurança** — quanto da venda a operação suporta perder antes de empatar com a receita de hoje.

O bloco **Recomendação**, na visão executiva, traduz isso em uma frase e sugere as três poltronas com melhor índice de oportunidade.

## Relatório em PDF

O PDF é um retrato da tela no momento em que foi gerado: a métrica ativa no mapa, o ranking selecionado, os filtros aplicados e a mesma escala de cor — inclusive inversão e sensibilidade. Trocar a métrica e exportar de novo produz um relatório diferente.

## Limites

A simulação de reajuste é **determinística sobre dados observados**: aplica um percentual à receita já realizada e mostra quanto de venda o aumento suportaria perder antes de empatar. Ela não estima elasticidade nem prevê a reação da concorrência — a retenção de demanda é uma premissa explícita do usuário, e por isso aparece na tela e no relatório.
