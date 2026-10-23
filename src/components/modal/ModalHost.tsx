"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import { AssetForm } from "@/components/modal/AssetForm";
import { ModalFrame } from "@/components/modal/ModalFrame";
import { UpdateValueForm } from "@/components/modal/UpdateValueForm";
import type { PortfolioData } from "@/lib/read-model/types";
import { defaultAfterSave } from "@/lib/views/holding-entry";
import { BUILTIN_MODES, closeHref, errorFor, modalKey, resolveModal, type ModalMatch, type ModeRow } from "@/lib/views/modal-modes";

/** What the host gives every form (design.md D19). */
export type ModalFormProps = {
  match: ModalMatch;
  data: PortfolioData;
  formId: string;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  /** Call after a successful save: refreshes, then closes or goes where the caller's `afterSave` says. */
  onSaved: (result: Record<string, unknown>) => void;
  /** Off by default; a caller such as the update pass sets it. */
  confirmPrices?: boolean;
};

export type ModalForm = ComponentType<ModalFormProps>;

const BUILTIN_FORMS: Record<string, ModalForm> = {
  "add-asset": AssetForm,
  edit: AssetForm,
  "edit-positions": AssetForm,
  "update-value": UpdateValueForm,
};

// Mounted once in the (app) layout. Which modal is open is the URL's business:
// closing removes only the modal params, so Back after opening returns to the clean page.
export function ModalHost({
  data,
  modes = BUILTIN_MODES,
  forms = {},
  afterSave,
  confirmPrices,
}: {
  data: PortfolioData;
  /** The mode table; later changes pass `[...BUILTIN_MODES, theirRow]`. */
  modes?: readonly ModeRow[];
  /** Forms by mode id, beside the built-in ones. */
  forms?: Record<string, ModalForm>;
  /** A URL to go to after a save instead of closing, or null to close. Without it, an add opens the new Holding. */
  afterSave?: (result: Record<string, unknown>) => string | null;
  confirmPrices?: boolean;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stored, setStored] = useState<{ key: string; message: string } | null>(null);

  const match = resolveModal(data, new URLSearchParams(params.toString()), modes);
  const Form = match ? ({ ...BUILTIN_FORMS, ...forms }[match.mode] as ModalForm | undefined) : undefined;
  if (!match || !Form) return null;

  const close = () => router.replace(closeHref(pathname, params.toString()));
  const key = modalKey(match);
  const error = errorFor(stored, key);
  const setError = (message: string | null) => setStored(message === null ? null : { key, message });

  return (
    <ModalFrame
      key={key}
      title={match.title}
      saveLabel={match.saveLabel}
      error={error}
      saving={busy}
      formId="modal-form"
      onClose={close}
    >
      <Form
        match={match}
        data={data}
        formId="modal-form"
        setBusy={setBusy}
        setError={setError}
        confirmPrices={confirmPrices}
        onSaved={(result) => {
          router.refresh();
          const next = afterSave ? afterSave(result) : defaultAfterSave(match.mode, result);
          if (next) router.push(next);
          else close();
        }}
      />
    </ModalFrame>
  );
}
