import { storage } from "@vendetta/plugin";

const defaults = {
    enabled: true,
    enableBan: true,
    enableDelete: true,
    enableCopy: true,
    openAvatar: true,
};

export function initStorage(): void {
    for (const [key, value] of Object.entries(defaults)) {
        if ((storage as any)[key] === undefined) (storage as any)[key] = value;
    }
}

export { storage };
