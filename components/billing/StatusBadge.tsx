export function StatusBadge({ paid, balance }: { paid: number; balance: number }) {
  if (balance <= 0)
    return (
      <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-success-100 text-success-700">
        PAID
      </span>
    );
  if (paid > 0)
    return (
      <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-warning-100 text-warning-700">
        PARTIAL
      </span>
    );
  return (
    <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-danger-100 text-danger-700">
      DUE
    </span>
  );
}
