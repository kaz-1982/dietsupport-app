// 一意ID生成。`crypto.randomUUID()` はセキュアコンテキスト(HTTPS / localhost)
// でしか使えないため、iPhone から `http://<LAN-IP>` で開く(非セキュア)ケースで
// 例外になり初期化が止まる。getRandomValues ベースの RFC4122 v4 フォールバックを
// 用意し、どの環境でも安全に動くようにする。
export function uuid(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();

  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); // 非セキュアコンテキストでも利用可
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}
