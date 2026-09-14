# Sales Compass

Crie um aplicativo web SaaS de prospecção comercial chamado ProspectFlow.

O objetivo do sistema é simples:

Encontrar potenciais clientes de acordo com um ICP → organizar esses prospects → iniciar contatos pelo WhatsApp → acompanhar follow-ups → controlar tudo em um funil Kanban.

O sistema deve ser funcional, rápido, limpo e altamente personalizável, mas sem excesso de funcionalidades. Priorize uma experiência prática para uma pessoa que usa o aplicativo diariamente para prospectar clientes.

1. TECNOLOGIA

Utilize:

React + TypeScript

Tailwind CSS

shadcn/ui

Supabase para banco de dados, autenticação e backend

Estrutura preparada para integração com APIs externas

Layout responsivo, priorizando desktop

Organize o código de forma modular e escalável, mas não crie complexidade desnecessária.

2. ESTILO VISUAL

Interface SaaS moderna, profissional e minimalista.

Preferência por:

fundo claro ou dark mode opcional

cards discretos

bordas suaves

bastante espaço e respiro

tipografia moderna

ícones simples

poucos elementos decorativos

hierarquia visual clara

microinterações sutis

Não quero uma interface exageradamente futurista ou cheia de gradientes.

A sensação deve ser de um software profissional de vendas.

3. ESTRUTURA PRINCIPAL

Crie um menu lateral com:

Dashboard

Prospecção

Prospects

Pipeline

WhatsApp

ICPs

Configurações

No topo:

busca global

notificações

perfil do usuário

DASHBOARD

Criar uma visão extremamente objetiva.

Cards:

Prospects encontrados

Novos prospects

Contatos realizados

Respostas

Reuniões

Follow-ups pendentes

Adicionar uma seção:

"Ações de hoje"

Exibir:

prospects que precisam ser contatados

follow-ups programados

respostas aguardando atendimento

reuniões próximas

Adicionar também um pequeno resumo do funil.

Não criar gráficos complexos inicialmente.

ICPs

Criar uma área chamada "Meus ICPs".

O usuário poderá criar, editar, duplicar e excluir ICPs.

Exemplo:

ICP — Imobiliárias de Alto Padrão

Campos:

Nome do ICP

Nicho

Subnicho

País

Estado

Cidade

Regiões

Faturamento mínimo

Faturamento máximo

Número mínimo de funcionários

Número máximo de funcionários

Palavras-chave

Site obrigatório: sim/não

Instagram obrigatório: sim/não

Outros critérios

O usuário deve conseguir salvar vários ICPs.

Exemplos:

Imobiliárias

Clínicas

Escolas

Arquitetos

Dentistas

O sistema NÃO deve limitar o usuário a esses nichos.

Todos os campos devem ser editáveis.

PROSPECÇÃO

Essa é uma das áreas mais importantes.

Criar botão:

"+ Nova busca"

O usuário escolhe um ICP ou cria os filtros manualmente.

Filtros iniciais:

Nicho

Localização

Cidade

Estado

Faturamento

Número de funcionários

Palavras-chave

Presença digital

Site

Instagram

Depois clicar:

"Encontrar prospects"

Mostrar os resultados em tabela.

Colunas:

Empresa

Nicho

Cidade

Estado

Site

Instagram

Telefone

Contato

Cargo

ICP Score

Status

Cada prospect deve possuir checkbox para seleção em massa.

Ações:

Adicionar ao pipeline

Adicionar aos prospects

Criar sequência

Adicionar tag

Exportar

IMPORTANTE:

A arquitetura deve permitir integrar posteriormente diferentes fontes de dados/APIs para obtenção desses prospects.

Não invente dados reais.

Se uma API externa ainda não estiver conectada, criar uma camada/mock service claramente separada para permitir a integração posteriormente.

ICP SCORE

Cada prospect deve possuir um score de 0 a 100.

Criar uma estrutura configurável para os critérios de pontuação.

Exemplo:

+20 — Nicho correto
+15 — Região correta
+15 — Faturamento dentro da faixa
+10 — Instagram ativo
+10 — Site próprio
+10 — Número de funcionários adequado
+10 — Palavra-chave relevante

Mostrar:

ICP Score 94

Usar indicadores visuais discretos para:

Alto

Médio

Baixo

O sistema deve permitir futuramente editar os pesos.

PROSPECTS

Criar uma base central de prospects.

Tabela com:

Nome da empresa

Pessoa de contato

Cargo

Telefone

WhatsApp

Site

Instagram

Cidade

Estado

Nicho

ICP

ICP Score

Status

Tags

Último contato

Próxima ação

Data de criação

Permitir:

busca

filtros

ordenação

seleção múltipla

edição

exclusão

tags

importação/exportação

FICHA DO PROSPECT

Ao clicar em um prospect, abrir uma página ou painel lateral detalhado.

Estrutura:

Empresa

Nome
Nicho
Localização
Site
Instagram

Contato

Nome
Cargo
WhatsApp
Telefone
Email

Qualificação

ICP
ICP Score
Tags
Potencial
Observações

Atividades

Mostrar uma timeline:

Prospect encontrado

Adicionado ao pipeline

Mensagem enviada

Respondeu

Follow-up enviado

Reunião marcada

etc.

Adicionar campo:

Próxima ação

com data e horário.

PIPELINE

Criar um Kanban totalmente personalizável.

Etapas padrão:

Novos

→ Contatar

→ Contato realizado

→ Respondeu

→ Qualificado

→ Reunião

→ Proposta

→ Negociação

→ Ganho

→ Perdido

O usuário poderá:

criar etapas

renomear etapas

excluir etapas

alterar ordem

definir cores

arrastar prospects entre etapas

Cada card deve mostrar:

empresa

contato

ICP Score

tags

última interação

próxima ação

WHATSAPP

Criar uma área de WhatsApp integrada ao CRM.

A interface deve se parecer com uma caixa de entrada simples:

Lista de conversas à esquerda.

Conversa à direita.

No painel da conversa mostrar:

nome

empresa

estágio do pipeline

ICP Score

tags

botão para abrir ficha completa

Campo para escrever mensagem.

Botões:

enviar

templates

anexar

iniciar sequência

IMPORTANTE:

Preparar a arquitetura para integração com WhatsApp Business Platform/API oficial.

Não implementar métodos não oficiais de automação do WhatsApp.

Criar uma camada de integração isolada, como:

whatsappService

para que posteriormente seja possível conectar a API oficial sem precisar reconstruir a interface.

MENSAGENS E TEMPLATES

Criar uma área simples para mensagens salvas.

Exemplo:

Primeiro contato

"Olá, {{nome}}. Vi o trabalho da {{empresa}} e queria te fazer uma pergunta rápida."

Suportar variáveis:

{{nome}}

{{empresa}}

{{cidade}}

{{nicho}}

{{cargo}}

Permitir criar, editar, duplicar e excluir templates.

SEQUÊNCIAS

Criar um sistema simples de follow-up.

Exemplo:

Sequência: Primeiro contato

Mensagem 1
Enviar imediatamente

Mensagem 2
Esperar 2 dias

Mensagem 3
Esperar 4 dias

Mensagem 4
Esperar 7 dias

Regra:

Se o prospect responder, interromper automaticamente a sequência.

Permitir:

criar sequência

editar

ativar/desativar

adicionar/remover etapas

definir intervalo entre mensagens

Mostrar o status:

Ativa

Pausada

Finalizada

Não criar um sistema complexo de automação visual neste MVP.

CONFIGURAÇÕES

Criar:

Perfil

Nome
Email
Foto

WhatsApp

Status da conexão
Número conectado
Conectar WhatsApp

Campos personalizados

O usuário poderá criar campos personalizados para prospects.

Exemplos:

Ticket médio

Investimento em marketing

Agência atual

Potencial

Observações

Tags

Criar, editar e excluir tags.

Pipeline

Personalizar etapas.

Integrações

Preparar estrutura para:

WhatsApp

APIs de prospecção

OpenAI

Webhooks

SUPABASE

Criar estrutura inicial de banco de dados para:

users

icps

icp_criteria

prospects

contacts

pipelines

pipeline_stages

prospect_tags

tags

activities

whatsapp_conversations

whatsapp_messages

message_templates

sequences

sequence_steps

scheduled_messages

custom_fields

custom_field_values

Utilizar relacionamentos adequados.

Adicionar Row Level Security para que cada usuário visualize apenas seus próprios dados.

DADOS MOCK

Durante o desenvolvimento, utilizar dados fictícios realistas para demonstrar o funcionamento.

Exemplos:

Empresa: Imobiliária Prime
Cidade: Curitiba
Nicho: Imobiliária
ICP Score: 94
Contato: João Silva
Cargo: Diretor Comercial

Deixar extremamente claro no código onde termina o mock e onde entrará a API real.

EXPERIÊNCIA DO USUÁRIO

O fluxo principal deve ser:

Criar ICP

Fazer busca

Encontrar prospects

Selecionar prospects

Adicionar ao pipeline

Abrir prospect

Iniciar conversa

Criar sequência de follow-up

Acompanhar respostas

Mover pelo Kanban

Fechar negócio

Esse fluxo precisa ser extremamente simples.

O usuário deve conseguir entender o sistema sem tutorial.

PRINCÍPIO IMPORTANTE

NÃO transforme esse projeto em um CRM gigantesco.

O objetivo é construir uma ferramenta pessoal de prospecção que economize tempo e faça bem o trabalho principal.

Prioridades:

1. Encontrar bons prospects
2. Organizar
3. Contatar
4. Fazer follow-up
5. Acompanhar no Kanban

Todo o restante é secundário.

A arquitetura, entretanto, deve ser modular e flexível para que novas funcionalidades possam ser adicionadas posteriormente sem reconstruir o projeto.

Antes de implementar qualquer funcionalidade complexa, priorize simplicidade, estabilidade e usabilidade.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e9ad2dcd-d0a4-42dd-bae6-677bacb80583).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
