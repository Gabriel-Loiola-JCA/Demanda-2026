# Radar de Demanda

Shows, festivais, feriados, provas e jogos que movimentam viagens, de 2026 a 2027. Revenue · Grupo JCA.

**Site:** [gabriel-loiola-jca.github.io/Demanda-2026](https://gabriel-loiola-jca.github.io/Demanda-2026/)

- **O que temos hoje?** Hoje, 7 dias, 30 dias, tudo ou um dia escolhido; por praça e por tipo.
- **Faixa dos próximos 60 dias:** altura e cor mostram a pressão de demanda de cada dia; clique para ver o dia.
- **Pressão de demanda (0 a 100):** pontuação comparativa (público, uso de ônibus, concentração e feriados). Não é previsão de vendas.
- Clique num evento para ver o resumo e a fonte.

## Estrutura

```text
index.html          # a página (HTML, CSS e JS, sem dependências)
data/eventos.json   # os eventos: d, d2, n (nome), p (praça), c (tipo), i (pressão), s (resumo), img, src
img/                # fotos 160×160, mostradas em círculo
marca/              # logotipo do Revenue e favicon
```

O HELIOS lê `data/eventos.json` para mostrar os eventos de cada dia na consulta e abre esta página na aba Demanda
(`?embed=1&tema=escuro|claro&dia=AAAA-MM-DD&praca=Cidade`).

## Fontes

Organizadores, bilheterias, prefeituras, federações e imprensa. Datas, locais e públicos podem mudar: confira a fonte
antes de usar numa decisão comercial.

Criado por **Gabriel Loiola**.
