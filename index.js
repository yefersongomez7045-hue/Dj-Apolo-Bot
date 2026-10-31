const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType, 
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Función auxiliar para enviar registros al canal de logs automáticamente
async function sendModLog(guild, embed) {
    const logChannel = guild.channels.cache.find(c => c.name === 'registro-moderacion');
    if (logChannel && logChannel.type === ChannelType.GuildText) {
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

// ==========================================
// REGISTRO DE COMANDOS SLASH
// ==========================================
const commands = [
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea un mensaje embed personalizado')
        .addStringOption(opt => opt.setName('titulo').setDescription('Título del embed').setRequired(true))
        .addStringOption(opt => opt.setName('descripcion').setDescription('Texto principal del embed').setRequired(true))
        .addStringOption(opt => opt.setName('color').setDescription('Color HEX (ej: #3498db)').setRequired(false))
        .addStringOption(opt => opt.setName('imagen').setDescription('URL de la imagen (opcional)').setRequired(false)),

    new SlashCommandBuilder()
        .setName('send-ticket-panel')
        .setDescription('Envía el panel fijo de tickets a este canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón del baneo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Desbanea a un usuario mediante su ID')
        .addStringOption(opt => opt.setName('userid').setDescription('ID del usuario a desbanear').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Silencia temporalmente a un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
        .addIntegerOption(opt => opt.setName('minutos').setDescription('Tiempo en minutos').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón del silencio').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remueve el silencio de un miembro')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a quitar el silencio').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia mensajes de un canal')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de mensajes (1-100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte formalmente a un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo de la advertencia').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`¡Bot conectado como ${client.user.tag}!`);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Comandos y sistema de registros configurados con éxito.');
    } catch (error) {
        console.error('Error al registrar comandos:', error);
    }
});

// ==========================================
// MANEJO DE INTERACCIONES Y COMANDOS
// ==========================================
client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // 1. Comando /embed
        if (commandName === 'embed') {
            await interaction.deferReply();

            const titulo = interaction.options.getString('titulo');
            const descripcion = interaction.options.getString('descripcion');
            let colorInput = interaction.options.getString('color') || '#3498db';
            const imagen = interaction.options.getString('imagen');

            if (!colorInput.startsWith('#')) {
                colorInput = '#' + colorInput;
            }

            const embed = new EmbedBuilder()
                .setTitle(titulo)
                .setDescription(descripcion)
                .setColor(colorInput)
                .setTimestamp()
                .setFooter({ text: `Enviado por ${interaction.user.tag}` });

            if (imagen) {
                embed.setThumbnail(imagen);
            }

            await interaction.editReply({ embeds: [embed] });
        }

        // 2. Comando /send-ticket-panel
        else if (commandName === 'send-ticket-panel') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('Selecciona el motivo de tu consulta...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Soporte General').setDescription('Dudas generales').setValue('soporte').setEmoji('🛠️'),
                    new StringSelectMenuOptionBuilder().setLabel('Reporte de Usuario').setDescription('Denuncia un mal comportamiento').setValue('reporte').setEmoji('🚨'),
                    new StringSelectMenuOptionBuilder().setLabel('Otra Consulta').setDescription('Asuntos comerciales o de otro tipo').setValue('otros').setEmoji('📩')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const panelEmbed = new EmbedBuilder()
                .setTitle('🎫 Central de Soporte y Atención')
                .setDescription('Para abrir una consulta privada con el equipo de soporte, selecciona la categoría correspondiente en el menú desplegable inferior.')
                .setColor('#2b2d31');

            await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
            await interaction.reply({ content: '✅ Panel de tickets enviado a este canal.', ephemeral: true });
        }

        // 3. Comando /kick
        else if (commandName === 'kick') {
            await interaction.deferReply({ ephemeral: true });
            const target = interaction.options.getUser('usuario');
            const razon = interaction.options.getString('razon') || 'Sin razón especificada';
            const member = interaction.guild.members.cache.get(target.id);

            if (!member) return interaction.editReply({ content: 'Usuario no encontrado.' });
            if (!member.kickable) return interaction.editReply({ content: 'No tengo suficientes permisos para expulsar a este usuario.' });

            try {
                await member.kick(razon);
                await interaction.editReply({ content: `👢 **${target.tag}** ha sido expulsado.` });

                const logEmbed = new EmbedBuilder()
                    .setTitle('👢 Usuario Expulsado (Kick)')
                    .setColor('#e67e22')
                    .addFields(
                        { name: 'Usuario', value: `${target.tag} (\`${target.id}\`)` },
                        { name: 'Moderador', value: `${interaction.user.tag}` },
                        { name: 'Razón', value: razon }
                    )
                    .setTimestamp();
                await sendModLog(interaction.guild, logEmbed);
            } catch (err) {
                await interaction.editReply({ content: '❌ Ocurrió un error al intentar expulsar al usuario.' });
            }
        }

        // 4. Comando /ban
        else if (commandName === 'ban') {
            await interaction.deferReply({ ephemeral: true });
            const target = interaction.options.getUser('usuario');
            const razon = interaction.options.getString('razon') || 'Sin razón especificada';

            try {
                await interaction.guild.members.ban(target, { reason: razon });
                await interaction.editReply({ content: `🔨 **${target.tag}** ha sido baneado.` });

                const logEmbed = new EmbedBuilder()
                    .setTitle('🔨 Usuario Baneado (Ban)')
                    .setColor('#e74c3c')
                    .addFields(
                        { name: 'Usuario', value: `${target.tag} (\`${target.id}\`)` },
                        { name: 'Moderador', value: `${interaction.user.tag}` },
                        { name: 'Razón', value: razon }
                    )
                    .setTimestamp();
                await sendModLog(interaction.guild, logEmbed);
            } catch (err) {
                await interaction.editReply({ content: '❌ Ocurrió un error al intentar banear al usuario.' });
            }
        }

        // 5. Comando /unban
        else if (commandName === 'unban') {
            await interaction.deferReply({ ephemeral: true });
            const userId = interaction.options.getString('userid');
            try {
                const user = await client.users.fetch(userId);
                await interaction.guild.members.unban(userId);
                await interaction.editReply({ content: `🔓 El usuario con ID \`${userId}\` ha sido desbaneado.` });

                const logEmbed = new EmbedBuilder()
                    .setTitle('🔓 Usuario Desbaneado (Unban)')
                    .setColor('#2ecc71')
                    .addFields(
                        { name: 'Usuario', value: `${user.tag} (\`${userId}\`)` },
                        { name: 'Moderador', value: `${interaction.user.tag}` }
                    )
                    .setTimestamp();
                await sendModLog(interaction.guild, logEmbed);
            } catch (err) {
                await interaction.editReply({ content: 'No se pudo encontrar un baneo activo para esa ID.' });
            }
        }

        // 6. Comando /timeout (Mute)
        else if (commandName === 'timeout') {
            await interaction.deferReply({ ephemeral: true });

            const target = interaction.options.getUser('usuario');
            const minutos = interaction.options.getInteger('minutos');
            const razon = interaction.options.getString('razon') || 'Sin razón especificada';
            const member = interaction.guild.members.cache.get(target.id);

            if (!member) {
                return interaction.editReply({ content: 'Usuario no encontrado en este servidor.' });
            }

            try {
                await member.timeout(minutos * 60 * 1000, razon);
                await interaction.editReply({ content: `🔇 **${target.tag}** ha sido silenciado correctamente por ${minutos} minuto(s).` });

                const logEmbed = new EmbedBuilder()
                    .setTitle('🔇 Usuario Silenciado (Timeout)')
                    .setColor('#f39c12')
                    .addFields(
                        { name: 'Usuario', value: `${target.tag} (\`${target.id}\`)` },
                        { name: 'Duración', value: `${minutos} minutos` },
                        { name: 'Moderador', value: `${interaction.user.tag}` },
                        { name: 'Razón', value: razon }
                    )
                    .setTimestamp();
                await sendModLog(interaction.guild, logEmbed);

            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ No pude silenciar a este usuario. Asegúrate de que mi rol esté por encima del suyo.' });
            }
        }

        // 7. Comando /untimeout (Unmute)
        else if (commandName === 'untimeout') {
            await interaction.deferReply({ ephemeral: true });
            const target = interaction.options.getUser('usuario');
            const member = interaction.guild.members.cache.get(target.id);

            if (!member) return interaction.editReply({ content: 'Usuario no encontrado.' });

            try {
                await member.timeout(null);
                await interaction.editReply({ content: `🔊 Silencio removido a **${target.tag}**.` });

                const logEmbed = new EmbedBuilder()
                    .setTitle('🔊 Silencio Removido (Untimeout)')
                    .setColor('#3498db')
                    .addFields(
                        { name: 'Usuario', value: `${target.tag} (\`${target.id}\`)` },
                        { name: 'Moderador', value: `${interaction.user.tag}` }
                    )
                    .setTimestamp();
                await sendModLog(interaction.guild, logEmbed);
            } catch (err) {
                await interaction.editReply({ content: '❌ No se pudo quitar el silencio al usuario.' });
            }
        }

        // 8. Comando /clear
        else if (commandName === 'clear') {
            await interaction.deferReply({ ephemeral: true });
            const cantidad = interaction.options.getInteger('cantidad');

            if (cantidad < 1 || cantidad > 100) {
                return interaction.editReply({ content: 'Ingresa un valor entre 1 y 100.' });
            }

            try {
                const deleted = await interaction.channel.bulkDelete(cantidad, true);
                await interaction.editReply({ content: `🧹 Se han eliminado **${deleted.size}** mensajes.` });

                const logEmbed = new EmbedBuilder()
                    .setTitle('🧹 Mensajes Limpiados (Clear)')
                    .setColor('#95a5a6')
                    .addFields(
                        { name: 'Canal', value: `${interaction.channel}` },
                        { name: 'Cantidad', value: `${deleted.size} mensajes` },
                        { name: 'Moderador', value: `${interaction.user.tag}` }
                    )
                    .setTimestamp();
                await sendModLog(interaction.guild, logEmbed);
            } catch (err) {
                await interaction.editReply({ content: '❌ No se pudieron borrar los mensajes (es posible que sean más antiguos de 14 días).' });
            }
        }

        // 9. Comando /warn
        else if (commandName === 'warn') {
            await interaction.deferReply();
            const target = interaction.options.getUser('usuario');
            const razon = interaction.options.getString('razon');

            const warnEmbed = new EmbedBuilder()
                .setTitle('⚠️ Advertencia Registrada')
                .setColor('#f1c40f')
                .addFields(
                    { name: 'Usuario', value: `${target.tag} (${target.id})` },
                    { name: 'Moderador', value: `${interaction.user.tag}` },
                    { name: 'Motivo', value: razon }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [warnEmbed] });
            target.send({ content: `Has recibido una advertencia en el servidor **${interaction.guild.name}**. Motivo: ${razon}` }).catch(() => {});
            
            await sendModLog(interaction.guild, warnEmbed);
        }
    }

    // --- MANEJO DE TICKETS Y LOGS DE CIERRE ---
    else if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const opcion = interaction.values[0];
        const guild = interaction.guild;
        const user = interaction.user;

        const existingChannel = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase()}`);
        if (existingChannel) {
            return interaction.reply({ content: `⚠️ Ya posees un ticket abierto en ${existingChannel}`, ephemeral: true });
        }

        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
            ],
        });

        const buttonsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('transcript_ticket').setLabel('Guardar Registro').setEmoji('📄').setStyle(ButtonStyle.Secondary)
        );

        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`Ticket de ${user.username}`)
            .setDescription(`**Categoría:** ${opcion.toUpperCase()}\n\nHola <@${user.id}>, describe tu consulta detalladamente. El equipo de moderación responderá en breve.`)
            .setColor('#2b2d31')
            .setTimestamp();

        await ticketChannel.send({ content: `<@${user.id}>`, embeds: [welcomeEmbed], components: [buttonsRow] });
        await interaction.reply({ content: `✅ Ticket creado exitosamente: ${ticketChannel}`, ephemeral: true });

        // Log de creación de ticket
        const ticketLog = new EmbedBuilder()
            .setTitle('🎫 Ticket Creado')
            .setColor('#1abc9c')
            .addFields(
                { name: 'Usuario', value: `${user.tag}` },
                { name: 'Canal', value: `${ticketChannel.name}` },
                { name: 'Categoría', value: opcion.toUpperCase() }
            )
            .setTimestamp();
        await sendModLog(guild, ticketLog);
    }

    else if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: '🔒 Este ticket se cerrará y eliminará en 5 segundos...' });

            // Log de cierre de ticket
            const closeLog = new EmbedBuilder()
                .setTitle('🔒 Ticket Cerrado')
                .setColor('#c0392b')
                .addFields(
                    { name: 'Canal', value: `${interaction.channel.name}` },
                    { name: 'Cerrado por', value: `${interaction.user.tag}` }
                )
                .setTimestamp();
            await sendModLog(interaction.guild, closeLog);

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }

        else if (interaction.customId === 'transcript_ticket') {
            await interaction.deferReply({ ephemeral: true });

            const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
            const logContent = fetchedMessages
                .map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`)
                .reverse()
                .join('\n');

            const buffer = Buffer.from(logContent, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `${interaction.channel.name}-log.txt` });

            await interaction.editReply({ content: '📄 Aquí tienes el historial completo del ticket:', files: [attachment] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

