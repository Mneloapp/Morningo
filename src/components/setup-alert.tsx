type SetupAlertProps = {
  title?: string;
  message: string;
};

export function SetupAlert({ title = "Setup needs attention", message }: SetupAlertProps) {
  return (
    <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 text-accent">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-600">{message}</p>
    </div>
  );
}
