"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Shared Add/Edit dialog chrome: colored title bar with a close button and a
 * bordered footer bar. Body content stays fully custom via `children` since
 * padding/scroll behavior genuinely differs per form.
 */
export function FormDialog({
  open,
  onClose,
  title,
  children,
  footer,
  contentClassName,
  headerClassName = "bg-primary-600",
  footerClassName,
  showCloseButton = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Overrides dialog width, e.g. "sm:w-[min(92vw,860px)]". */
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  showCloseButton?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "sm:max-w-none p-0 overflow-hidden gap-0",
          contentClassName,
        )}
      >
        <div
          className={cn(
            "text-white flex items-center justify-between px-5 py-3.5",
            headerClassName,
          )}
        >
          <DialogTitle>{title}</DialogTitle>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-white hover:text-gray-200 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {children}

        {footer && (
          <div
            className={cn(
              "border-t px-5 py-3 flex items-center justify-end gap-2",
              footerClassName,
            )}
          >
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
