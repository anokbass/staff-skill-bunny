import { logger } from "@vendetta";
import { findByName, findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative, clipboard } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { Forms } from "@vendetta/ui/components";
import { showConfirmationAlert, showInputAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import { findInReactTree } from "@vendetta/utils";
import { initStorage, storage } from "./storage";
import Settings from "./Settings";

type AnyObject = Record<string, any>;

let active = false;
let unpatchOpenLazy: (() => void) | null = null;
const unpatches: Array<() => void> = [];

function asId(value: unknown): string {
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function currentUserId(): string {
    try {
        return asId((findByStoreName("UserStore") as AnyObject)?.getCurrentUser?.()?.id);
    } catch {
        return "";
    }
}

function channelGuildId(channelId: string): string {
    try {
        const channel = (findByStoreName("ChannelStore") as AnyObject)?.getChannel?.(channelId);
        return asId(channel?.guild_id ?? channel?.guildId);
    } catch {
        return "";
    }
}

function hideActionSheet(): void {
    try {
        findByProps("hideActionSheet")?.hideActionSheet?.();
    } catch (error) {
        logger.error("[Staff Skill] Could not close the action sheet:", error);
    }
}

function copyText(value: string, what: string): void {
    try {
        clipboard.setString(value);
        showToast(`${what} copiado.`);
    } catch (error) {
        logger.error("[Staff Skill] Clipboard failed:", error);
        showToast("Não foi possível copiar neste cliente.");
    }
}

function findMessage(args: any[]): AnyObject | undefined {
    for (const value of args ?? []) {
        if (value?.message?.id && value.message.channel_id) return value.message;
        if (value?.id && value?.channel_id && value?.author?.id) return value;
    }
    return undefined;
}

function findUser(value: any, depth = 0, seen = new Set<any>()): AnyObject | undefined {
    if (!value || typeof value !== "object" || depth > 4 || seen.has(value)) return undefined;
    seen.add(value);
    if (value.id && (value.username || value.global_name || value.getAvatarURL || value.avatar !== undefined)) return value;
    for (const key of ["user", "member", "targetUser", "author", "recipient", "target"]) {
        const found = findUser(value[key], depth + 1, seen);
        if (found) return found;
    }
    for (const key of ["props", "args", "data", "item"]) {
        const found = findUser(value[key], depth + 1, seen);
        if (found) return found;
    }
    return undefined;
}

function findUserId(value: any, depth = 0, seen = new Set<any>()): string {
    if (!value || typeof value !== "object" || depth > 4 || seen.has(value)) return "";
    seen.add(value);
    for (const key of ["userId", "user_id", "targetUserId", "authorId"]) {
        const id = asId(value[key]);
        if (id) return id;
    }
    for (const key of ["props", "args", "data", "item", "member", "user", "targetUser"]) {
        const id = findUserId(value[key], depth + 1, seen);
        if (id) return id;
    }
    return "";
}

function getUserForSheet(args: any[], message?: AnyObject): AnyObject | undefined {
    if (message?.author?.id) return message.author;
    for (const arg of args ?? []) {
        const user = findUser(arg);
        if (user) return user;
    }
    const userId = args.map((arg) => findUserId(arg)).find(Boolean);
    if (userId) {
        try {
            return (findByStoreName("UserStore") as AnyObject)?.getUser?.(userId);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function getGuildId(args: any[], message?: AnyObject): string {
    const direct = asId(message?.guild_id ?? message?.guildId);
    if (direct) return direct;
    const channelId = asId(message?.channel_id ?? message?.channelId);
    if (channelId) return channelGuildId(channelId);
    for (const arg of args ?? []) {
        const guildId = asId(arg?.guildId ?? arg?.guild_id ?? arg?.guild?.id ?? arg?.channel?.guild_id);
        if (guildId) return guildId;
    }
    return "";
}

function displayName(user: AnyObject): string {
    return String(user?.global_name ?? user?.username ?? user?.tag ?? "este usuário");
}

async function banUser(guildId: string, user: AnyObject): Promise<void> {
    const userId = asId(user?.id);
    if (!guildId || !userId) {
        showToast("Banir só está disponível para um membro em um servidor.");
        return;
    }
    if (userId === currentUserId()) {
        showToast("O Staff Skill não permite banir sua própria conta.");
        return;
    }

    const actions = findByProps("banUser", "kickUser") as AnyObject;
    if (typeof actions?.banUser !== "function") {
        showToast("A API de ban deste cliente não foi encontrada.");
        return;
    }

    showInputAlert({
        title: `Banir ${displayName(user)}?`,
        confirmText: "Banir usuário",
        confirmColor: "red" as any,
        cancelText: "Cancelar",
        placeholder: "Motivo do ban (opcional)",
        onConfirm: async (reason: string) => {
            try {
                // Esta chamada só ocorre após o moderador confirmar no alerta. O servidor
                // continua aplicando as permissões e a hierarquia de cargos normalmente.
                await actions.banUser(guildId, userId, String(reason ?? "").trim());
                showToast(`${displayName(user)} foi banido.`);
            } catch (error) {
                logger.error("[Staff Skill] Ban failed:", error);
                showToast("O ban falhou. Confira as permissões e a hierarquia de cargos.");
            }
        },
    });
}

async function deleteMessage(message: AnyObject): Promise<void> {
    const channelId = asId(message?.channel_id ?? message?.channelId);
    const messageId = asId(message?.id);
    if (!channelId || !messageId) {
        showToast("Não consegui identificar essa mensagem.");
        return;
    }

    const actions = findByProps("deleteMessage", "sendMessage") as AnyObject;
    if (typeof actions?.deleteMessage !== "function") {
        showToast("A API de exclusão não foi encontrada neste cliente.");
        return;
    }

    const author = displayName(message?.author ?? {});
    showConfirmationAlert({
        title: "Apagar mensagem?",
        content: `Esta ação vai apagar a mensagem de ${author}. Ela não pode ser recuperada pelo Staff Skill.`,
        confirmText: "Apagar mensagem",
        confirmColor: "red" as any,
        cancelText: "Cancelar",
        onConfirm: async () => {
            try {
                await actions.deleteMessage(channelId, messageId);
                showToast("Mensagem apagada.");
            } catch (error) {
                logger.error("[Staff Skill] Delete failed:", error);
                showToast("A exclusão falhou. Confira se você tem permissão no servidor.");
            }
        },
    });
}

function row(label: string, onPress: () => void): any {
    const module = findByProps("ActionSheetRow") as AnyObject;
    const Row = module?.ActionSheetRow ?? Forms.FormRow;
    return React.createElement(Row, { label, onPress });
}

function insertRows(tree: any, message: AnyObject | undefined, user: AnyObject | undefined, guildId: string): void {
    const rows = findInReactTree(
        tree,
        (node: any) => Array.isArray(node) && node.some((child: any) => child?.type?.name === "ActionSheetRow"),
    );
    if (!Array.isArray(rows)) return;

    const append = (label: string, handler: () => void) => {
        if (rows.some((child: any) => String(child?.props?.label ?? "") === label)) return;
        rows.push(row(label, handler));
    };

    const userId = asId(user?.id ?? message?.author?.id);
    const target = user ?? message?.author;

    if (storage.enableBan && guildId && target?.id && asId(target.id) !== currentUserId()) {
        append(`🛡️ Banir ${displayName(target)}…`, () => {
            hideActionSheet();
            banUser(guildId, target);
        });
    }

    if (storage.enableDelete && message?.id && (guildId || asId(message?.author?.id) === currentUserId())) {
        append("🗑️ Apagar esta mensagem…", () => {
            hideActionSheet();
            deleteMessage(message);
        });
    }

    if (storage.enableCopy && userId) {
        append("Copiar ID do usuário", () => {
            hideActionSheet();
            copyText(userId, "ID do usuário");
        });
    }
}

function patchActionSheets(): void {
    const lazyActionSheet = findByProps("openLazy", "hideActionSheet") as AnyObject;
    if (typeof lazyActionSheet?.openLazy !== "function") {
        logger.warn("[Staff Skill] Action sheet module was not found; contextual actions are unavailable.");
        return;
    }

    unpatchOpenLazy = before("openLazy", lazyActionSheet, ([component, key, ...args]: any[]) => {
        if (!active || !storage.enabled || typeof key !== "string") return;
        const messageSheet = key === "MessageLongPressActionSheet";
        const userSheet = /(?:User|Profile).*ActionSheet|ActionSheet.*(?:User|Profile)/i.test(key);
        if (!messageSheet && !userSheet) return;

        const message = messageSheet ? findMessage(args) : undefined;
        const user = getUserForSheet(args, message);
        const guildId = getGuildId(args, message);
        if (!messageSheet && !user?.id) return;

        Promise.resolve(component).then((instance: AnyObject) => {
            if (!active || !instance) return;
            let unpatch: (() => void) | undefined;
            unpatch = after("default", instance, (_componentArgs: any, rendered: any) => {
                try {
                    React.useEffect(() => () => unpatch?.(), []);
                    insertRows(rendered, message, user, guildId);
                } catch (error) {
                    logger.error("[Staff Skill] Could not add contextual actions:", error);
                }
                return rendered;
            });
            unpatches.push(unpatch);
        }).catch((error: unknown) => logger.error("[Staff Skill] Could not load action sheet:", error));
    });
}

function avatarUrl(user: AnyObject, guildId?: string): string {
    try {
        const result = user?.getAvatarURL?.(false, 4096, true);
        if (typeof result === "string" && /^https:\/\//i.test(result)) {
            const [base, query = ""] = result.split("?");
            const params = query.split("&").filter((part: string) => part && !part.startsWith("size="));
            params.push("size=4096");
            const animated = /\/a_[0-9a-f]+\./i.test(base);
            const normalized = animated ? base : base.replace(/\.webp$/i, ".png");
            return `${normalized}?${params.join("&")}`;
        }
        const hash = user?.avatar;
        const userId = asId(user?.id);
        if (hash && userId) {
            const ext = String(hash).startsWith("a_") ? "gif" : "png";
            return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=4096`;
        }
    } catch (error) {
        logger.error("[Staff Skill] Could not resolve avatar URL:", error);
    }
    return "";
}

function openAvatar(url: string, event?: AnyObject, guildId?: string): void {
    const viewer = findByProps("openMediaModal") as AnyObject;
    if (typeof viewer?.openMediaModal !== "function") {
        showToast("O visualizador de imagens não está disponível nesta versão.");
        return;
    }

    const nativeEvent = event?.nativeEvent ?? event;
    const channelId = asId((findByStoreName("SelectedChannelStore") as AnyObject)?.getChannelId?.());
    const selectedGuildId = asId((findByStoreName("SelectedGuildStore") as AnyObject)?.getGuildId?.());
    const resolvedGuildId = asId(guildId) || selectedGuildId;
    const originLayout = {
        width: 0,
        height: 0,
        x: Number(nativeEvent?.pageX) || 0,
        y: Number(nativeEvent?.pageY) || 0,
        resizeMode: "fill",
    };

    const Image = ReactNative.Image;
    const open = (width: number, height: number) => {
        try {
            findByProps("hideActionSheet")?.hideActionSheet?.();
            viewer.openMediaModal({
                initialSources: [{
                    uri: url,
                    sourceURI: url,
                    width,
                    height,
                    mediaIndex: 0,
                    guildId: resolvedGuildId,
                    channelId,
                }],
                initialIndex: 0,
                originLayout,
                shareable: true,
                disableDownload: false,
            });
        } catch (error) {
            logger.error("[Staff Skill] Could not open avatar viewer:", error);
            showToast("Não foi possível abrir a foto neste cliente.");
        }
    };

    try {
        Image.getSize(url, open, () => open(1024, 1024));
    } catch {
        open(1024, 1024);
    }
}

function patchHeaderAvatar(): void {
    const headerAvatar = findByName("HeaderAvatar", false) as AnyObject;
    if (!headerAvatar) {
        logger.warn("[Staff Skill] HeaderAvatar component was not found; avatar shortcut is unavailable.");
        return;
    }

    const unpatch = after("default", headerAvatar, ([props]: any[], rendered: any) => {
        if (!active || !storage.enabled || !storage.openAvatar || !rendered || !props?.user) return rendered;
        const url = avatarUrl(props.user, props.guildId);
        if (!url) return rendered;
        const onPress = (event: AnyObject) => openAvatar(url, event, props.guildId);
        const onLongPress = (event: AnyObject) => openAvatar(url, event, props.guildId);

        try {
            if (rendered?.props && typeof rendered.props.onPress === "function") {
                return React.cloneElement(rendered, { onPress, onLongPress });
            }
            return React.createElement(ReactNative.Pressable, { onPress, onLongPress, style: props.style }, rendered);
        } catch (error) {
            logger.error("[Staff Skill] Could not attach avatar viewer:", error);
            return rendered;
        }
    });
    unpatches.push(unpatch);
}

export default {
    onLoad: () => {
        initStorage();
        active = true;
        patchActionSheets();
        patchHeaderAvatar();
        logger.log("[Staff Skill] Loaded. Destructive actions require confirmation.");
    },
    onUnload: () => {
        active = false;
        if (unpatchOpenLazy) unpatchOpenLazy();
        unpatchOpenLazy = null;
        while (unpatches.length) {
            try {
                unpatches.pop()?.();
            } catch (error) {
                logger.error("[Staff Skill] Failed to remove a UI patch:", error);
            }
        }
        logger.log("[Staff Skill] Unloaded.");
    },
    settings: Settings,
};
