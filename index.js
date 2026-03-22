const Discord = require('discord.js');
const client = new Discord.Client({ intents: Discord.Intents.FLAGS.GUILDS | Discord.Intents.FLAGS.GUILD_MESSAGES | Discord.Intents.FLAGS.MESSAGE_CONTENT });
const fs = require('fs');
const path = require('path');
const config = require('./config');

client.setMaxListeners(20);

const tournaments = new Map();
const stats = new Map();
const userProfiles = new Map();
const serverConfig = new Map();
const top3Confrontos = new Map();

const MOEDA = '💰';
const CARGO_ADMIN_TORNEIO = '1345434606811484231';

function isHostOrAdmin(interaction, tournament) {
    if (interaction.user.id === tournament.host.id) return true;
    if (interaction.member?.roles?.cache?.has(CARGO_ADMIN_TORNEIO)) return true;
    return false;
}
const defaultConfig = {
    prefix: '/',
    moedaPerVitoria: 100,
    moedaPerParticipacao: 50,
    moedaPerTop3: 500,
    moedaPerCampeao: 1000,
    canal_logs: null,
    cargo_admin: null
};

// ===== PERMISSÕES =====
function canUseCommands(member) {
    try {
        if (!member || !member.guild) return false;
        const cfg = serverConfig.get(member.guild.id) || defaultConfig;
        if (!cfg.cargo_admin) return true;
        if (member.permissions && member.permissions.has('ADMINISTRATOR')) return true;
        if (member.roles && member.roles.cache && member.roles.cache.has(cfg.cargo_admin)) return true;
        return false;
    } catch (e) {
        return false;
    }
}

// ===== CARREGAR DADOS =====
function loadData() {
    const dataPath = path.join(__dirname, 'tournament_data.json');
    if (fs.existsSync(dataPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            if (data.stats) Object.keys(data.stats).forEach(k => stats.set(k, data.stats[k]));
            if (data.profiles) Object.keys(data.profiles).forEach(k => {
                const p = Object.assign({
                    userId: k, vitorias: 0, derrotas: 0, moedas: 0,
                    nivel: 1, experiencia: 0, badges: [],
                    torneiosParticipados: 0, torneiosCampeao: 0,
                    historico: [], datacriacao: new Date(), ultimoTorneio: null
                }, data.profiles[k]);
                p.datacriacao = new Date(p.datacriacao || Date.now());
                userProfiles.set(k, p);
            });
            console.log('✅ Dados carregados com sucesso');
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
        }
    }
}

// ===== SALVAR DADOS =====
function saveData() {
    const dataPath = path.join(__dirname, 'tournament_data.json');
    fs.writeFileSync(dataPath, JSON.stringify({
        stats: Object.fromEntries(stats),
        profiles: Object.fromEntries(userProfiles)
    }, null, 2));
}

// ===== PERFIL =====
function getOrCreateProfile(userId) {
    if (!userProfiles.has(userId)) {
        userProfiles.set(userId, {
            userId, vitorias: 0, derrotas: 0, moedas: 0,
            nivel: 1, experiencia: 0, badges: [],
            torneiosParticipados: 0, torneiosCampeao: 0,
            historico: [], datacriacao: new Date(), ultimoTorneio: null
        });
    }
    return userProfiles.get(userId);
}

// ===== LOG =====
async function logEvent(guild, titulo, descricao, cor = '#0099ff') {
    const cfg = serverConfig.get(guild.id) || defaultConfig;
    if (!cfg.canal_logs) return;
    try {
        const channel = await guild.channels.fetch(cfg.canal_logs);
        if (!channel) return;
        await channel.send({ embeds: [new Discord.MessageEmbed().setColor(cor).setTitle(titulo).setDescription(descricao).setTimestamp()] });
    } catch (e) {}
}

// ===== READY =====
client.on('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`
╔════════════════════════════════════════╗
║  ✅ COMANDOS REGISTRADOS COM SUCESSO! ║
║  🎮 Simulator Tournaments Bot v2.0.0   ║
║  👥 Usuarios carregados: ${client.users.cache.size}             ║
║  🏢 Servidores: ${client.guilds.cache.size}                     ║
╚════════════════════════════════════════╝
    `);
    loadData();
    client.user.setActivity('/ajuda para ver comandos', { type: 'WATCHING' });

    // Criar categorias de fases
    try {
        for (const guild of client.guilds.cache.values()) {
            const categorias = ['🎮 Fase 1', '🎮 Fase 2', '🎮 Fase 3', '🎮 Fase 4', '🏆 Decisao Top 3'];
            for (const nome of categorias) {
                const existe = guild.channels.cache.find(c => c.type === 'GUILD_CATEGORY' && c.name === nome);
                if (!existe) {
                    try {
                        await guild.channels.create(nome, {
                            type: 'GUILD_CATEGORY',
                            permissionOverwrites: [{ id: guild.id, deny: ['VIEW_CHANNEL'] }]
                        });
                    } catch (e) {}
                }
            }
        }
    } catch (e) {}

    // Registrar slash commands globalmente
    try {
        await client.application.commands.set([
                {
                    name: 'torneio',
                    description: 'Criar um novo torneio',
                    options: [
                        { name: 'formato', description: 'Formato do torneio', type: 3, required: true, choices: [
                            { name: '1v1', value: '1v1' }, { name: '2v2', value: '2v2' },
                            { name: '3v3', value: '3v3' }, { name: '4v4', value: '4v4' }
                        ]},
                        { name: 'mapa', description: 'Mapa do torneio', type: 3, required: true, choices: [
                            { name: 'Block Dash', value: 'Block Dash' },
                            { name: 'Block Dash Legendary', value: 'Block Dash Legendary' },
                            { name: 'Lava Land', value: 'Lava Land' },
                            { name: 'Laser Tracer', value: 'Laser Tracer' },
                            { name: 'Rush Hour', value: 'Rush Hour' },
                            { name: 'Bot Bash', value: 'Bot Bash' },
                            { name: 'Laser Dash', value: 'Laser Dash' },
                            { name: 'Acid Pool', value: 'Acid Pool' },
                            { name: 'Shark Muda', value: 'Shark Muda' }
                        ]},
                        { name: 'emotes', description: 'Emote do torneio', type: 3, required: true, choices: [
                            { name: 'Soco', value: 'Soco' },
                            { name: 'Soco e Rasteira', value: 'Soco e Rasteira' },
                            { name: 'Banana', value: 'Banana' },
                            { name: 'Soco e Banana', value: 'Soco e Banana' },
                            { name: 'Tetris', value: 'Tetris' },
                            { name: 'Spatula', value: 'Spatula' },
                            { name: 'Soco e Spatula', value: 'Soco e Spatula' },
                            { name: 'Soco e Bola de Neve', value: 'Soco e Bola de Neve' },
                            { name: 'Soco e Invisivel', value: 'Soco e Invisivel' },
                            { name: 'Sem Emotes', value: 'Sem Emotes' }
                        ]},
                        { name: 'vagas', description: 'Quantidade de vagas', type: 3, required: true, choices: [
                            { name: '2', value: '2' }, { name: '4', value: '4' },
                            { name: '8', value: '8' }, { name: '16', value: '16' },
                            { name: '32', value: '32' }
                        ]},
                        { name: 'nome', description: 'Nome do torneio (opcional)', type: 3, required: false },
                        { name: 'cargo', description: 'Cargo que pode entrar (opcional)', type: 8, required: false }
                    ]
                },
                {
                    name: 'config-cargo',
                    description: 'Define o cargo que pode usar os comandos',
                    options: [{ name: 'role', description: 'Cargo permitido (deixe vazio para limpar)', type: 8, required: false }]
                },
                { name: 'lista', description: 'Listar torneios ativos' },
                { name: 'cancelar', description: 'Cancelar um torneio' },
                { name: 'perfil', description: 'Ver seu perfil' },
                { name: 'rank', description: 'Ver ranking dos jogadores' },
                { name: 'stats', description: 'Ver estatisticas' },
                { name: 'ajuda', description: 'Ver ajuda dos comandos' },
                { name: 'ping', description: 'Ver ping do bot' },
                { name: 'info', description: 'Informacoes do bot' },
                { name: 'painel', description: 'Painel para configurar o proximo torneio' }
        ]);
        console.log('✅ Comandos slash registrados globalmente!');
    } catch (e) {
        console.error('❌ Erro ao registrar comandos:', e);
    }
});

// ===== SLASH COMMAND /TORNEIO =====
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName !== 'torneio') return;

    try {
        const nome = interaction.options.getString('nome') || 'Simulator Tournaments';
        const formato = interaction.options.getString('formato');
        const mapa = interaction.options.getString('mapa');
        const emotes = interaction.options.getString('emotes');
        const vagas = parseInt(interaction.options.getString('vagas'));
        const cargo = interaction.options.getRole('cargo');

        const tourId = `tour_${interaction.user.id}_${Date.now()}`;
        const tournament = {
            id: tourId, name: nome, modo: formato, mapa, emote: emotes,
            vagasTotal: vagas, vagasRestantes: vagas, jogadores: [],
            host: interaction.user, channel: interaction.channel,
            categoryId: null, fase: 1, confrontos: [], iniciado: false,
            dataInicio: null, top3: [], perdedores: [],
            cargoRestrito: cargo ? cargo.id : null, messageId: null
        };

        tournaments.set(tourId, tournament);
        await logEvent(interaction.guild, '🎮 Novo Torneio', `${interaction.user.username} criou: ${nome} (${formato})`, '#FFD700');

        const embed = new Discord.MessageEmbed()
            .setColor('#FFD700')
            .setTitle(`🏆 ${tournament.name} | BZ Winners`)
            .setDescription(`**Modo:** ${formato}\n**Mapa:** ${mapa}\n**Emotes:** ${emotes}\n\n**Vagas:** ${vagas}/${vagas}\n**Jogadores:** (0/${vagas})`)
            .setFooter({ text: `Torneio gerenciado por ${interaction.user.username}` })
            .setTimestamp();

        const row = new Discord.MessageActionRow().addComponents(
            new Discord.MessageButton().setCustomId(`entrar_${tourId}`).setLabel('Participar').setStyle('SECONDARY'),
            new Discord.MessageButton().setCustomId(`iniciar_${tourId}`).setLabel('Iniciar Torneio').setStyle('SUCCESS')
        );

        const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
        tournament.messageId = msg.id;
        await interaction.reply({ content: '✅ Torneio criado com sucesso!', ephemeral: true });
    } catch (e) {
        console.error('Erro ao criar torneio:', e);
        try { await interaction.reply({ content: '❌ Erro ao criar torneio!', ephemeral: true }); } catch (_) {}
    }
});

// ===== ATUALIZAR EMBED DO TORNEIO =====
async function atualizarEmbedTorneio(tournament) {
    try {
        const message = await tournament.channel.messages.fetch(tournament.messageId);
        const modoNum = parseInt(tournament.modo.split('v')[0]);
        let descricao = `**Modo:** ${tournament.modo}\n**Mapa:** ${tournament.mapa}\n**Emotes:** ${tournament.emote}\n\n`;

        if (modoNum === 1) {
            descricao += `**Jogadores:** (${tournament.jogadores.length}/${tournament.vagasTotal})\n`;
        } else {
            const faltam = tournament.vagasTotal - tournament.jogadores.length;
            descricao += `**Equipes:** (${Math.floor(tournament.jogadores.length / modoNum)}/${Math.floor(tournament.vagasTotal / modoNum)})\n`;
            descricao += `**Jogadores:** (${tournament.jogadores.length}/${tournament.vagasTotal}) - faltam ${faltam}\n`;
        }

        if (tournament.jogadores.length > 0) {
            descricao += '\n';
            if (modoNum === 1) {
                descricao += tournament.jogadores.map(id => `<@${id}>`).join('\n');
            } else {
                for (let i = 0, t = 1; i < tournament.jogadores.length; i += modoNum, t++) {
                    const team = tournament.jogadores.slice(i, i + modoNum);
                    if (team.length === modoNum) descricao += `**EQUIPE ${t}:** ${team.map(id => `<@${id}>`).join(', ')}\n`;
                }
            }
        }

        const embed = new Discord.MessageEmbed()
            .setColor('#FFD700')
            .setTitle(`🏆 ${tournament.name} | BZ Winners`)
            .setDescription(descricao)
            .setFooter({ text: `Torneio gerenciado por ${tournament.host.username}` })
            .setTimestamp();

        const row = new Discord.MessageActionRow().addComponents(
            new Discord.MessageButton().setCustomId(`entrar_${tournament.id}`).setLabel('Participar').setStyle('SECONDARY'),
            new Discord.MessageButton().setCustomId(`iniciar_${tournament.id}`).setLabel('Iniciar Torneio').setStyle('SUCCESS')
        );

        await message.edit({ embeds: [embed], components: [row], allowedMentions: { users: tournament.jogadores } });
    } catch (e) {
        console.error('Erro ao atualizar embed:', e);
    }
}

// ===== BOTÕES =====
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // ENTRAR NO TORNEIO
    if (interaction.customId.startsWith('entrar_')) {
        const tourId = interaction.customId.replace('entrar_', '');
        const tournament = tournaments.get(tourId);
        if (!tournament) return interaction.reply({ content: '❌ Torneio não encontrado!', ephemeral: true });

        if (tournament.iniciado) return interaction.reply({ content: '❌ O torneio já foi iniciado!', ephemeral: true });

        if (tournament.cargoRestrito) {
            const membro = await interaction.guild.members.fetch(interaction.user.id);
            if (!membro.roles.cache.has(tournament.cargoRestrito))
                return interaction.reply({ content: '❌ Você não tem o cargo necessário!', ephemeral: true });
        }

        if (tournament.jogadores.includes(interaction.user.id))
            return interaction.reply({ content: '🎉 Você já está no torneio!', ephemeral: true });

        if (tournament.vagasRestantes <= 0)
            return interaction.reply({ content: '❌ Torneio lotado!', ephemeral: true });

        const profile = getOrCreateProfile(interaction.user.id);
        profile.torneiosParticipados++;
        profile.ultimoTorneio = new Date();

        tournament.jogadores.push(interaction.user.id);
        tournament.vagasRestantes--;

        await logEvent(interaction.guild, '📝 Novo Participante', `${interaction.user.username} entrou em: ${tournament.name}`, '#00FF00');
        await atualizarEmbedTorneio(tournament);

        if (tournament.vagasRestantes === 0) {
            await interaction.channel.send({ content: `✅ Torneio lotado! <@${tournament.host.id}>, clique em **Iniciar Torneio** para começar.`, allowedMentions: { users: [tournament.host.id] } });
        }

        return interaction.reply({ content: `✅ Você entrou no torneio! (${tournament.vagasTotal - tournament.vagasRestantes}/${tournament.vagasTotal})`, ephemeral: true });
    }

    // INICIAR TORNEIO
    if (interaction.customId.startsWith('iniciar_')) {
        const tourId = interaction.customId.replace('iniciar_', '');
        const tournament = tournaments.get(tourId);
        if (!tournament) return interaction.reply({ content: '❌ Torneio não encontrado!', ephemeral: true });
        if (!isHostOrAdmin(interaction, tournament)) return interaction.reply({ content: '❌ Apenas o host pode iniciar!', ephemeral: true });
        if (tournament.iniciado) return interaction.reply({ content: '❌ Torneio já iniciado!', ephemeral: true });
        if (tournament.jogadores.length < 2) return interaction.reply({ content: '❌ Precisa de pelo menos 2 jogadores!', ephemeral: true });

        tournament.iniciado = true;
        tournament.dataInicio = new Date();

        const categoryFase1 = interaction.guild.channels.cache.find(c => c.type === 'GUILD_CATEGORY' && c.name === '🎮 Fase 1');
        tournament.categoryId = categoryFase1?.id || null;

        const embedInicio = new Discord.MessageEmbed()
            .setColor('#00FF00')
            .setTitle('✅ Torneio Iniciado!')
            .setDescription(`${tournament.jogadores.map(id => `<@${id}>`).join(' ')}\n\nO torneio **${tournament.modo}** foi iniciado!\nCriando confrontos...`)
            .addField('📊 Modo', tournament.modo, true)
            .addField('🗺️ Mapa', tournament.mapa, true)
            .addField('👥 Jogadores', `${tournament.jogadores.length}`, true)
            .setTimestamp();

        await interaction.reply({ embeds: [embedInicio], allowedMentions: { users: tournament.jogadores } });
        await logEvent(interaction.guild, '🎮 Torneio Iniciado', `"${tournament.name}" iniciado com ${tournament.jogadores.length} participantes!`, '#00FF00');
        await generatePhase(tournament, interaction.guild);
        return;
    }

    // VENCEDOR DO CONFRONTO
    if (interaction.customId.startsWith('vencedor:')) {
        const parts = interaction.customId.split(':');
        const tourId = parts[1];
        const confrontoId = parts[2];
        const jogadorId = parts[3];
        const tournament = tournaments.get(tourId);

        if (!tournament) return interaction.reply({ content: '❌ Torneio não encontrado!', ephemeral: true });
        if (!isHostOrAdmin(interaction, tournament)) return interaction.reply({ content: '❌ Apenas o host pode escolher o vencedor!', ephemeral: true });

        const confronto = tournament.confrontos.find(c => c.id === confrontoId);
        if (!confronto) return interaction.reply({ content: '❌ Confronto não encontrado!', ephemeral: true });
        if (confronto.finalizado) return interaction.reply({ content: '❌ Confronto já finalizado!', ephemeral: true });

        confronto.vencedor = jogadorId;
        confronto.finalizado = true;

        const profile = getOrCreateProfile(jogadorId);
        profile.vitorias++;
        profile.moedas += 100;

        const concluidos = tournament.confrontos.filter(c => c.fase === tournament.fase && c.finalizado).length;
        const total = tournament.confrontos.filter(c => c.fase === tournament.fase).length;

        await tournament.channel.send(`🏆 <@${jogadorId}> avançou para a próxima fase! (${concluidos}/${total} confrontos concluídos)`);
        await interaction.reply({ content: `🏆 <@${jogadorId}> venceu o confronto!`, ephemeral: false });

        // Deletar canal do confronto após 10 segundos
        if (confronto.channel) {
            await confronto.channel.send('🗑️ Este canal será excluído em **10 segundos**...');
            setTimeout(async () => {
                try { await confronto.channel.delete(); } catch (e) {}
            }, 10000);
        }

        if (tournament.confrontos.filter(c => c.fase === tournament.fase).every(c => c.finalizado)) {
            await advancarFase(tournament, interaction.guild);
        }
        return;
    }

    // VENCEDOR TOP 3
    if (interaction.customId.startsWith('vencedor_top3:')) {
        const parts = interaction.customId.split(':');
        const top3Id = parts[1];
        const buttonIndex = parseInt(parts[2]);
        const top3Data = top3Confrontos.get(top3Id);

        if (!top3Data) return interaction.reply({ content: '❌ Confronto Top 3 não encontrado!', ephemeral: true });

        const tournament = tournaments.get(top3Data.tournamentId);
        if (!tournament) return interaction.reply({ content: '❌ Torneio não encontrado!', ephemeral: true });
        if (!isHostOrAdmin(interaction, tournament)) return interaction.reply({ content: '❌ Apenas o host pode escolher!', ephemeral: true });

        const vencedorId = buttonIndex === 1 ? top3Data.jogador1 : top3Data.jogador2;
        const terceiroProfile = getOrCreateProfile(vencedorId);
        terceiroProfile.vitorias++;
        terceiroProfile.moedas += 250;

        await tournament.channel.send(`<@${vencedorId}> ficou em **3º lugar**!`);
        await interaction.reply({ content: '✅ Resultado do Top 3 registrado!', ephemeral: true });

        if (tournament.top3Confronto && tournament.top3Confronto.channel) {
            await tournament.top3Confronto.channel.send('🗑️ Este canal será excluído em **10 segundos**...');
            setTimeout(async () => {
                try { await tournament.top3Confronto.channel.delete(); } catch (e) {}
            }, 10000);
        }

        const campeaoId = top3Data.campeaoId;
        const viceId = top3Data.viceId;

        if (campeaoId) {
            const campeaoProfile = getOrCreateProfile(campeaoId);
            campeaoProfile.vitorias++;
            campeaoProfile.moedas += 1000;
            campeaoProfile.torneiosCampeao++;

            const viceProfile = getOrCreateProfile(viceId);
            viceProfile.vitorias++;
            viceProfile.moedas += 500;

            await tournament.channel.send({ embeds: [
                new Discord.MessageEmbed()
                    .setColor('#FFD700')
                    .setTitle('🏆 CAMPEAO DO TORNEIO! 🏆')
                    .setDescription(`Parabéns <@${campeaoId}>! Você é o grande campeão! 🎉`)
                    .addFields(
                        { name: 'Modo', value: tournament.modo, inline: true },
                        { name: 'Mapa', value: tournament.mapa, inline: true }
                    )
                    .setTimestamp()
            ]});

            await tournament.channel.send({ embeds: [
                new Discord.MessageEmbed()
                    .setColor('#FFD700')
                    .setTitle('🏆 TOP 3 DO TORNEIO 🏆')
                    .addFields(
                        { name: '🥇 1º Lugar', value: `<@${campeaoId}>${top3Data.recompensa1 && top3Data.recompensa1 !== '0' ? ` - ${MOEDA} ${top3Data.recompensa1}` : ''}` },
                        { name: '🥈 2º Lugar', value: `<@${viceId}>${top3Data.recompensa2 && top3Data.recompensa2 !== '0' ? ` - ${MOEDA} ${top3Data.recompensa2}` : ''}` },
                        { name: '🥉 3º Lugar', value: `<@${vencedorId}>${top3Data.recompensa3 && top3Data.recompensa3 !== '0' ? ` - ${MOEDA} ${top3Data.recompensa3}` : ''}` }
                    )
                    .setTimestamp()
            ]});

            await logEvent(interaction.guild, '🏆 Torneio Finalizado', `${tournament.name} finalizado!\n🥇 <@${campeaoId}>\n🥈 <@${viceId}>\n🥉 <@${vencedorId}>`, '#FFD700');
            saveData();
            tournaments.delete(tournament.id);
        }
        return;
    }
});

// ===== GERAR FASE DE CONFRONTOS =====
async function generatePhase(tournament, guild) {
    const jogadores = [...tournament.jogadores];
    const modoNum = parseInt(tournament.modo.split('v')[0]);
    const faseAtual = tournament.fase;
    let nomeFase = `Fase ${faseAtual}`;
    if (jogadores.length === 2) nomeFase = 'Final';
    else if (jogadores.length === 4) nomeFase = 'Semifinal';

    const confrontos = [];

    for (let i = 0; i < jogadores.length; i += modoNum * 2) {
        const equipe1 = jogadores.slice(i, i + modoNum);
        const equipe2 = jogadores.slice(i + modoNum, i + modoNum * 2);
        if (equipe1.length === 0 || equipe2.length === 0) continue;

        const confrontoId = `conf_${Date.now()}_${i}`;
        const nomeCanal = `confronto-${i / (modoNum * 2) + 1}-${nomeFase.toLowerCase().replace(/ /g, '-')}`;

        let channel;
        try {
            channel = await guild.channels.create(nomeCanal, {
                type: 'GUILD_TEXT',
                parent: tournament.categoryId,
                permissionOverwrites: [{ id: guild.id, deny: ['VIEW_CHANNEL'] }]
            });
            for (const id of [...equipe1, ...equipe2]) {
                await channel.permissionOverwrites.create(id, { VIEW_CHANNEL: true });
            }
        } catch (e) {
            console.error('Erro ao criar canal de confronto:', e);
            continue;
        }

        let labelBtn1, labelBtn2, field1, field2;
        if (modoNum === 1) {
            const u1 = await client.users.fetch(equipe1[0]);
            const u2 = await client.users.fetch(equipe2[0]);
            labelBtn1 = `Win ${u1.username}`;
            labelBtn2 = `Win ${u2.username}`;
            field1 = 'Jogador 1';
            field2 = 'Jogador 2';
        } else {
            const u1 = await client.users.fetch(equipe1[0]);
            const u2 = await client.users.fetch(equipe2[0]);
            labelBtn1 = `Win ${u1.username}`;
            labelBtn2 = `Win ${u2.username}`;
            field1 = 'Equipe 1';
            field2 = 'Equipe 2';
        }

        const embedConfronto = new Discord.MessageEmbed()
            .setColor('#FF6B00')
            .setTitle(`⚔️ Confronto - ${tournament.modo} - ${nomeFase}`)
            .addFields(
                { name: field1, value: equipe1.map(id => `<@${id}>`).join(', ') },
                { name: field2, value: equipe2.map(id => `<@${id}>`).join(', ') },
                { name: '🗺️ Mapa', value: tournament.mapa, inline: true },
                { name: '📊 Modo', value: tournament.modo, inline: true }
            )
            .setFooter({ text: `${nomeFase} | Clique no botão do vencedor` })
            .setTimestamp();

        const buttons = new Discord.MessageActionRow().addComponents(
            new Discord.MessageButton().setCustomId(`vencedor:${tournament.id}:${confrontoId}:${equipe1[0]}`).setLabel(labelBtn1).setStyle('SUCCESS'),
            new Discord.MessageButton().setCustomId(`vencedor:${tournament.id}:${confrontoId}:${equipe2[0]}`).setLabel(labelBtn2).setStyle('DANGER')
        );

        await channel.send({ embeds: [embedConfronto], components: [buttons] });

        confrontos.push({ id: confrontoId, fase: faseAtual, equipe1, equipe2, vencedor: null, finalizado: false, channel });
    }

    tournament.confrontos = confrontos;

    let descFase = `**${nomeFase}** - Confrontos criados:\n\n`;
    confrontos.forEach((c, idx) => {
        descFase += `**Confronto ${idx + 1}:** ${c.equipe1.map(id => `<@${id}>`).join(', ')} vs ${c.equipe2.map(id => `<@${id}>`).join(', ')}\n`;
    });

    await tournament.channel.send({
        embeds: [new Discord.MessageEmbed().setColor('#FF6B00').setTitle(`⚔️ ${nomeFase} - ${tournament.modo}`).setDescription(jogadores.map(id => `<@${id}>`).join(' ') + '\n\n' + descFase).setTimestamp()],
        allowedMentions: { users: jogadores }
    });
}

// ===== AVANÇAR FASE =====
async function advancarFase(tournament, guild) {
    const vencedores = tournament.confrontos.filter(c => c.fase === tournament.fase).map(c => c.vencedor);

    // Rastrear perdedores
    tournament.confrontos.filter(c => c.fase === tournament.fase).forEach(c => {
        const perdedor = c.equipe1.includes(c.vencedor) ? c.equipe2 : c.equipe1;
        perdedor.forEach(id => { if (!tournament.perdedores.includes(id)) tournament.perdedores.push(id); });
    });

    await tournament.channel.send(`🎉 **FASE ${tournament.fase} CONCLUÍDA!**\n\nPróxima fase: ${vencedores.map(id => `<@${id}>`).join(' ')}`);

    // Campeão definido
    if (vencedores.length === 1) {
        const campeaoId = vencedores[0];
        const finalConfront = tournament.confrontos.find(c => c.fase === tournament.fase);
        const viceTeam = finalConfront ? (finalConfront.equipe1.includes(campeaoId) ? finalConfront.equipe2 : finalConfront.equipe1) : [];
        const viceId = viceTeam[0] || null;
        const perdedoresSemifinal = tournament.perdedores.filter(id => id !== viceId && id !== campeaoId);

        if (perdedoresSemifinal.length >= 2) {
            // Criar canal decisão top 3
            let canalTop3;
            try {
                canalTop3 = await guild.channels.create('decisao-top-3', {
                    type: 'GUILD_TEXT',
                    parent: tournament.categoryId,
                    permissionOverwrites: [{ id: guild.id, deny: ['VIEW_CHANNEL'] }]
                });
                await canalTop3.permissionOverwrites.create(perdedoresSemifinal[0], { VIEW_CHANNEL: true });
                await canalTop3.permissionOverwrites.create(perdedoresSemifinal[1], { VIEW_CHANNEL: true });
            } catch (e) {
                console.error('Erro ao criar canal top 3:', e);
            }

            const top3Id = `top3_${Date.now()}`;
            top3Confrontos.set(top3Id, {
                tournamentId: tournament.id,
                jogador1: perdedoresSemifinal[0],
                jogador2: perdedoresSemifinal[1],
                campeaoId, viceId,
                recompensa1: tournament.recompensas?.primeiro || '1000',
                recompensa2: tournament.recompensas?.segundo || '500',
                recompensa3: tournament.recompensas?.terceiro || '250'
            });
            tournament.top3Confronto = { channel: canalTop3 };

            const u1 = await client.users.fetch(perdedoresSemifinal[0]);
            const u2 = await client.users.fetch(perdedoresSemifinal[1]);

            const embedTop3 = new Discord.MessageEmbed()
                .setColor('#FFD700')
                .setTitle('🏆 Decisão Top 3')
                .setDescription('Os perdedores da semifinal disputam o 3º lugar!')
                .addFields(
                    { name: 'Jogador 1', value: `<@${perdedoresSemifinal[0]}>` },
                    { name: 'Jogador 2', value: `<@${perdedoresSemifinal[1]}>` }
                )
                .setTimestamp();

            const btns = new Discord.MessageActionRow().addComponents(
                new Discord.MessageButton().setCustomId(`vencedor_top3:${top3Id}:1`).setLabel(`Win ${u1.username}`).setStyle('SUCCESS'),
                new Discord.MessageButton().setCustomId(`vencedor_top3:${top3Id}:2`).setLabel(`Win ${u2.username}`).setStyle('DANGER')
            );

            if (canalTop3) await canalTop3.send({ embeds: [embedTop3], components: [btns] });
        } else {
            // Sem disputa de 3º, finalizar direto
            const campeaoProfile = getOrCreateProfile(campeaoId);
            campeaoProfile.vitorias++;
            campeaoProfile.moedas += 1000;
            campeaoProfile.torneiosCampeao++;

            if (viceId) {
                const viceProfile = getOrCreateProfile(viceId);
                viceProfile.vitorias++;
                viceProfile.moedas += 500;
            }

            await tournament.channel.send({ embeds: [
                new Discord.MessageEmbed()
                    .setColor('#FFD700')
                    .setTitle('🏆 CAMPEAO DO TORNEIO! 🏆')
                    .setDescription(`Parabéns <@${campeaoId}>! Você é o grande campeão! 🎉`)
                    .addFields(
                        { name: '🥇 1º Lugar', value: `<@${campeaoId}>${tournament.recompensas?.primeiro && tournament.recompensas.primeiro !== '0' ? ` - ${MOEDA} ${tournament.recompensas.primeiro}` : ''}` },
                        { name: '🥈 2º Lugar', value: viceId ? `<@${viceId}>${tournament.recompensas?.segundo && tournament.recompensas.segundo !== '0' ? ` - ${MOEDA} ${tournament.recompensas.segundo}` : ''}` : 'N/A' }
                    )
                    .setTimestamp()
            ]});

            await logEvent(guild, '🏆 Torneio Finalizado', `${tournament.name} finalizado! Campeão: <@${campeaoId}>`, '#FFD700');
            saveData();
            tournaments.delete(tournament.id);
        }
        return;
    }

    // Próxima fase
    tournament.fase++;
    tournament.jogadores = vencedores;

    const nomeCat = `🎮 Fase ${tournament.fase}`;
    const cat = guild.channels.cache.find(c => c.type === 'GUILD_CATEGORY' && c.name === nomeCat);
    tournament.categoryId = cat?.id || tournament.categoryId;

    await generatePhase(tournament, guild);
}

// ===== SLASH COMMANDS GERAIS =====
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;
    if (commandName === 'torneio') return; // já tratado acima

    const publicCmds = ['rank', 'perfil'];

    // config-cargo
    if (commandName === 'config-cargo') {
        if (!interaction.member.permissions.has('ADMINISTRATOR') && !interaction.member.permissions.has('MANAGE_GUILD')) {
            return interaction.reply({ content: '❌ Você precisa de permissão de administrador.', ephemeral: true });
        }
        const role = interaction.options.getRole('role');
        const cfg = serverConfig.get(interaction.guild.id) || Object.assign({}, defaultConfig);
        cfg.cargo_admin = role ? role.id : null;
        serverConfig.set(interaction.guild.id, cfg);
        saveData();
        return interaction.reply({ content: `✅ Cargo configurado: ${role ? `<@&${role.id}>` : 'Nenhum (acesso aberto)'}`, ephemeral: true });
    }

    // Verificar permissão
    if (!publicCmds.includes(commandName)) {
        const cfg = serverConfig.get(interaction.guild.id) || defaultConfig;
        if (cfg.cargo_admin && !canUseCommands(interaction.member)) {
            return interaction.reply({ content: '❌ Apenas o cargo configurado pode usar este comando.', ephemeral: true });
        }
    }

    // /lista
    if (commandName === 'lista') {
        const ativos = [...tournaments.values()];
        if (ativos.length === 0) return interaction.reply({ content: '❌ Nenhum torneio ativo.', ephemeral: true });
        const embed = new Discord.MessageEmbed().setColor('#0099ff').setTitle('🎮 Torneios Ativos').setTimestamp();
        ativos.forEach(t => embed.addField(t.name, `Modo: ${t.modo} | Vagas: ${t.vagasRestantes}/${t.vagasTotal} | Iniciado: ${t.iniciado ? 'Sim' : 'Não'}`));
        return interaction.reply({ embeds: [embed] });
    }

    // /cancelar
    if (commandName === 'cancelar') {
        const tour = [...tournaments.values()].find(t => t.host.id === interaction.user.id);
        if (!tour) return interaction.reply({ content: '❌ Você não tem torneio ativo.', ephemeral: true });
        tournaments.delete(tour.id);
        return interaction.reply({ content: `✅ Torneio **${tour.name}** cancelado.` });
    }

    // /perfil
    if (commandName === 'perfil') {
        const profile = getOrCreateProfile(interaction.user.id);
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`👤 Perfil de ${interaction.user.username}`)
            .addFields(
                { name: '🏆 Vitorias', value: `${profile.vitorias}`, inline: true },
                { name: '❌ Derrotas', value: `${profile.derrotas}`, inline: true },
                { name: `${MOEDA} Moedas`, value: `${profile.moedas}`, inline: true },
                { name: '🎮 Torneios', value: `${profile.torneiosParticipados}`, inline: true },
                { name: '👑 Campeonatos', value: `${profile.torneiosCampeao}`, inline: true }
            )
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // /rank
    if (commandName === 'rank') {
        const sorted = [...userProfiles.values()].sort((a, b) => b.vitorias - a.vitorias).slice(0, 10);
        if (sorted.length === 0) return interaction.reply({ content: '❌ Nenhum jogador no ranking ainda.', ephemeral: true });
        const medals = ['🥇', '🥈', '🥉'];
        const desc = sorted.map((p, i) => `${medals[i] || `**${i + 1}.**`} <@${p.userId}> - ${p.vitorias} vitórias`).join('\n');
        const embed = new Discord.MessageEmbed().setColor('#FFD700').setTitle('🏆 Ranking Top 10').setDescription(desc).setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // /stats
    if (commandName === 'stats') {
        const total = tournaments.size;
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('📊 Estatisticas')
            .addFields(
                { name: 'Torneios Ativos', value: `${total}`, inline: true },
                { name: 'Jogadores Registrados', value: `${userProfiles.size}`, inline: true }
            )
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // /ping
    if (commandName === 'ping') {
        return interaction.reply({ content: `🏓 Pong! Latência: **${client.ws.ping}ms**` });
    }

    // /info
    if (commandName === 'info') {
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('ℹ️ Simulator Tournaments Bot')
            .setDescription('Bot para gerenciar torneios no Discord.')
            .addFields(
                { name: 'Versão', value: '2.0.0', inline: true },
                { name: 'Servidores', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'Ping', value: `${client.ws.ping}ms`, inline: true }
            )
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // /ajuda
    if (commandName === 'ajuda') {
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('📖 Ajuda - BZ Winners Bot')
            .addFields(
                { name: '🏆 Torneios', value: '`/torneio` - Criar torneio\n`/lista` - Listar torneios\n`/cancelar` - Cancelar torneio' },
                { name: '👤 Perfil', value: '`/perfil` - Ver perfil\n`/rank` - Ranking\n`/stats` - Estatisticas' },
                { name: '⚙️ Admin', value: '`/config-cargo` - Configurar cargo permitido' },
                { name: 'ℹ️ Geral', value: '`/ping` - Ping\n`/info` - Informacoes\n`/ajuda` - Esta mensagem' }
            )
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
});

// ===== PAINEL =====
const painelConfig = new Map(); // userId -> config temporária do painel

client.on('interactionCreate', async interaction => {
    // Abrir painel via slash
    if (interaction.isCommand() && interaction.commandName === 'painel') {
        const cfg = serverConfig.get(interaction.guild.id) || defaultConfig;
        if (cfg.cargo_admin && !canUseCommands(interaction.member)) {
            return interaction.reply({ content: '❌ Apenas o cargo configurado pode usar este comando.', ephemeral: true });
        }

        // Config padrão do painel
        painelConfig.set(interaction.user.id, {
            nome: 'Simulator Tournaments',
            formato: '1v1',
            mapa: 'Block Dash',
            emotes: 'Sem Emotes',
            vagas: '8',
            recompensa1: '1000',
            recompensa2: '500',
            recompensa3: '250',
            cargoRestrito: null
        });

        await interaction.reply({ embeds: [buildPainelEmbed(painelConfig.get(interaction.user.id))], components: buildPainelRows(painelConfig.get(interaction.user.id)), ephemeral: true });
        return;
    }

    if (!interaction.isSelectMenu() && !interaction.isButton()) return;

    // Handlers dos selects do painel
    const painelSelects = ['painel_formato', 'painel_mapa', 'painel_vagas'];
    if (painelSelects.includes(interaction.customId)) {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Abra o painel com /painel primeiro.', ephemeral: true });

        const val = interaction.values[0];
        if (interaction.customId === 'painel_formato') cfg.formato = val;
        if (interaction.customId === 'painel_mapa') cfg.mapa = val;
        if (interaction.customId === 'painel_vagas') cfg.vagas = val;

        return interaction.update({ embeds: [buildPainelEmbed(cfg)], components: buildPainelRows(cfg) });
    }

    // Botão alterar nome - abre modal
    if (interaction.customId === 'painel_nome') {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Abra o painel com /painel primeiro.', ephemeral: true });

        const modal = new Discord.Modal()
            .setCustomId('modal_nome_torneio')
            .setTitle('Alterar Nome do Torneio')
            .addComponents(
                new Discord.MessageActionRow().addComponents(
                    new Discord.TextInputComponent()
                        .setCustomId('input_nome')
                        .setLabel('Nome do Torneio')
                        .setStyle('SHORT')
                        .setPlaceholder('Ex: Simulator Tournaments')
                        .setValue(cfg.nome)
                        .setRequired(true)
                        .setMaxLength(50)
                )
            );

        return interaction.showModal(modal);
    }

    // Botões de recompensa - abrem modal
    const recompensaBotoes = { painel_recompensa1: '1', painel_recompensa2: '2', painel_recompensa3: '3' };

    // Botão cargo restrito - abre modal
    if (interaction.customId === 'painel_cargo') {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Abra o painel com /painel primeiro.', ephemeral: true });

        const modal = new Discord.Modal()
            .setCustomId('modal_cargo_torneio')
            .setTitle('Cargo Restrito')
            .addComponents(
                new Discord.MessageActionRow().addComponents(
                    new Discord.TextInputComponent()
                        .setCustomId('input_cargo')
                        .setLabel('ID do cargo (vazio = todos podem entrar)')
                        .setStyle('SHORT')
                        .setPlaceholder('Ex: 1234567890123456789')
                        .setValue(cfg.cargoRestrito || '')
                        .setRequired(false)
                        .setMaxLength(20)
                )
            );

        return interaction.showModal(modal);
    }

    // Botão emotes - abre modal com lista
    if (interaction.customId === 'painel_emotes') {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Abra o painel com /painel primeiro.', ephemeral: true });

        const modal = new Discord.Modal()
            .setCustomId('modal_emotes_torneio')
            .setTitle('Alterar Emotes')
            .addComponents(
                new Discord.MessageActionRow().addComponents(
                    new Discord.TextInputComponent()
                        .setCustomId('input_emotes')
                        .setLabel('Emote (veja opções abaixo)')
                        .setStyle('SHORT')
                        .setPlaceholder('Soco / Banana / Tetris / Spatula / Sem Emotes...')
                        .setValue(cfg.emotes)
                        .setRequired(true)
                        .setMaxLength(50)
                )
            );

        return interaction.showModal(modal);
    }
    const medalhas = { '1': '🥇 1º Lugar', '2': '🥈 2º Lugar', '3': '🥉 3º Lugar' };
    if (recompensaBotoes[interaction.customId]) {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Abra o painel com /painel primeiro.', ephemeral: true });

        const lugar = recompensaBotoes[interaction.customId];
        const valorAtual = cfg[`recompensa${lugar}`];

        const modal = new Discord.Modal()
            .setCustomId(`modal_recompensa_${lugar}`)
            .setTitle(`Recompensa ${medalhas[lugar]}`)
            .addComponents(
                new Discord.MessageActionRow().addComponents(
                    new Discord.TextInputComponent()
                        .setCustomId('input_recompensa')
                        .setLabel('Valor em moedas (0 = sem recompensa)')
                        .setStyle('SHORT')
                        .setPlaceholder('Ex: 1000')
                        .setValue(valorAtual)
                        .setRequired(true)
                        .setMaxLength(6)
                )
            );

        return interaction.showModal(modal);
    }

    // Botão confirmar painel
    if (interaction.customId === 'painel_confirmar') {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Abra o painel com /painel primeiro.', ephemeral: true });

        const tourId = `tour_${interaction.user.id}_${Date.now()}`;
        const vagas = parseInt(cfg.vagas);
        const tournament = {
            id: tourId, name: cfg.nome, modo: cfg.formato, mapa: cfg.mapa, emote: cfg.emotes,
            vagasTotal: vagas, vagasRestantes: vagas, jogadores: [],
            host: interaction.user, channel: interaction.channel,
            categoryId: null, fase: 1, confrontos: [], iniciado: false,
            dataInicio: null, top3: [], perdedores: [], cargoRestrito: cfg.cargoRestrito || null, messageId: null,
            recompensas: { primeiro: cfg.recompensa1, segundo: cfg.recompensa2, terceiro: cfg.recompensa3 }
        };

        tournaments.set(tourId, tournament);
        painelConfig.delete(interaction.user.id);

        const embed = new Discord.MessageEmbed()
            .setColor('#FFD700')
            .setTitle(`🏆 ${tournament.name} | BZ Winners`)
            .setDescription(
                `**Modo:** ${cfg.formato}\n**Mapa:** ${cfg.mapa}\n**Emotes:** ${cfg.emotes}\n\n` +
                `**Vagas:** ${vagas}/${vagas}\n**Jogadores:** (0/${vagas})\n\n` +
                (() => {
                    const partes = [];
                    if (cfg.recompensa1 !== '0') partes.push(`🥇 ${cfg.recompensa1}`);
                    if (cfg.recompensa2 !== '0') partes.push(`🥈 ${cfg.recompensa2}`);
                    if (cfg.recompensa3 !== '0') partes.push(`🥉 ${cfg.recompensa3}`);
                    return partes.length > 0 ? `💰 **Recompensas:** ${partes.join(' | ')}` : '';
                })()
            )
            .setFooter({ text: `Torneio gerenciado por ${interaction.user.username}` })
            .setTimestamp();

        const row = new Discord.MessageActionRow().addComponents(
            new Discord.MessageButton().setCustomId(`entrar_${tourId}`).setLabel('Participar').setStyle('SECONDARY'),
            new Discord.MessageButton().setCustomId(`iniciar_${tourId}`).setLabel('Iniciar Torneio').setStyle('SUCCESS')
        );

        const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
        tournament.messageId = msg.id;

        await interaction.update({ content: '✅ Torneio criado com sucesso!', embeds: [], components: [] });
        return;
    }

    // Botão cancelar painel
    if (interaction.customId === 'painel_cancelar') {
        painelConfig.delete(interaction.user.id);
        return interaction.update({ content: '❌ Painel cancelado.', embeds: [], components: [] });
    }
});

// ===== MODAL SUBMIT =====
client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'modal_nome_torneio') {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Sessão do painel expirou. Use /painel novamente.', ephemeral: true });

        cfg.nome = interaction.fields.getTextInputValue('input_nome');
        return interaction.reply({ embeds: [buildPainelEmbed(cfg)], components: buildPainelRows(cfg), ephemeral: true });
    }

    if (interaction.customId.startsWith('modal_recompensa_')) {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Sessão do painel expirou. Use /painel novamente.', ephemeral: true });

        const lugar = interaction.customId.replace('modal_recompensa_', '');
        const valor = interaction.fields.getTextInputValue('input_recompensa').replace(/\D/g, '') || '0';
        cfg[`recompensa${lugar}`] = valor;

        return interaction.reply({ embeds: [buildPainelEmbed(cfg)], components: buildPainelRows(cfg), ephemeral: true });
    }

    if (interaction.customId === 'modal_emotes_torneio') {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Sessão do painel expirou. Use /painel novamente.', ephemeral: true });

        cfg.emotes = interaction.fields.getTextInputValue('input_emotes');
        return interaction.reply({ embeds: [buildPainelEmbed(cfg)], components: buildPainelRows(cfg), ephemeral: true });
    }

    if (interaction.customId === 'modal_cargo_torneio') {
        const cfg = painelConfig.get(interaction.user.id);
        if (!cfg) return interaction.reply({ content: '❌ Sessão do painel expirou. Use /painel novamente.', ephemeral: true });

        const valor = interaction.fields.getTextInputValue('input_cargo').trim();
        cfg.cargoRestrito = valor || null;
        return interaction.reply({ embeds: [buildPainelEmbed(cfg)], components: buildPainelRows(cfg), ephemeral: true });
    }
});

function buildPainelEmbed(cfg) {
    return new Discord.MessageEmbed()
        .setColor('#FFD700')
        .setTitle('⚙️ Painel - Configurar Torneio')
        .setDescription('Configure as opções abaixo e clique em **Confirmar** para criar o torneio.')
        .addFields(
            { name: '📛 Nome', value: cfg.nome, inline: true },
            { name: '📊 Formato', value: cfg.formato, inline: true },
            { name: '🗺️ Mapa', value: cfg.mapa, inline: true },
            { name: '🎮 Emotes', value: cfg.emotes, inline: true },
            { name: '👥 Vagas', value: cfg.vagas, inline: true },
            { name: '🥇 1º Lugar', value: cfg.recompensa1 === '0' ? 'Sem recompensa' : `💰 ${cfg.recompensa1}`, inline: true },
            { name: '🥈 2º Lugar', value: cfg.recompensa2 === '0' ? 'Sem recompensa' : `💰 ${cfg.recompensa2}`, inline: true },
            { name: '🥉 3º Lugar', value: cfg.recompensa3 === '0' ? 'Sem recompensa' : `💰 ${cfg.recompensa3}`, inline: true },
            { name: '🎭 Cargo Restrito', value: cfg.cargoRestrito ? `<@&${cfg.cargoRestrito}>` : 'Todos podem entrar', inline: true }
        )
        .setTimestamp();
}

function buildPainelRows(cfg) {
    const row1 = new Discord.MessageActionRow().addComponents(
        new Discord.MessageSelectMenu().setCustomId('painel_formato').setPlaceholder('Formato').addOptions([
            { label: '1v1', value: '1v1' }, { label: '2v2', value: '2v2' },
            { label: '3v3', value: '3v3' }, { label: '4v4', value: '4v4' }
        ])
    );
    const row2 = new Discord.MessageActionRow().addComponents(
        new Discord.MessageSelectMenu().setCustomId('painel_mapa').setPlaceholder('Mapa').addOptions([
            { label: 'Block Dash', value: 'Block Dash' },
            { label: 'Block Dash Legendary', value: 'Block Dash Legendary' },
            { label: 'Lava Land', value: 'Lava Land' },
            { label: 'Laser Tracer', value: 'Laser Tracer' },
            { label: 'Rush Hour', value: 'Rush Hour' },
            { label: 'Bot Bash', value: 'Bot Bash' },
            { label: 'Laser Dash', value: 'Laser Dash' },
            { label: 'Acid Pool', value: 'Acid Pool' },
            { label: 'Shark Muda', value: 'Shark Muda' }
        ])
    );
    const row3 = new Discord.MessageActionRow().addComponents(
        new Discord.MessageSelectMenu().setCustomId('painel_vagas').setPlaceholder('Vagas').addOptions([
            { label: '2 vagas', value: '2' }, { label: '4 vagas', value: '4' },
            { label: '8 vagas', value: '8' }, { label: '16 vagas', value: '16' },
            { label: '32 vagas', value: '32' }
        ])
    );
    const row4 = new Discord.MessageActionRow().addComponents(
        new Discord.MessageButton().setCustomId('painel_nome').setLabel(`✏️ ${cfg.nome.substring(0, 15)}`).setStyle('PRIMARY'),
        new Discord.MessageButton().setCustomId('painel_emotes').setLabel(`🎮 ${cfg.emotes.substring(0, 15)}`).setStyle('SECONDARY'),
        new Discord.MessageButton().setCustomId('painel_recompensa1').setLabel(`🥇 ${cfg.recompensa1 === '0' ? 'Sem' : cfg.recompensa1}`).setStyle('SECONDARY'),
        new Discord.MessageButton().setCustomId('painel_recompensa2').setLabel(`🥈 ${cfg.recompensa2 === '0' ? 'Sem' : cfg.recompensa2}`).setStyle('SECONDARY'),
        new Discord.MessageButton().setCustomId('painel_recompensa3').setLabel(`🥉 ${cfg.recompensa3 === '0' ? 'Sem' : cfg.recompensa3}`).setStyle('SECONDARY')
    );
    const row5 = new Discord.MessageActionRow().addComponents(
        new Discord.MessageButton().setCustomId('painel_confirmar').setLabel('✅ Confirmar e Criar').setStyle('SUCCESS'),
        new Discord.MessageButton().setCustomId('painel_cargo').setLabel(`🎭 Cargo: ${cfg.cargoRestrito ? cfg.cargoRestrito : 'Todos'}`).setStyle('SECONDARY'),
        new Discord.MessageButton().setCustomId('painel_cancelar').setLabel('❌ Cancelar').setStyle('DANGER')
    );
    return [row1, row2, row3, row4, row5];
}

// ===== LOGIN =====
client.login(config.TOKEN);
