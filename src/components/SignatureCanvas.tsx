import { useRef, useState, useEffect } from 'react';

type SignatureCanvasProps = {
  onSign: (dataUrl: string) => void;
  onClear: () => void;
  readOnly?: boolean;
  existingDataUrl?: string;
};

export function SignatureCanvas({ onSign, onClear, readOnly, existingDataUrl }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Si existe firma previa en modo lectura, mostrar como imagen
  if (readOnly && existingDataUrl) {
    return (
      <div className="w-full h-[160px] border border-gray-300 rounded-lg overflow-hidden bg-white">
        <img
          src={existingDataUrl}
          alt="Firma"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const getCtx = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSign(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onClear();
  };

  // Ajustar resolución del canvas al tamaño del contenedor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full h-[160px] border border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!readOnly && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Limpiar firma
        </button>
      )}
    </div>
  );
}
