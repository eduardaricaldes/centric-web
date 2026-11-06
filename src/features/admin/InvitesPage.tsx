import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cancelInvite, createInvite, listInvites } from "../../api/invites";
import { listMinistries } from "../../api/ministries";
import type { InviteCreateResponse, InviteResponse, MinistryRole, UserRole } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { ConfirmDialog, Dialog } from "../../components/Dialog";
import { CopyableLink } from "../../components/CopyableLink";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Select } from "../../components/Select";
import { SkeletonLines } from "../../components/Skeleton";
import { IconLink, IconPlus, IconTrash } from "../../components/icons";
import { formatTimestamp } from "../../lib/dates";
import { getErrorMessage, isForbidden } from "../../lib/errors";
import { isAdmin } from "../../lib/permissions";
import { useAuth } from "../auth/AuthContext";
import { MINISTRY_ROLE_LABEL, ROLE_LABEL } from "./labels";

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function inviteRegisterLink(invite: InviteCreateResponse): string {
  const url = new URL("/register", window.location.origin);
  url.searchParams.set("token", invite.token);
  if (invite.email) url.searchParams.set("email", invite.email);
  return url.toString();
}

function CreateInviteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (invite: InviteCreateResponse) => void }) {
  const { user } = useAuth();
  const admin = isAdmin(user);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("MEMBER");
  const [ministryId, setMinistryId] = useState<number | "">("");
  const [ministryRole, setMinistryRole] = useState<MinistryRole>("MEMBER");
  const [instrument, setInstrument] = useState("");

  const ministriesQuery = useQuery({ queryKey: ["ministries"], queryFn: () => listMinistries() });

  const mutation = useMutation({
    mutationFn: () =>
      createInvite({
        email: email.trim() || undefined,
        role: admin ? role : "MEMBER",
        ministry_id: ministryId === "" ? null : ministryId,
        ministry_role: admin ? ministryRole : "MEMBER",
        instrument: instrument.trim() || undefined,
      }),
    onSuccess: (invite) => onCreated(invite),
  });

  // Líder só convida para o ministério que lidera; a API confere de verdade, mas o
  // front nem deixa enviar sem escolher um (regra 3.2 "quem convida quem").
  // Papel de líder exige ministério: é liderando um que a pessoa vira líder.
  const canSubmit = ministryId !== "" || (admin && role !== "LEADER");

  return (
    <Dialog title="Novo convite" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <Input
          label="E-mail (opcional)"
          type="email"
          hint="Deixe em branco para um convite que vale para qualquer e-mail."
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {admin ? (
          <Select label="Papel" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            <option value="MEMBER">Membro</option>
            <option value="LEADER">Líder</option>
            <option value="ADMIN">Administrador</option>
          </Select>
        ) : (
          <p className="text-sm text-muted">Papel: Membro (líderes só convidam membros).</p>
        )}

        <Select
          label={admin && role !== "LEADER" ? "Ministério (opcional)" : "Ministério"}
          value={ministryId}
          onChange={(event) => setMinistryId(event.target.value ? Number(event.target.value) : "")}
        >
          {admin && role !== "LEADER" ? (
            <option value="">Nenhum</option>
          ) : (
            <option value="">Selecione...</option>
          )}
          {ministriesQuery.data?.items.map((ministry) => (
            <option key={ministry.id} value={ministry.id}>
              {ministry.name}
            </option>
          ))}
        </Select>

        {admin && role !== "LEADER" && role !== "ADMIN" && (
          <Select
            label="Papel no ministério"
            value={ministryRole}
            onChange={(event) => setMinistryRole(event.target.value as MinistryRole)}
            disabled={ministryId === ""}
          >
            <option value="MEMBER">Membro</option>
            <option value="LEADER">Líder</option>
          </Select>
        )}
        {admin && role === "LEADER" && (
          <p className="text-sm text-muted">A pessoa vai liderar o ministério escolhido.</p>
        )}

        <Input
          label="Instrumento (opcional)"
          value={instrument}
          onChange={(event) => setInstrument(event.target.value)}
          disabled={ministryId === ""}
        />

        {mutation.isError && <p className="text-sm text-red">{getErrorMessage(mutation.error)}</p>}

        <Button type="submit" loading={mutation.isPending} disabled={!canSubmit} className="self-start">
          Criar convite
        </Button>
      </form>
    </Dialog>
  );
}

function InviteLinkDialog({ invite, onClose }: { invite: InviteCreateResponse; onClose: () => void }) {
  return (
    <Dialog title="Convite criado" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-amber-ink">
          Este link aparece só nesta tela. Copie e envie agora — a lista de convites não
          mostra o token de novo.
        </p>
        <CopyableLink url={inviteRegisterLink(invite)} />
        <p className="text-xs text-muted">Expira em {formatTimestamp(invite.expires_at)}.</p>
      </div>
    </Dialog>
  );
}

function InviteRow({ invite, onCancel }: { invite: InviteResponse; onCancel: () => void }) {
  const expired = isExpired(invite.expires_at);
  return (
    <tr className="border-b border-line last:border-0 hover:bg-ivory">
      <td className="px-4 py-3 text-ink">{invite.email ?? "Qualquer e-mail"}</td>
      <td className="px-4 py-3">
        <Badge tone={invite.role === "ADMIN" ? "north" : invite.role === "LEADER" ? "amber" : "neutral"}>
          {ROLE_LABEL[invite.role]}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted">
        {invite.ministry_name ?? "—"}
        {invite.ministry_role && invite.ministry_name
          ? ` (${MINISTRY_ROLE_LABEL[invite.ministry_role]})`
          : ""}
      </td>
      <td className="px-4 py-3 text-muted">{invite.created_by_name}</td>
      <td className="px-4 py-3">
        {expired ? (
          <Badge tone="red">Expirado em {formatTimestamp(invite.expires_at)}</Badge>
        ) : (
          <span className="text-muted">{formatTimestamp(invite.expires_at)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar convite"
          className="inline-flex h-9 w-9 items-center justify-center rounded-field text-muted hover:bg-ivory hover:text-red"
        >
          <IconTrash width={16} height={16} />
        </button>
      </td>
    </tr>
  );
}

export function InvitesPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<InviteCreateResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InviteResponse | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["invites"],
    queryFn: () => listInvites(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      setCancelTarget(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Convites"
        description="Por aqui a igreja entra no sistema — sem comando nenhum."
        actions={
          <Button icon={<IconPlus width={18} height={18} />} onClick={() => setCreating(true)}>
            Novo convite
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonLines count={4} />
      ) : isError ? (
        isForbidden(error) ? <ForbiddenState /> : <ErrorState error={error} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={<IconLink width={28} height={28} />}
          title="Nenhum convite em aberto"
          description="Crie um convite para trazer alguém para o Centric."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Para</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Ministério</th>
                <th className="px-4 py-3 font-medium">Criado por</th>
                <th className="px-4 py-3 font-medium">Expira</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((invite) => (
                <InviteRow key={invite.id} invite={invite} onCancel={() => setCancelTarget(invite)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateInviteDialog
          onClose={() => setCreating(false)}
          onCreated={(invite) => {
            setCreating(false);
            setCreatedInvite(invite);
            queryClient.invalidateQueries({ queryKey: ["invites"] });
          }}
        />
      )}

      {createdInvite && (
        <InviteLinkDialog invite={createdInvite} onClose={() => setCreatedInvite(null)} />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancelar convite"
          description="Quem tiver esse link não vai conseguir mais se cadastrar com ele."
          confirmLabel="Cancelar convite"
          danger
          loading={cancelMutation.isPending}
          error={cancelMutation.error}
          onCancel={() => setCancelTarget(null)}
          onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
        />
      )}
    </div>
  );
}
