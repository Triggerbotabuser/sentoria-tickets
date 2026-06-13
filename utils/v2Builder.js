const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, SectionBuilder, ThumbnailBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');

const config = require('../config');

class V2Builder {

    static text(content) {
        return new TextDisplayBuilder().setContent(content);
    }

    static separator(gap = true) {
        return new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(gap ? 1 : 0);
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

    static buildContainer(color, components) {
        const container = new ContainerBuilder();
        if (color) container.setAccentColor(color);


        for (const comp of components) {
            if (comp instanceof TextDisplayBuilder) {
                container.addTextDisplayComponents(comp);
            } else if (comp instanceof SeparatorBuilder) {
                container.addSeparatorComponents(comp);
            } else if (comp instanceof MediaGalleryBuilder) {
                container.addMediaGalleryComponents(comp);
            } else if (comp instanceof SectionBuilder) {
                container.addSectionComponents(comp);
            } else if (comp instanceof ActionRowBuilder) {
                container.addActionRowComponents(comp);
            }
        }

        return container;
    }

    static sendV2(channel, color, components, files) {
        const payload = {
            components: [this.buildContainer(color, components)],
            flags: MessageFlags.IsComponentsV2,
        };
        if (files) payload.files = files;
        return channel.send(payload);
    }

    static replyV2(interaction, color, components, files) {
        const payload = {
            components: [this.buildContainer(color, components)],
            flags: MessageFlags.IsComponentsV2,
        };
        if (files) payload.files = files;
        return interaction.editReply(payload);
    }

    static errorReply(interaction, message) {
        return interaction.editReply({
            components: [this.buildContainer(config.colors.danger, [this.text(`## ❌ خطأ\n${message}`)])],
            flags: MessageFlags.IsComponentsV2,
        });
    }

    static successReply(interaction, message) {
        return interaction.editReply({
            components: [this.buildContainer(config.colors.success, [this.text(`## ✅ تم بنجاح\n${message}`)])],
            flags: MessageFlags.IsComponentsV2,
        });
    }
}

module.exports = V2Builder;
