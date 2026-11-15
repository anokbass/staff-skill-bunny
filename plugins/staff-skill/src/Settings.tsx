import { ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "./storage";

const { FormSection, FormRow, FormSwitch, FormDivider } = Forms;
const { ScrollView } = ReactNative;

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
    return <FormRow label={label} trailing={<FormSwitch value={value} onValueChange={onChange} />} />;
}

export default function SettingsPanel() {
    useProxy(storage);

    return (
        <ScrollView>
            <FormSection title="Staff Skill · Ações rápidas">
                <SwitchRow label="Ativar Staff Skill" value={!!storage.enabled} onChange={(v) => { storage.enabled = v; }} />
                <FormDivider />
                <SwitchRow label="Mostrar ação de banir membro" value={!!storage.enableBan} onChange={(v) => { storage.enableBan = v; }} />
                <FormDivider />
                <SwitchRow label="Mostrar ação de apagar mensagem" value={!!storage.enableDelete} onChange={(v) => { storage.enableDelete = v; }} />
                <FormDivider />
                <SwitchRow label="Mostrar ação de copiar ID" value={!!storage.enableCopy} onChange={(v) => { storage.enableCopy = v; }} />
                <FormDivider />
                <SwitchRow label="Abrir avatar em tamanho grande" value={!!storage.openAvatar} onChange={(v) => { storage.openAvatar = v; }} />
            </FormSection>

            <FormSection title="Como usar">
                <FormRow label="Pressione uma mensagem para abrir as ações contextuais. Se o cliente expuser o menu de usuário, o ban e a cópia do ID também aparecem por lá." />
                <FormRow label="Banir e apagar sempre pedem confirmação. O Discord verifica suas permissões e a hierarquia do servidor." />
                <FormRow label="Pressione a foto de perfil para ampliar. O visualizador nativo pode oferecer compartilhar e baixar." />
            </FormSection>

            <FormSection title="Limites e privacidade">
                <FormRow label="Sem time ban e sem ações automáticas. O plugin não guarda histórico, não lê tokens e não envia dados para serviços externos." />
                <FormRow label="As ações dependem de módulos internos do cliente. Bunny/Vendetta e forks podem variar; confirme a compatibilidade no seu app." />
            </FormSection>
        </ScrollView>
    );
}
