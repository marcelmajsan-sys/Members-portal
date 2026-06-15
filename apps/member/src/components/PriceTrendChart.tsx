'use client';

interface DataPoint {
  date: string;
  price: number;
}

interface PriceTrendChartProps {
  competitorData: DataPoint[];
  memberData?: DataPoint[];
  competitorName: string;
  productName: string;
}

export default function PriceTrendChart({
  competitorData,
  memberData,
  competitorName,
  productName,
}: PriceTrendChartProps) {
  if (competitorData.length < 2) {
    return (
      <div className="text-xs text-text-secondary py-4 text-center">
        Nedovoljno podataka za prikaz trenda (potrebna barem 2 točke)
      </div>
    );
  }

  const allPrices = [
    ...competitorData.map((d) => d.price),
    ...(memberData ?? []).map((d) => d.price),
  ];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  function toX(index: number, total: number): number {
    return padding.left + (total <= 1 ? chartW / 2 : (index / (total - 1)) * chartW);
  }

  function toY(price: number): number {
    return padding.top + chartH - ((price - minPrice) / priceRange) * chartH;
  }

  function buildPath(data: DataPoint[]): string {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i, data.length).toFixed(1)} ${toY(d.price).toFixed(1)}`)
      .join(' ');
  }

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const price = minPrice + (priceRange * i) / 4;
    return { price, y: toY(price) };
  });

  // X-axis labels (first and last date)
  const formatDate = (d: string) => new Date(d).toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-primary inline-block" /> {competitorName}
        </span>
        {memberData && memberData.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Tvoja cijena
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text
              x={padding.left - 8}
              y={t.y + 3}
              textAnchor="end"
              className="text-text-secondary"
              style={{ fontSize: 9 }}
              fill="#9ca3af"
            >
              {t.price.toFixed(0)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        <text
          x={toX(0, competitorData.length)}
          y={height - 5}
          textAnchor="start"
          style={{ fontSize: 9 }}
          fill="#9ca3af"
        >
          {formatDate(competitorData[0].date)}
        </text>
        <text
          x={toX(competitorData.length - 1, competitorData.length)}
          y={height - 5}
          textAnchor="end"
          style={{ fontSize: 9 }}
          fill="#9ca3af"
        >
          {formatDate(competitorData[competitorData.length - 1].date)}
        </text>

        {/* Competitor line */}
        <path d={buildPath(competitorData)} fill="none" stroke="#1e3a5f" strokeWidth={2} />
        {competitorData.map((d, i) => (
          <circle
            key={i}
            cx={toX(i, competitorData.length)}
            cy={toY(d.price)}
            r={3}
            fill="#1e3a5f"
          />
        ))}

        {/* Member line */}
        {memberData && memberData.length > 1 && (
          <>
            <path d={buildPath(memberData)} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" />
            {memberData.map((d, i) => (
              <circle
                key={i}
                cx={toX(i, memberData.length)}
                cy={toY(d.price)}
                r={3}
                fill="#10b981"
              />
            ))}
          </>
        )}
      </svg>
      <p className="text-xs text-text-secondary text-center">{productName}</p>
    </div>
  );
}
