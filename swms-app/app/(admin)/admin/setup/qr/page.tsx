import Link from "next/link";
import QRCode from "qrcode";
import { getStaffContext } from "@/features/staff/server";
import { DemoQrPanel, PrintButton } from "@/features/setup";

export const metadata = { title: "Print QR codes — SWMS" };

export default async function QrSheetPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  const initialDemo = demo === "worker" || demo === "collector" || demo === "driver" ? demo : null;
  const { db } = await getStaffContext(["admin"]);
  const [places, vehicles] = await Promise.all([db.rpc("get_qr_sheet"), db.rpc("get_vehicle_qr_sheet")]);
  if (places.error || vehicles.error) throw new Error("Could not load QR codes");
  const image = (code: string) => QRCode.toDataURL(code, { errorCorrectionLevel: "M", width: 180, margin: 1 });
  const items = await Promise.all(places.data.map(async (place) => ({ ...place, image: await image(place.qr_code) })));
  const vehicleItems = await Promise.all(vehicles.data.map(async (v) => ({ ...v, image: await image(v.qr_code) })));
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href="/admin/setup" className="font-semibold text-leaf-800 underline">Back to setup</Link>
      <PrintButton />
    </div>
    <h1 className="mt-5 text-3xl font-extrabold text-leaf-950 print:mt-0">Location QR sheet</h1>
    <p className="mt-2 text-sm text-leaf-950/70 print:hidden">Attach each label only to the named place. A new code invalidates the previous printout.</p>
    <DemoQrPanel places={places.data} vehicles={vehicles.data} initialDemo={initialDemo} />
    <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
      {items.map((place) => <li key={place.id} className="break-inside-avoid rounded-2xl border border-leaf-300 bg-white p-4 text-center">
        {/* Data URL is generated locally from a random database token, not an external image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.image} alt={`QR code for ${place.name}`} width={180} height={180} className="mx-auto" />
        <p className="mt-2 font-bold text-leaf-950">{place.name}</p>
        <p className="text-sm capitalize text-leaf-950/70">{place.kind.replaceAll("_", " ")}</p>
        <p className="mt-1 break-all font-mono text-xs text-leaf-950">{place.qr_code}</p>
      </li>)}
    </ul>
    {items.length === 0 && <p className="mt-6 text-leaf-950/70">No active locations to print.</p>}

    <h2 id="vehicles" className="mt-10 text-2xl font-extrabold text-leaf-950 print:break-before-page">Vehicle QR codes</h2>
    <p className="mt-2 text-sm text-leaf-950/70 print:hidden">Stick each label inside the named vehicle. The driver scans it to start a trip.</p>
    <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
      {vehicleItems.map((v) => <li key={v.id} className="break-inside-avoid rounded-2xl border border-leaf-300 bg-white p-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated locally from a random database token */}
        <img src={v.image} alt={`QR code for vehicle ${v.number}`} width={180} height={180} className="mx-auto" />
        <p className="mt-2 font-bold text-leaf-950">{v.number}</p>
        <p className="text-sm capitalize text-leaf-950/70">{v.kind.replace("-", " ")}</p>
        <p className="mt-1 break-all font-mono text-xs text-leaf-950">{v.qr_code}</p>
      </li>)}
    </ul>
    {vehicleItems.length === 0 && <p className="mt-4 text-leaf-950/70">No active vehicles to print.</p>}
  </main>;
}
