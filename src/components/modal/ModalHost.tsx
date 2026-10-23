"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, type ComponentType } from "react";
import { AddToggle } from "@/components/modal/AddToggle";
import { AssetForm } from "@/components/modal/AssetForm";
import { LoanForm } from "@/components/modal/LoanForm";
import { ModalFrame } from "@/components/modal/ModalFrame";
import { PassFooter } from "@/components/modal/PassFooter";
import { PassSummary } from "@/components/modal/PassSummary";
import { UpdateBalanceForm } from "@/components/modal/UpdateBalanceForm";
import { UpdateValueForm } from "@/components/modal/UpdateValueForm";
import type { PortfolioData } from "@/lib/read-model/types";
import { defaultAfterSave } from "@/lib/views/holding-entry";
import type { LoanCarry } from "@/lib/views/loan-form";
import { BUILTIN_MODES, closeHref, errorFor, modalKey, MODAL_PARAMS, resolveModal, swapAddHref, withoutParams, type ModalMatch, type ModeRow } from "@/lib/views/modal-modes";
import { parsePass, passStep, stepFocus, stepSaveOptions, type PassCurrent } from "@/lib/views/update-pass";

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
  /** Name and Held in typed on the other side of the add toggle (LE-01). */
  carry?: LoanCarry;
  /** The add forms report their name and Held in so a toggle can carry them. */
  setCarry?: (carry: LoanCarry) => void;
};

export type ModalForm = ComponentType<ModalFormProps>;

const BUILTIN_FORMS: Record<string, ModalForm> = {
  "add-asset": AssetForm,
  edit: AssetForm,
  "edit-positions": AssetForm,
  "update-value": UpdateValueForm,
  "add-liability": LoanForm,
  "edit-liability": LoanForm,
  "update-balance": UpdateBalanceForm,
  "pass-summary": PassSummary,
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
  const carried = useRef<LoanCarry | undefined>(undefined);
  const setCarry = useCallback((carry: LoanCarry) => {
    carried.current = carry;
  }, []);
  const [carryNext, setCarryNext] = useState<{ to: string; carry: LoanCarry } | null>(null);
  const [stored, setStored] = useState<{ key: string; message: string } | null>(null);

  const match = resolveModal(data, new URLSearchParams(params.toString()), modes);
  const Form = match ? ({ ...BUILTIN_FORMS, ...forms }[match.mode] as ModalForm | undefined) : undefined;
  if (!match || !Form) return null;

  const close = () => {
    setCarryNext(null);
    router.replace(closeHref(pathname, params.toString()));
  };

  // The update pass (design.md D2, D9): a step is the item's own form plus pass chrome.
  const pass = parsePass(new URLSearchParams(params.toString()));
  const current: PassCurrent | null = match.holding
    ? { kind: "holding", id: match.holding.id }
    : match.liability
      ? { kind: "liability", id: match.liability.id }
      : null;
  const stepMode = ["update-value", "edit-positions", "update-balance"].includes(match.mode);
  const step =
    pass && current && stepMode
      ? passStep(data, { current, ...pass }, data.today, withoutParams(pathname, params.toString(), MODAL_PARAMS))
      : null;
  // Until the summary mode is registered, the last step has nowhere to go but out.
  const summaryOpen = modes.some((m) => m.id === "pass-summary");
  const goTo = (href: string) => {
    const leaves = href.includes("modal=pass-summary") && !summaryOpen;
    router.replace(leaves ? closeHref(pathname, params.toString()) : href);
  };
  const key = modalKey(match);
  const error = errorFor(stored, key);
  const setError = (message: string | null) => setStored(message === null ? null : { key, message });

  return (
    <ModalFrame
      key={key}
      title={match.title}
      saveLabel={step ? "Save & next" : match.saveLabel}
      footerSlot={step ? <PassFooter counter={step.counter} onSkip={() => goTo(step.skipHref)} /> : undefined}
      hideCancel={step !== null || match.mode === "pass-summary"}
      focusSave={stepFocus(match.mode, step !== null) === "save"}
      error={error}
      saving={busy}
      formId="modal-form"
      onClose={close}
      headerSlot={
        match.mode === "add-asset" || match.mode === "add-liability" ? (
          <AddToggle
            mode={match.mode}
            onChoose={(to) => {
              if (to === match.mode) return;
              setCarryNext(carried.current ? { to, carry: carried.current } : null);
              router.replace(swapAddHref(pathname, params.toString(), to));
            }}
          />
        ) : undefined
      }
    >
      <Form
        match={match}
        data={data}
        formId="modal-form"
        setBusy={setBusy}
        setError={setError}
        confirmPrices={confirmPrices || stepSaveOptions(match.mode, step !== null).confirmPrices}
        carry={carryNext?.to === match.mode ? carryNext.carry : undefined}
        setCarry={setCarry}
        onSaved={(result) => {
          setCarryNext(null);
          if (step) {
            goTo(step.nextHref);
            router.refresh();
            return;
          }
          router.refresh();
          const next = afterSave ? afterSave(result) : defaultAfterSave(match.mode, result);
          if (next) router.push(next);
          else close();
        }}
      />
    </ModalFrame>
  );
}
