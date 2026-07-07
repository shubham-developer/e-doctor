"use client";

import { useState } from "react";
import { Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyablePassword({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-lg font-bold tracking-widest text-gray-900">
        {password}
      </span>
      <Button
        variant="outline"
        size="xs"
        onClick={copy}
        className="text-primary-600 hover:text-primary-700 border-primary-200"
      >
        {copied ? (
          <CheckCheck className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
