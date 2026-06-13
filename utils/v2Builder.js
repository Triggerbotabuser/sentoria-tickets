const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, SeparatorStyle,
    MessageFlags
} = require('discord.js');

const config = require('../config');

class V2Builder {

    static createContainer(color, components) {
        return new ContainerBuilder()
            .setAccentColor(color || config.colors.primary)
            .addComponents(...components);
    }

    static text(content) {
        return new TextDisplayBuilder().setContent(content);
    }

    static separator(gap = true) {
        return new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(gap ? SeparatorStyle.Gap : SeparatorStyle.Small);
    }

    static media(url) {
        return new MediaGalleryBuilder().addItems({ media: { url } });
    }

    static section(textContent, thumbnailUrl) {
        const sec = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(textContent));
        if (thumbnailUrl) {
            sec.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
        }
        return sec;
    }

    static buttons(...buttons) {
        return new ActionRowBuilder().addComponents(...buttons);
    }

    static button(customId, label, style, emoji) {
        const btn = new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(style || ButtonStyle.Secondary);
        if (emoji) btn.setEmoji(emoji);
        return btn;
    }

    static sendV2(channel, components, files) {
        const payload = {
            components: [this.createContainer(config.colors.primary, components)],
            flags: MessageFlags.IsComponentsV2,
        };
        if (files) payload.files = files;
        return channel.send(payload);
    }

    static replyV2(interaction, components, files) {
        const payload = {
            components: [this.createContainer(config.colors.primary, components)],
            flags: MessageFlags.IsComponentsV2,
        };
        if (files) payload.files = files;
        return interaction.editReply(payload);
    }

    static errorReply(interaction, message) {
        const components = [
            this.text(`## ❌ خطأ\n${message}`),
        ];
        return interaction.editReply({
            components: [this.createContainer(config.colors.danger, components)],
            flags: MessageFlags.IsComponentsV2,
        });
    }

    static successReply(interaction, message) {
        const components = [
            this.text(`## ✅ تم بنجاح\n${message}`),
        ];
        return interaction.editReply({
            components: [this.createContainer(config.colors.success, components)],
            flags: MessageFlags.IsComponentsV2,
        });
    }
}

module.exports = V2Builder;
