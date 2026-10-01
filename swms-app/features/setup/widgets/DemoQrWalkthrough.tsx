import { demoFlows, type DemoFlow } from "../content/qrDemo";

export function DemoQrWalkthrough({ flow, name }: { flow: DemoFlow; name?: string }) {
  const demo = demoFlows[flow];
  return <div role="status" className="rounded-2xl border border-leaf-300 bg-white p-5">
    <p className="eyebrow text-leaf-600">Demo walkthrough{name ? ` · ${name}` : ""}</p>
    <h2 className="mt-1 text-xl font-bold text-leaf-950">{demo.title}</h2>
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-leaf-950">
      {demo.steps.map((step) => <li key={step}>{step}</li>)}
    </ol>
    <p className="mt-4 rounded-xl bg-leaf-50 px-4 py-3 text-sm font-semibold text-leaf-800">{demo.result}</p>
  </div>;
}
