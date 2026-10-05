"use client";

import { Check, Copy, Link as LinkIcon, ShieldAlert, Sparkles, Trash2, UserCheck } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { Student } from "@/lib/classes/types";
import {
  callCreateStudentInvite,
  callGetStudentInvite,
  callRemovePortalAccess,
  callRevokeStudentInvite,
} from "@/lib/functions";
import { strings } from "@/lib/strings";

interface StudentInviteCardProps {
  student: Student;
  onStudentUpdated?: (updated: Student) => void;
}

export function StudentInviteCard({ student, onStudentUpdated }: StudentInviteCardProps) {
  const toast = useToast();
  const [invite, setInvite] = useState<{ code: string; expiresAt?: number } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!student.portalUid);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // If not connected, check if there is an active invite
  useEffect(() => {
    if (student.portalUid) return;

    let active = true;

    callGetStudentInvite(student.id)

      .then(async (res) => {
        if (!active) return;
        if (res.active && res.code) {
          setInvite({ code: res.code, expiresAt: res.expiresAt });
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const link = `${origin}/join?code=${res.code}`;
          const url = await QRCode.toDataURL(link, { width: 180, margin: 1 });
          if (active) setQrUrl(url);
        }
      })
      .catch((err) => {
        console.warn("Could not load student invite:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [student.id, student.portalUid]);

  const handleGenerateInvite = async () => {
    try {
      setBusy(true);
      const res = await callCreateStudentInvite(student.id);
      setInvite({ code: res.code, expiresAt: res.expiresAt });

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/join?code=${res.code}`;
      const url = await QRCode.toDataURL(link, { width: 180, margin: 1 });
      setQrUrl(url);
      toast(strings.portal.inviteLinkCopied);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error creating invite");
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!window.confirm(strings.portal.confirmRevokeInvite)) return;
    try {
      setBusy(true);
      await callRevokeStudentInvite(student.id);
      setInvite(null);
      setQrUrl(null);
      toast("Invite revoked.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error revoking invite");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveAccess = async () => {
    if (!window.confirm(strings.portal.confirmRemovePortalAccess)) return;
    try {
      setBusy(true);
      await callRemovePortalAccess(student.id);
      const updated = { ...student, portalUid: undefined };
      onStudentUpdated?.(updated);
      toast("Portal access removed.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error removing access");
    } finally {
      setBusy(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinLink = invite?.code ? `${origin}/join?code=${invite.code}` : "";

  const handleCopyLink = async () => {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      toast(strings.portal.inviteLinkCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (student.portalUid) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-primary p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <UserCheck className="size-4" />
            <span>{strings.portal.portalConnected}</span>
          </div>
          <Button
            variant="ghost"
            onClick={handleRemoveAccess}
            disabled={busy}
            className="h-8 px-3 text-xs text-error hover:bg-error/10 hover:text-error"
          >
            <ShieldAlert className="size-3.5 mr-1" />
            <span>{strings.portal.removePortalAccess}</span>
          </Button>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          {strings.portal.portalConnectedDesc}
        </p>
      </div>
    );
  }

  if (loading) {
    return <Skeleton className="h-28 w-full rounded-2xl" />;
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-primary p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <Sparkles className="size-3.5 text-accent" />
          {strings.portal.inviteSectionTitle}
        </span>
        {invite && (
          <Button
            variant="ghost"
            onClick={handleRevokeInvite}
            disabled={busy}
            className="h-8 px-2 text-xs text-muted hover:text-error"
            title={strings.portal.revokeInvite}
          >
            <Trash2 className="size-3.5 mr-1" />
            <span>{strings.portal.revokeInvite}</span>
          </Button>
        )}
      </div>

      {!invite ? (
        <div className="space-y-3">
          <p className="text-xs text-muted leading-relaxed">
            Invite {student.name} to view their consolidated strengths, errors to review, and homework on the student portal.
          </p>
          <Button
            variant="primary"
            onClick={handleGenerateInvite}
            disabled={busy}
            className="min-h-10 text-xs font-medium"
          >
            {busy ? strings.portal.generatingInvite : strings.portal.inviteToPortal}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* QR Code */}
            {qrUrl && (
              <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-border-subtle shadow-xs shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`QR code for ${student.name}`}
                  className="size-32 object-contain"
                />
                <span className="text-[10px] text-muted font-medium">Scan to join</span>
              </div>
            )}

            {/* Invite Details (CA01) */}
            <div className="flex-1 space-y-2.5 text-center sm:text-left min-w-0 w-full">
              <div>
                <span className="text-xs text-muted block">{strings.portal.inviteCodeLabel}</span>
                <span className="font-mono text-2xl font-bold tracking-widest text-accent">
                  {invite.code}
                </span>
              </div>

              {/* Link copy */}
              <div className="flex items-center gap-2 bg-secondary p-1.5 rounded-xl border border-border-subtle">
                <input
                  type="text"
                  readOnly
                  value={joinLink}
                  aria-label="Invite link"
                  className="bg-transparent text-xs text-fg px-2 flex-1 outline-none truncate"
                />
                <Button
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="h-7 px-2 text-xs shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 text-success mr-1" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 mr-1" />
                      <span>{strings.portal.copyInviteLink}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Validity label (CA01: "Expires in 14 days") */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted">
                <LinkIcon className="size-3 text-accent" />
                <span className="font-medium text-accent">{strings.portal.expiresInDays}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
