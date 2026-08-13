# Radar de Demanda 2026

Painel interativo para acompanhamento dos principais eventos, feriados, shows, festivais, provas, feiras e jogos com potencial de impacto sobre a demanda de viagens no segundo semestre de 2026.

## Acessar o painel

**Site:** [gabriel-loiola-jca.github.io/Demanda-2026](https://gabriel-loiola-jca.github.io/Demanda-2026/)

## Funcionalidades

- Identifica automaticamente a data local do dispositivo do usuário.
- Apresenta os três eventos atuais ou futuros mais próximos.
- Prioriza eventos em andamento e datas com maior pressão potencial sobre a demanda.
- Oculta eventos encerrados da agenda por padrão, sem apagar o histórico.
- Permite consultar eventos anteriores pelo botão **Mostrar passados**.
- Disponibiliza filtros por categoria, praça, região, fonte e período.
- Exibe calendário diário com índice de pressão de demanda.
- Reúne fontes públicas e referências para conferência dos dados.
- Inclui eventos relevantes como Rock in Rio, Oktoberfest, Semana Farroupilha, feriados nacionais, vestibulares, concursos e partidas de futebol.

## Como o índice deve ser interpretado

O índice de pressão de demanda é uma pontuação comparativa de 0 a 100. Ele considera:

- volume de público exposto;
- potencial de utilização do transporte rodoviário;
- direção do fluxo entre as cidades;
- concentração da demanda em poucos dias ou horários;
- sobreposição com feriados e outros grandes eventos.

O índice indica prioridade relativa para análise. Ele não representa uma previsão percentual de crescimento e não garante aumento de demanda.

## Atualização automática por data

O painel utiliza a data configurada no computador ou celular de quem acessa o site. Eventos cuja data final já passou ficam ocultos na agenda principal, mas continuam armazenados no arquivo e podem ser consultados selecionando **Mostrar passados**.

## Fontes e atualização dos dados

As informações são consolidadas a partir de fontes públicas, incluindo organizadores, bilheterias, prefeituras, federações esportivas, bancas de concursos e imprensa.

Datas, locais, públicos e programações podem mudar. Antes de utilizar uma informação em uma decisão comercial, recomenda-se abrir a fonte indicada no painel e confirmar os dados mais recentes.

## Estrutura do projeto

```text
.
├── index.html   # Aplicação completa, estilos, dados e scripts
└── README.md    # Documentação do projeto
```

O projeto não exige instalação, servidor de aplicação ou banco de dados. Todo o conteúdo necessário para executar o painel está dentro do arquivo `index.html`.

## Executar localmente

Basta abrir o arquivo `index.html` em um navegador moderno.

Opcionalmente, é possível iniciar um servidor local:

```bash
python -m http.server 8000
```

Depois, acesse `http://localhost:8000`.

## Publicação

O site é publicado pelo GitHub Pages a partir da branch `main` e da pasta raiz do repositório. Cada atualização enviada para o `index.html` gera uma nova publicação do painel.

## Responsável

Criado por **Gabriel Loiola**.
