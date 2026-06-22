import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CameraOff, Keyboard, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import PublicLayout from "../components/PublicLayout.jsx";

const READER_ID = "qr-reader";

/** Extract a transcript id from a scanned QR payload (URL or bare id). */
function parseTranscriptId(text) {
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/verify\/([^/]+)/);
    if (match) return match[1];
  } catch {
    /* not a URL */
  }
  const match = text.match(/verify\/([^/?#]+)/);
  if (match) return match[1];
  return text.trim();
}

export default function ScanPage() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState("");

  const stop = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        /* already stopped */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const start = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          const id = parseTranscriptId(decodedText);
          await stop();
          navigate(`/verify/${id}`);
        },
        () => {} // per-frame decode errors are noise — ignore
      );
    } catch (e) {
      setScanning(false);
      toast.error("Unable to access camera. Try manual entry instead.");
      console.error(e);
    }
  };

  // Clean up on unmount.
  useEffect(() => () => void stop(), []);

  const onManual = (e) => {
    e.preventDefault();
    if (manualId.trim()) navigate(`/verify/${manualId.trim()}`);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-brand-navy">Scan to verify</h1>
          <p className="mt-2 text-brand-muted">
            Point your camera at the QR code on a transcript.
          </p>
        </div>

        <div className="card mt-8 overflow-hidden p-5">
          <div
            id={READER_ID}
            className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-brand-navy/5"
          >
            {!scanning && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-brand-muted">
                <Camera className="h-10 w-10" />
                <p className="text-sm">Camera preview will appear here</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            {scanning ? (
              <button onClick={stop} className="btn-danger">
                <CameraOff className="h-4 w-4" /> Stop camera
              </button>
            ) : (
              <button onClick={start} className="btn-primary">
                <Camera className="h-4 w-4" /> Start camera
              </button>
            )}
          </div>
        </div>

        {/* Manual fallback */}
        <div className="card mt-6 p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Keyboard className="h-4 w-4" /> Or enter the transcript ID manually
          </p>
          <form onSubmit={onManual} className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input"
              placeholder="Transcript ID…"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <button type="submit" className="btn-outline shrink-0" disabled={!manualId.trim()}>
              Verify <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
