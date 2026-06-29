// 体重折れ線(目標線・運動日マーカー)。モック _lineChart を移植。
export function LineChart({
  data,
  w,
  h,
  goalWeight,
  marks,
}: {
  data: number[];
  w: number;
  h: number;
  goalWeight: number;
  marks?: number[];
}) {
  if (data.length === 0) {
    return (
      <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bcb6ab', fontSize: 12, fontWeight: 700 }}>
        データがまだありません
      </div>
    );
  }
  const padL = 10,
    padR = 14,
    padT = 18,
    padB = 16;
  const lo = Math.min(...data, goalWeight) - 0.4;
  const hi = Math.max(...data, goalWeight) + 0.4;
  const span = hi - lo || 1;
  const denom = Math.max(1, data.length - 1);
  const xs = (i: number) => padL + (i * (w - padL - padR)) / denom;
  const ys = (v: number) => padT + ((hi - v) / span) * (h - padT - padB);
  const linePts = data.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
  const areaPts =
    `M${xs(0)},${h - padB} L` + data.map((v, i) => `${xs(i)},${ys(v)}`).join(' L') + ` L${xs(data.length - 1)},${h - padB} Z`;
  const gy = ys(goalWeight);
  const li = data.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block', overflow: 'visible' }}>
      <path d={areaPts} fill="rgba(31,157,87,0.10)" />
      <line x1={padL} x2={w - padR} y1={gy} y2={gy} stroke="#e0a23a" strokeWidth={1.5} strokeDasharray="4 4" />
      <text x={w - padR} y={gy - 4} fontSize={9.5} fontWeight={700} fill="#c0871f" textAnchor="end">
        目標 {goalWeight.toFixed(1)}
      </text>
      {marks?.filter((mi) => mi <= li).map((mi, k) => <circle key={k} cx={xs(mi)} cy={h - padB + 6} r={2.6} fill="#d6452f" />)}
      <polyline points={linePts} fill="none" stroke="#1f9d57" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs(li)} cy={ys(data[li])} r={4.5} fill="#1f9d57" stroke="#fff" strokeWidth={2} />
      <text x={xs(li)} y={ys(data[li]) - 9} fontSize={12} fontWeight={800} fill="#1f9d57" textAnchor="end">
        {data[li].toFixed(1)}
      </text>
    </svg>
  );
}
