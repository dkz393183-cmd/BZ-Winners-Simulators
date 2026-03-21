# 🎮 Simulator Tournaments Bot

Um bot Discord completo para gerenciar torneios de simulador com sistema de ranking, moedas, níveis, clãs, minigames e muito mais!

## ✨ Funcionalidades Principais

### 🏆 Sistema de Torneios
- Criar torneios com customização completa (nome, modo, mapa, emote, vagas)
- Suporte para múltiplos modos (1v1 até 5v5)
- Sistema de fases automático (Fase 1, Semifinal, Final)
- Criação automática de canais para cada confronto
- Seleção de vencedor apenas pelo host

### 💰 Sistema de Economia
- Moedas por vitória, participação e prêmios
- Transferência de moedas entre jogadores
- Loja com itens customizáveis
- Sistema de apostas

### 📊 Ranking e Estatísticas
- Ranking global de jogadores
- Perfil customizado com estatísticas
- Leaderboard com scoring
- Histórico de torneios

### ⭐ Sistema de Níveis
- Experiência por vitória e participação
- Subida de nível automática
- Emblemas desbloqueáveis

### 🏢 Sistema de Clãs
- Criação de clãs com tag
- Membros e hierarquia
- Experiência de clã

### 🎮 Minigames
- Invasão (risco/recompensa)
- Mineração (busca de itens)
- Duelos rápidos entre jogadores
- Speedrun
- Missões aleatórias

### 👕 Sistema de Skins
- Skins customizáveis (Guerreiro, Mago, Assassino, Dragão, Anjo)
- Compra com moedas

### 🎁 Bônus Diários
- Prêmio diário de moedas e XP
- Sistema de Daily com cooldown de 24h

## 🚀 Instalação

### Pré-requisitos
- Node.js v16.0.0+
- npm v8.0.0+
- Token do Discord Bot

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/simulator-tournaments-bot.git
cd simulator-tournaments-bot
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

4. **Edite o arquivo `.env` com suas configurações**
```env
BOT_TOKEN=seu_token_aqui
GUILD_ID=seu_guild_id
LOG_CHANNEL_ID=seu_canal_logs
BOT_OWNER_ID=seu_id
```

5. **Inicie o bot**
```bash
npm start
```

## 📝 Variáveis de Ambiente

Veja [.env.example](.env.example) para todas as variáveis disponíveis:

### Principais
- `BOT_TOKEN` - Token do Discord Bot (OBRIGATÓRIO)
- `BOT_PREFIX` - Prefixo dos comandos (padrão: /)
- `DEBUG_MODE` - Habilitar logs detalhados

### Recompensas
- `COINS_PER_WIN` - Moedas por vitória
- `COINS_CHAMPION` - Moedas para campeão
- `XP_PER_WIN` - XP por vitória

### Limites
- `MAX_TOURNAMENTS_PER_DAY` - Máximo de torneios por dia
- `TIMEOUT_CHOOSE_WINNER` - Tempo para escolher vencedor

## 📖 Comandos

### 🏆 Torneios
- `/torneio [nome] [modo] [mapa] [emote] [vagas]` - Criar torneio
- `/lista` - Listar torneios ativos
- `/cancelar` - Cancelar torneio

### 👤 Perfil e Stats
- `/perfil [@usuario]` - Ver perfil
- `/rank` - Ver ranking
- `/stats [@usuario]` - Estatísticas
- `/badges [@usuario]` - Emblemas
- `/trophy` - Troféus

### 💰 Economia
- `/daily` - Prêmio diário
- `/aposta [valor]` - Apostar moedas
- `/transferir @usuario [valor]` - Transferir moedas
- `/loja` - Ver loja
- `/comprar-skin [número]` - Comprar skin

### 🎮 Minigames
- `/invasao` - Invasão
- `/minergame` - Mineração
- `/duelo @usuario` - Duelo
- `/speedrun` - Speedrun
- `/quest` - Missão

### 🏢 Clãs
- `/clan create [nome]` - Criar clã
- `/clan list` - Listar clãs

### 👥 Social
- `/amigos` - Listar amigos
- `/amigos add @usuario` - Adicionar amigo

### ⚙️ Admin
- `/addwin @usuario` - Adicionar vitória
- `/remwin @usuario` - Remover vitória
- `/reset-rank` - Resetar ranking
- `/config-moedas [valor]` - Config moedas
- `/config-canal-logs [canal]` - Config logs
- `/moderar mute @usuario` - Silenciar
- `/moderar kick @usuario` - Expulsar

### 📊 Informações
- `/ajuda` - Ver ajuda
- `/info` - Informações do bot
- `/ping` - Ping do bot
- `/suporte` - Suporte
- `/leaderboard` - Leaderboard
- `/premios` - Prêmios
- `/servidor-stats` - Stats do servidor
- `/top10` - Top 10 jogadores

## 📁 Estrutura do Projeto

```
simulator-tournaments-bot/
├── index.js              # Arquivo principal do bot
├── config.js             # Configurações do bot
├── package.json          # Dependências
├── .env                  # Variáveis de ambiente (GITIGNORE)
├── .env.example          # Template de variáveis
├── .gitignore            # Arquivos ignorados no git
├── tournament_data.json  # Dados dos torneios (GITIGNORE)
└── README.md             # Este arquivo
```

## 🔧 Configuração Avançada

### Cores Customizadas
Edite no `.env`:
```env
COLOR_SUCCESS=#00FF00
COLOR_ERROR=#FF0000
COLOR_WARNING=#FFD700
COLOR_INFO=#0099ff
```

### Emojis Customizados
```env
EMOJI_COIN=💰
EMOJI_STAR=⭐
EMOJI_TROPHY=🏆
EMOJI_MEDAL=🥇
```

### Features
```env
ENABLE_CLANS=true
ENABLE_MINIGAMES=true
ENABLE_SKINS=true
ENABLE_DUELS=true
```

## 📊 Desenvolvimento

Para desenvolvimento com hot reload:
```bash
npm run dev
```

## 📝 Logs

Os logs são salvos em `logs/` (se DEBUG_MODE=true)

## 🤝 Contribuindo

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## ⚠️ Disclaimer

Este bot é fornecido como está. Use por sua conta e risco. O criador não é responsável por qualquer dano ou uso indevido.

## 💬 Suporte

Para suporte, contate o dono do bot ou abra uma issue no repositório.

## 🎉 Agradecimentos

- Discord.js
- Comunidade Discord
- Todos os contribuidores

---

**Versão:** 2.0.0  
**Autor:** Seu Nome  
**Última atualização:** Janeiro 2026
